import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { expenseService } from '../services/expense.service';
import { uploadToCloudinary } from '../middleware/upload.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { ExpenseCategory } from '../models/Expense';

export const getSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    const summary = await expenseService.getSummary(
      dateFrom as string,
      dateTo as string
    );
    sendSuccess(res, summary, 'Summary retrieved');
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, category, dateFrom, dateTo, sortField, sortOrder } =
      req.query;

    const { expenses, pagination } = await expenseService.findAll({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      category: category as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sortField: sortField as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, expenses, 'Expenses retrieved', 200, pagination);
  } catch (error) {
    next(error);
  }
};

export const getExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = await expenseService.findById(req.params['id']);
    sendSuccess(res, expense, 'Expense retrieved');
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, amount, description, date } = req.body;
    const expense = await expenseService.create({
      category: category as ExpenseCategory,
      amount: Number(amount),
      description,
      date,
      userId: req.user!.id,
    });
    sendCreated(res, expense, 'Expense created');
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, amount, description, date } = req.body;
    const expense = await expenseService.update(req.params['id'], {
      category: category as ExpenseCategory | undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      description,
      date,
    });
    sendSuccess(res, expense, 'Expense updated');
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await expenseService.delete(req.params['id']);
    sendSuccess(res, null, 'Expense deleted');
  } catch (error) {
    next(error);
  }
};

export const uploadReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, 'expenses');
    const expense = await expenseService.updateReceipt(req.params['id'], url);
    sendSuccess(res, expense, 'Receipt uploaded');
  } catch (error) {
    next(error);
  }
};

export const removeReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = await expenseService.updateReceipt(req.params['id'], undefined);
    sendSuccess(res, expense, 'Receipt removed');
  } catch (error) {
    next(error);
  }
};
