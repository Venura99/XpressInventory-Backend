import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { AppError } from '../middleware/error.middleware';

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdBy: string;
}

export class CustomerService {
  async findAll(params: CustomerQueryParams): Promise<{ customers: ICustomer[]; total: number }> {
    const { page = 1, limit = 20, search, sortField = 'createdAt', sortOrder = 'desc' } = params;

    const query: FilterQuery<ICustomer> = { isActive: true };

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { whatsapp: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Customer.countDocuments(query),
    ]);

    return { customers, total };
  }

  async findById(id: string): Promise<ICustomer> {
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  async findByPhone(phone: string): Promise<ICustomer[]> {
    return Customer.find({
      isActive: true,
      $or: [
        { phone: { $regex: phone, $options: 'i' } },
        { whatsapp: { $regex: phone, $options: 'i' } },
      ],
    }).limit(10);
  }

  async create(data: CreateCustomerDto): Promise<ICustomer> {
    return Customer.create(data);
  }

  async update(id: string, data: Partial<CreateCustomerDto>): Promise<ICustomer> {
    const customer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  async delete(id: string): Promise<void> {
    const customer = await Customer.findByIdAndUpdate(id, { isActive: false });
    if (!customer) throw new AppError('Customer not found', 404);
  }

  async incrementPurchaseStats(id: string, amount: number): Promise<void> {
    await Customer.findByIdAndUpdate(id, {
      $inc: { totalPurchases: 1, totalSpent: amount },
    });
  }
}

export const customerService = new CustomerService();
