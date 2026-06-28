import mongoose from 'mongoose';
import { Delivery, IDelivery, DeliveryStatus, CourierCompany } from '../models/Delivery';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { buildPagination } from '../utils/response';

interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courierCompany?: string;
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
  userId: string;
}

interface UpdateDeliveryData {
  courierCompany?: CourierCompany;
  trackingNumber?: string;
  deliveryAddress?: string;
  estimatedDelivery?: string;
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

    const delivery = await Delivery.create({
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer,
      courierCompany: data.courierCompany,
      trackingNumber: data.trackingNumber,
      deliveryAddress: data.deliveryAddress,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      notes: data.notes,
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

    const delivery = await Delivery.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    note: string | undefined,
    userId: string
  ): Promise<IDelivery> {
    const delivery = await Delivery.findById(id);
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });

    if (FINAL_STATUSES.includes(delivery.status)) {
      throw Object.assign(
        new Error(`Cannot update: delivery is already ${delivery.status}`),
        { statusCode: 400 }
      );
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

  async delete(id: string): Promise<void> {
    const delivery = await Delivery.findByIdAndDelete(id);
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { statusCode: 404 });
  }
}

export const deliveryService = new DeliveryService();
