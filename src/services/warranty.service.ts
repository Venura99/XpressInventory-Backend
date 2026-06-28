import { Warranty, IWarranty, WarrantyStatus } from '../models/Warranty';
import { Customer } from '../models/Customer';
import { buildPagination } from '../utils/response';

interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

class WarrantyService {
  private async autoExpire(): Promise<void> {
    await Warranty.updateMany(
      { status: 'active', expiryDate: { $lt: new Date() } },
      { $set: { status: 'expired' } }
    );
  }

  async getStats() {
    await this.autoExpire();

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, expiringSoon, expired, claimed] = await Promise.all([
      Warranty.countDocuments(),
      Warranty.countDocuments({ status: 'active' }),
      Warranty.countDocuments({ status: 'active', expiryDate: { $gte: now, $lte: in30Days } }),
      Warranty.countDocuments({ status: 'expired' }),
      Warranty.countDocuments({ status: 'claimed' }),
    ]);

    return { total, active, expiringSoon, expired, claimed };
  }

  async findAll(params: FindAllParams) {
    await this.autoExpire();

    const {
      page = 1,
      limit = 20,
      search,
      status,
      dateFrom,
      dateTo,
      customerId,
      sortField = 'expiryDate',
      sortOrder = 'asc',
    } = params;

    const filter: Record<string, unknown> = {};

    if (search) {
      const matchingCustomers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
        isActive: true,
      })
        .select('_id')
        .lean();

      const customerIds = matchingCustomers.map((c) => c._id);

      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
      ];
    }

    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    if (dateFrom || dateTo) {
      const expiryFilter: Record<string, Date> = {};
      if (dateFrom) expiryFilter.$gte = new Date(dateFrom);
      if (dateTo) expiryFilter.$lte = new Date(dateTo + 'T23:59:59.999Z');
      filter.expiryDate = expiryFilter;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [warranties, total] = await Promise.all([
      Warranty.find(filter)
        .populate('customer', 'name phone whatsapp')
        .populate('product', 'name sku')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Warranty.countDocuments(filter),
    ]);

    return {
      warranties: warranties as unknown as IWarranty[],
      total,
      pagination: buildPagination(total, page, limit),
    };
  }

  async findById(id: string): Promise<IWarranty> {
    const warranty = await Warranty.findById(id)
      .populate('customer', 'name phone whatsapp email address')
      .populate('product', 'name sku')
      .populate('sale', 'invoiceNumber')
      .lean();

    if (!warranty) throw Object.assign(new Error('Warranty not found'), { statusCode: 404 });
    return warranty as unknown as IWarranty;
  }

  async updateStatus(id: string, status: WarrantyStatus, claimNotes?: string): Promise<IWarranty> {
    const warranty = await Warranty.findById(id);
    if (!warranty) throw Object.assign(new Error('Warranty not found'), { statusCode: 404 });

    warranty.status = status;
    if (status === 'claimed') {
      warranty.claimDate = new Date();
      if (claimNotes) warranty.claimNotes = claimNotes;
    }

    await warranty.save();
    return this.findById(id);
  }
}

export const warrantyService = new WarrantyService();
