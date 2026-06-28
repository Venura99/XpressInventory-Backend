import mongoose, { FilterQuery } from 'mongoose';
import { Sale, ISale } from '../models/Sale';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Warranty } from '../models/Warranty';
import { InventoryLog } from '../models/InventoryLog';
import { AppError } from '../middleware/error.middleware';
import { buildPagination, PaginationMeta } from '../utils/response';
import { generateInvoiceNumber } from '../utils/invoiceNumber';

export interface CreateSaleItemDto {
  product: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSaleDto {
  customer: string;
  items: CreateSaleItemDto[];
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'city_ledger';
  paymentStatus?: 'paid' | 'partial' | 'pending';
  amountPaid?: number;
  notes?: string;
  saleDate?: string;
}

export interface SaleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SaleService {
  async createSale(data: CreateSaleDto, userId: string): Promise<ISale> {
    const invoiceNumber = await generateInvoiceNumber();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const processedItems = [];
      let subtotal = 0;
      let totalCost = 0;

      for (const item of data.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.isActive) {
          throw new AppError(`Product not found`, 404);
        }
        if (product.stockQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`,
            400
          );
        }

        const unitPrice = item.unitPrice ?? product.sellingPrice;
        const discount = item.discount ?? 0;
        const itemSubtotal = (unitPrice - discount) * item.quantity;
        const itemCost = product.costPrice * item.quantity;

        processedItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          costPrice: product.costPrice,
          unitPrice,
          discount,
          subtotal: itemSubtotal,
          profit: itemSubtotal - itemCost,
          warrantyMonths: product.warrantyMonths,
        });

        subtotal += itemSubtotal;
        totalCost += itemCost;
      }

      const discountPercent = data.discountPercent ?? 0;
      let discountAmount = data.discountAmount ?? 0;
      if (discountPercent > 0 && discountAmount === 0) {
        discountAmount = subtotal * (discountPercent / 100);
      }
      const totalAmount = Math.max(0, subtotal - discountAmount);
      const totalProfit = totalAmount - totalCost;
      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();
      const amountPaid = data.amountPaid ?? totalAmount;

      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            customer: data.customer,
            items: processedItems,
            subtotal,
            discountAmount,
            discountPercent,
            totalAmount,
            totalProfit,
            totalCost,
            paymentMethod: data.paymentMethod ?? 'cash',
            paymentStatus: data.paymentStatus ?? 'paid',
            amountPaid,
            notes: data.notes,
            soldBy: userId,
            saleDate,
          },
        ],
        { session }
      );

      // Reduce stock and write inventory logs
      for (const item of processedItems) {
        const product = await Product.findById(item.product).session(session);
        const qtyBefore = product!.stockQuantity;
        const qtyAfter = qtyBefore - item.quantity;

        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: -item.quantity } },
          { session }
        );

        await InventoryLog.create(
          [
            {
              product: item.product,
              action: 'sale',
              quantityBefore: qtyBefore,
              quantityChange: -item.quantity,
              quantityAfter: qtyAfter,
              reference: invoiceNumber,
              referenceType: 'sale',
              performedBy: userId,
            },
          ],
          { session }
        );
      }

      // Create warranty records for items that carry warranty
      const warrantyDocs = processedItems
        .filter((item) => item.warrantyMonths > 0)
        .map((item) => {
          const expiryDate = new Date(saleDate);
          expiryDate.setMonth(expiryDate.getMonth() + item.warrantyMonths);
          return {
            product: item.product,
            productName: item.productName,
            customer: data.customer,
            sale: sale._id,
            invoiceNumber,
            purchaseDate: saleDate,
            warrantyMonths: item.warrantyMonths,
            expiryDate,
            status: expiryDate > new Date() ? 'active' : 'expired',
          };
        });

      if (warrantyDocs.length > 0) {
        await Warranty.insertMany(warrantyDocs, { session });
      }

      await Customer.findByIdAndUpdate(
        data.customer,
        { $inc: { totalPurchases: 1, totalSpent: totalAmount } },
        { session }
      );

      await session.commitTransaction();

      const created = await Sale.findById(sale._id)
        .populate('customer', 'name phone whatsapp')
        .populate('soldBy', 'name')
        .lean();
      return created as unknown as ISale;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findAll(params: SaleQueryParams): Promise<{ sales: ISale[]; total: number; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      paymentStatus,
      paymentMethod,
      sortField = 'saleDate',
      sortOrder = 'desc',
    } = params;

    const query: FilterQuery<ISale> = {};

    if (search) {
      query['invoiceNumber'] = { $regex: search, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      const dateRange: Record<string, Date> = {};
      if (dateFrom) dateRange['$gte'] = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateRange['$lte'] = end;
      }
      query['saleDate'] = dateRange;
    }

    if (paymentStatus) query['paymentStatus'] = paymentStatus;
    if (paymentMethod) query['paymentMethod'] = paymentMethod;

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate('customer', 'name phone')
        .populate('soldBy', 'name')
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    return { sales: sales as unknown as ISale[], total, pagination: buildPagination(total, page, limit) };
  }

  async findById(id: string): Promise<ISale> {
    const sale = await Sale.findById(id)
      .populate('customer', 'name phone whatsapp email address')
      .populate('soldBy', 'name')
      .lean();
    if (!sale) throw new AppError('Sale not found', 404);
    return sale as unknown as ISale;
  }

  async updateChequeImage(saleId: string, url: string): Promise<ISale> {
    const sale = await Sale.findByIdAndUpdate(
      saleId,
      { chequeImage: url },
      { new: true }
    )
      .populate('customer', 'name phone whatsapp')
      .populate('soldBy', 'name')
      .lean();
    if (!sale) throw new AppError('Sale not found', 404);
    return sale as unknown as ISale;
  }
}

export const saleService = new SaleService();
