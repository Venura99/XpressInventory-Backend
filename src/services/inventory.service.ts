import { FilterQuery } from 'mongoose';
import { InventoryLog, IInventoryLog } from '../models/InventoryLog';
import { Product } from '../models/Product';
import { AppError } from '../middleware/error.middleware';
import { buildPagination, PaginationMeta } from '../utils/response';

export interface LogQueryParams {
  page?: number;
  limit?: number;
  productId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export class InventoryService {
  async getStats(): Promise<{
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  }> {
    const [total, outOfStock, lowStockAgg] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stockQuantity: 0 }),
      Product.aggregate([
        { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
        {
          $project: {
            isLow: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
          },
        },
        {
          $group: {
            _id: null,
            lowStock: { $sum: { $cond: ['$isLow', 1, 0] } },
          },
        },
      ]),
    ]);

    const lowStock = (lowStockAgg[0]?.lowStock as number) ?? 0;
    return {
      total,
      outOfStock,
      lowStock,
      inStock: total - outOfStock - lowStock,
    };
  }

  async getLogs(params: LogQueryParams): Promise<{
    logs: IInventoryLog[];
    total: number;
    pagination: PaginationMeta;
  }> {
    const {
      page = 1,
      limit = 30,
      productId,
      action,
      dateFrom,
      dateTo,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const query: FilterQuery<IInventoryLog> = {};
    if (productId) query['product'] = productId;
    if (action) query['action'] = action;

    if (dateFrom || dateTo) {
      const dateRange: Record<string, Date> = {};
      if (dateFrom) dateRange['$gte'] = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateRange['$lte'] = end;
      }
      query['createdAt'] = dateRange;
    }

    const [logs, total] = await Promise.all([
      InventoryLog.find(query)
        .populate('product', 'name sku')
        .populate('performedBy', 'name')
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryLog.countDocuments(query),
    ]);

    return {
      logs: logs as unknown as IInventoryLog[],
      total,
      pagination: buildPagination(total, page, limit),
    };
  }

  async stockIn(data: {
    productId: string;
    quantity: number;
    notes?: string;
    userId: string;
  }): Promise<IInventoryLog> {
    const product = await Product.findById(data.productId);
    if (!product || !product.isActive) throw new AppError('Product not found', 404);

    const qtyBefore = product.stockQuantity;
    const qtyAfter = qtyBefore + data.quantity;

    await Product.findByIdAndUpdate(data.productId, { stockQuantity: qtyAfter });

    const log = await InventoryLog.create({
      product: data.productId,
      action: 'stock_in',
      quantityBefore: qtyBefore,
      quantityChange: data.quantity,
      quantityAfter: qtyAfter,
      notes: data.notes,
      referenceType: 'manual',
      performedBy: data.userId,
    });

    return InventoryLog.findById(log._id)
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .lean() as unknown as IInventoryLog;
  }

  async stockOut(data: {
    productId: string;
    quantity: number;
    notes?: string;
    userId: string;
  }): Promise<IInventoryLog> {
    const product = await Product.findById(data.productId);
    if (!product || !product.isActive) throw new AppError('Product not found', 404);
    if (product.stockQuantity < data.quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${product.stockQuantity}`,
        400
      );
    }

    const qtyBefore = product.stockQuantity;
    const qtyAfter = qtyBefore - data.quantity;

    await Product.findByIdAndUpdate(data.productId, { stockQuantity: qtyAfter });

    const log = await InventoryLog.create({
      product: data.productId,
      action: 'stock_out',
      quantityBefore: qtyBefore,
      quantityChange: -data.quantity,
      quantityAfter: qtyAfter,
      notes: data.notes,
      referenceType: 'manual',
      performedBy: data.userId,
    });

    return InventoryLog.findById(log._id)
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .lean() as unknown as IInventoryLog;
  }

  async adjustment(data: {
    productId: string;
    newQuantity: number;
    notes?: string;
    userId: string;
  }): Promise<IInventoryLog> {
    const product = await Product.findById(data.productId);
    if (!product || !product.isActive) throw new AppError('Product not found', 404);

    const qtyBefore = product.stockQuantity;
    const qtyChange = data.newQuantity - qtyBefore;

    await Product.findByIdAndUpdate(data.productId, { stockQuantity: data.newQuantity });

    const log = await InventoryLog.create({
      product: data.productId,
      action: 'adjustment',
      quantityBefore: qtyBefore,
      quantityChange: qtyChange,
      quantityAfter: data.newQuantity,
      notes: data.notes ?? `Stock adjusted from ${qtyBefore} to ${data.newQuantity}`,
      referenceType: 'manual',
      performedBy: data.userId,
    });

    return InventoryLog.findById(log._id)
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .lean() as unknown as IInventoryLog;
  }
}

export const inventoryService = new InventoryService();
