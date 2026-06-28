import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { warrantyService } from '../services/warranty.service';
import { sendSuccess } from '../utils/response';
import { WarrantyStatus } from '../models/Warranty';

export const getStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await warrantyService.getStats();
    sendSuccess(res, stats, 'Warranty stats retrieved');
  } catch (error) {
    next(error);
  }
};

export const getWarranties = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      dateFrom,
      dateTo,
      customerId,
      sortField,
      sortOrder,
    } = req.query;

    const { warranties, pagination } = await warrantyService.findAll({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      sortField: sortField as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, warranties, 'Warranties retrieved', 200, pagination);
  } catch (error) {
    next(error);
  }
};

export const getWarranty = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const warranty = await warrantyService.findById(req.params['id']);
    sendSuccess(res, warranty, 'Warranty retrieved');
  } catch (error) {
    next(error);
  }
};

export const updateWarrantyStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, claimNotes } = req.body;
    const warranty = await warrantyService.updateStatus(
      req.params['id'],
      status as WarrantyStatus,
      claimNotes
    );
    sendSuccess(res, warranty, 'Warranty status updated');
  } catch (error) {
    next(error);
  }
};
