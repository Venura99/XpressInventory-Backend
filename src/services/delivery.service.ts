import mongoose from 'mongoose';
import { Delivery, IDelivery, DeliveryStatus, CourierCompany, RemittanceStatus } from '../models/Delivery';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { InventoryLog } from '../models/InventoryLog';
import { buildPagination } from '../utils/response';

interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courierCompany?: string;
  remittanceStatus?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateDeliveryData {
  saleId: string;
  courierCompany: CourierCompany;
  trackingNumber: string;
  deliveryAddress: string;
  estimatedDelivery?: string;
  notes?: string;
  courierChargeToCustomer?: number;
  actualCourierCost: number;
  isCOD?: boolean;
  codAmountExpected?: number;
  userId: string;
}

interface UpdateDeliveryData {
  courierCompany?: CourierCompany;
  trackingNumber?: string;
  deliveryAddress?: string;
  estimatedDelivery?: string;
  notes?: string;
  courierChargeToCustomer?: number;
  actualCourierCost?: number;
  isCOD?: boolean;
  codAmountExpected?: number;
}

interface RecordRemittanceData {
  amountRemitted: number;
  remittedDate?: string;
  notes?: string;
}

const FINAL_STATUSES: DeliveryStatus[] = ['delivered', 'returned'];

class DeliveryService {
  async findAll(params: FindAllParams) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      courierCompany,
      remittanceStatus,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const filter: Record<string, unknown> = {};

    if (search) {
      const matchingCustomers = await Customer.find({
        name: { $regex: search, $options: 'i' },
        isActive: true,
      })
        .select('_id')
        .lean();

      const customerIds = matchingCustomers.map((c) => c._id);

      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
      ];
    }

    if (status) filter.status = status;
    if (courierCompany) filter.courierCompany = courierCompany;
    if (remittanceStatus) filter.remittanceStatus = remittanceStatus;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('customer', 'name phone')
        .populate('createdBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    return {
      deliveries: deliveries as unknown as IDelivery[],
      pagination: buildPagination(total, page, limit),
    };
  }

  async findById(id: string): Promise<IDelivery> {
    const delivery = await Delivery.findById(id)
      .populate('customer', 'name phone whatsapp email')
      .populate('sale', 'invoiceNumber totalAmount')
      .populate('createdBy', 'name')
      .populate('statusHistory.updatedBy', 'name')
      .lean();

    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });
    return delivery as unknown as IDelivery;
  }

  async create(data: CreateDeliveryData): Promise<IDelivery> {
    const sale = await Sale.findById(data.saleId).lean();
    if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404 });

    const userId = new mongoose.Types.ObjectId(data.userId);
    const isCOD = data.isCOD ?? false;

    const delivery = await Delivery.create({
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer,
      courierCompany: data.courierCompany,
      trackingNumber: data.trackingNumber,
      deliveryAddress: data.deliveryAddress,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      notes: data.notes,
      courierChargeToCustomer: data.courierChargeToCustomer ?? 0,
      actualCourierCost: data.actualCourierCost,
      isCOD,
      codAmountExpected: isCOD ? data.codAmountExpected ?? 0 : 0,
      remittanceStatus: isCOD ? 'pending' : 'not_applicable',
      status: 'pending',
      statusHistory: [
        { status: 'pending', note: 'Delivery created', updatedBy: userId, updatedAt: new Date() },
      ],
      createdBy: userId,
    });

    return this.findById(delivery._id.toString());
  }

  async update(id: string, data: UpdateDeliveryData): Promise<IDelivery> {
    const set: Record<string, unknown> = {};
    if (data.courierCompany) set.courierCompany = data.courierCompany;
    if (data.trackingNumber) set.trackingNumber = data.trackingNumber;
    if (data.deliveryAddress) set.deliveryAddress = data.deliveryAddress;
    if (data.estimatedDelivery) set.estimatedDelivery = new Date(data.estimatedDelivery);
    if (data.notes !== undefined) set.notes = data.notes;
    if (data.courierChargeToCustomer !== undefined) set.courierChargeToCustomer = data.courierChargeToCustomer;
    if (data.actualCourierCost !== undefined) set.actualCourierCost = data.actualCourierCost;
    if (data.isCOD !== undefined) {
      set.isCOD = data.isCOD;
      if (!data.isCOD) {
        set.remittanceStatus = 'not_applicable';
        set.codAmountExpected = 0;
      } else {
        set.remittanceStatus = 'pending';
      }
    }
    if (data.codAmountExpected !== undefined) set.codAmountExpected = data.codAmountExpected;

    const delivery = await Delivery.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });
    return this.findById(id);
  }

  async recordRemittance(id: string, data: RecordRemittanceData): Promise<IDelivery> {
    const delivery = await Delivery.findById(id);
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });

    if (!delivery.isCOD) {
      throw Object.assign(new Error('This delivery is not a COD delivery'), { statusCode: 400 });
    }

    const courierDeduction = Math.max(0, delivery.codAmountExpected - data.amountRemitted);
    let remittanceStatus: RemittanceStatus = 'pending';
    if (data.amountRemitted >= delivery.codAmountExpected && delivery.codAmountExpected > 0) {
      remittanceStatus = 'remitted';
    } else if (data.amountRemitted > 0) {
      remittanceStatus = 'partial';
    }

    delivery.codAmountRemitted = data.amountRemitted;
    delivery.courierDeduction = courierDeduction;
    delivery.remittanceStatus = remittanceStatus;
    delivery.remittedDate = data.remittedDate ? new Date(data.remittedDate) : new Date();
    if (data.notes !== undefined) delivery.remittanceNotes = data.notes;

    await delivery.save();
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    note: string | undefined,
    userId: string,
    returnDetails?: { returnShippingCost: number; returnReason: string }
  ): Promise<IDelivery> {
    const delivery = await Delivery.findById(id);
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });

    if (FINAL_STATUSES.includes(delivery.status)) {
      throw Object.assign(
        new Error(`Cannot update: delivery is already ${delivery.status}`),
        { statusCode: 400 }
      );
    }

    if (status === 'returned') {
      if (!returnDetails) {
        throw Object.assign(
          new Error('Return shipping cost and reason are required to mark a delivery as returned'),
          { statusCode: 400 }
        );
      }
      await this.processReturn(delivery, returnDetails, userId, note);
      return this.findById(id);
    }

    delivery.status = status;
    delivery.statusHistory.push({
      status,
      note,
      updatedBy: new mongoose.Types.ObjectId(userId),
      updatedAt: new Date(),
    });

    if (status === 'delivered') {
      delivery.deliveredAt = new Date();
    }

    await delivery.save();
    return this.findById(id);
  }

  private async processReturn(
    delivery: InstanceType<typeof Delivery>,
    returnDetails: { returnShippingCost: number; returnReason: string },
    userId: string,
    note: string | undefined
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
      const sale = await Sale.findById(delivery.sale).session(session);
      if (!sale) throw Object.assign(new Error('Linked sale not found'), { statusCode: 404 });

      if (!sale.isReturned) {
        for (const item of sale.items) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            const qtyBefore = product.stockQuantity;
            const qtyAfter = qtyBefore + item.quantity;

            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stockQuantity: item.quantity } },
              { session }
            );

            await InventoryLog.create(
              [
                {
                  product: item.product,
                  action: 'return',
                  quantityBefore: qtyBefore,
                  quantityChange: item.quantity,
                  quantityAfter: qtyAfter,
                  reference: sale.invoiceNumber,
                  referenceType: 'return',
                  notes: returnDetails.returnReason,
                  performedBy: userObjectId,
                },
              ],
              { session }
            );
          }
        }

        sale.isReturned = true;
        sale.returnedAt = new Date();
        await sale.save({ session });

        await Customer.findByIdAndUpdate(
          sale.customer,
          { $inc: { totalPurchases: -1, totalSpent: -sale.totalAmount } },
          { session }
        );
      }

      delivery.status = 'returned';
      delivery.returnShippingCost = returnDetails.returnShippingCost;
      delivery.returnReason = returnDetails.returnReason;
      delivery.statusHistory.push({
        status: 'returned',
        note: note ?? returnDetails.returnReason,
        updatedBy: userObjectId,
        updatedAt: new Date(),
      });
      await delivery.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getCodSummary() {
    const [pendingAgg, remittedAgg, statusCounts, pendingList] = await Promise.all([
      Delivery.aggregate<{ _id: null; pendingAmount: number; count: number }>([
        { $match: { isCOD: true, remittanceStatus: { $in: ['pending', 'partial'] } } },
        {
          $group: {
            _id: null,
            pendingAmount: { $sum: { $subtract: ['$codAmountExpected', '$codAmountRemitted'] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Delivery.aggregate<{ _id: null; totalRemitted: number; totalDeductions: number }>([
        { $match: { isCOD: true } },
        {
          $group: {
            _id: null,
            totalRemitted: { $sum: '$codAmountRemitted' },
            totalDeductions: { $sum: '$courierDeduction' },
          },
        },
      ]),
      Delivery.aggregate<{ _id: RemittanceStatus; count: number }>([
        { $match: { isCOD: true } },
        { $group: { _id: '$remittanceStatus', count: { $sum: 1 } } },
      ]),
      Delivery.find({ isCOD: true, remittanceStatus: { $in: ['pending', 'partial'] } })
        .populate('customer', 'name phone')
        .select('invoiceNumber trackingNumber customer codAmountExpected codAmountRemitted remittanceStatus createdAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      pendingAmount: pendingAgg[0]?.pendingAmount ?? 0,
      pendingCount: pendingAgg[0]?.count ?? 0,
      totalRemitted: remittedAgg[0]?.totalRemitted ?? 0,
      totalDeductions: remittedAgg[0]?.totalDeductions ?? 0,
      byStatus: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      pendingDeliveries: pendingList,
    };
  }

  async delete(id: string): Promise<void> {
    const delivery = await Delivery.findByIdAndDelete(id);
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });
  }
}

export const deliveryService = new DeliveryService();
