import { Expense, IExpense, ExpenseCategory } from '../models/Expense';
import { buildPagination } from '../utils/response';

interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateExpenseData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  date?: string;
  userId: string;
}

interface UpdateExpenseData {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  date?: string;
}

class ExpenseService {
  private buildDateFilter(dateFrom?: string, dateTo?: string): Record<string, Date> | undefined {
    if (!dateFrom && !dateTo) return undefined;
    const f: Record<string, Date> = {};
    if (dateFrom) f.$gte = new Date(dateFrom);
    if (dateTo) f.$lte = new Date(dateTo + 'T23:59:59.999Z');
    return f;
  }

  async getSummary(dateFrom?: string, dateTo?: string) {
    const filter: Record<string, unknown> = {};
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);
    if (dateFilter) filter.date = dateFilter;

    const rows = await Expense.aggregate<{ _id: ExpenseCategory; total: number; count: number }>([
      { $match: filter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const byCategory: Record<string, { total: number; count: number }> = {};
    let total = 0;

    for (const row of rows) {
      byCategory[row._id] = { total: row.total, count: row.count };
      total += row.total;
    }

    return { total, byCategory };
  }

  async findAll(params: FindAllParams) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      dateFrom,
      dateTo,
      sortField = 'date',
      sortOrder = 'desc',
    } = params;

    const filter: Record<string, unknown> = {};
    if (search) filter.description = { $regex: search, $options: 'i' };
    if (category) filter.category = category;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);
    if (dateFilter) filter.date = dateFilter;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('recordedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter),
    ]);

    return {
      expenses: expenses as unknown as IExpense[],
      pagination: buildPagination(total, page, limit),
    };
  }

  async findById(id: string): Promise<IExpense> {
    const expense = await Expense.findById(id)
      .populate('recordedBy', 'name')
      .lean();

    if (!expense) throw Object.assign(new Error('Expense not found'), { statusCode: 404 });
    return expense as unknown as IExpense;
  }

  async create(data: CreateExpenseData): Promise<IExpense> {
    const expense = await Expense.create({
      category: data.category,
      amount: data.amount,
      description: data.description,
      date: data.date ? new Date(data.date) : new Date(),
      recordedBy: data.userId,
    });

    return this.findById(expense._id.toString());
  }

  async update(id: string, data: UpdateExpenseData): Promise<IExpense> {
    const update: Record<string, unknown> = {};
    if (data.category !== undefined) update.category = data.category;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.description !== undefined) update.description = data.description;
    if (data.date !== undefined) update.date = new Date(data.date);

    const expense = await Expense.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!expense) throw Object.assign(new Error('Expense not found'), { statusCode: 404 });

    return this.findById(id);
  }

  async updateReceipt(id: string, receiptUrl: string | undefined): Promise<IExpense> {
    const op = receiptUrl
      ? { $set: { receipt: receiptUrl } }
      : { $unset: { receipt: 1 } };

    const expense = await Expense.findByIdAndUpdate(id, op, { new: true }).lean();
    if (!expense) throw Object.assign(new Error('Expense not found'), { statusCode: 404 });

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) throw Object.assign(new Error('Expense not found'), { statusCode: 404 });
  }
}

export const expenseService = new ExpenseService();
