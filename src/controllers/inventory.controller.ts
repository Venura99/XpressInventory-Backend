import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { inventoryService } from '../services/inventory.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await inventoryService.getStats();
    sendSuccess(res, stats, 'Stats retrieved');
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 30, productId, action, dateFrom, dateTo, sortField, sortOrder } =
      req.query;

    const { logs, total, pagination } = await inventoryService.getLogs({
      page: Number(page),
      limit: Number(limit),
      productId: productId as string,
      action: action as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sortField: sortField as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, logs, 'Logs retrieved', 200, pagination);
  } catch (error) {
    next(error);
  }
};

export const stockIn = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, quantity, notes } = req.body;
    const log = await inventoryService.stockIn({ productId, quantity, notes, userId: req.user!.id });
    sendCreated(res, log, 'Stock added successfully');
  } catch (error) {
    next(error);
  }
};

export const stockOut = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, quantity, notes } = req.body;
    const log = await inventoryService.stockOut({ productId, quantity, notes, userId: req.user!.id });
    sendCreated(res, log, 'Stock removed successfully');
  } catch (error) {
    next(error);
  }
};

export const adjustment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, newQuantity, notes } = req.body;
    const log = await inventoryService.adjustment({
      productId,
      newQuantity,
      notes,
      userId: req.user!.id,
    });
    sendCreated(res, log, 'Stock adjusted successfully');
  } catch (error) {
    next(error);
  }
};
