import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { saleService } from '../services/sale.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { uploadToCloudinary } from '../middleware/upload.middleware';

export const getSales = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      paymentStatus,
      paymentMethod,
      sortField,
      sortOrder,
    } = req.query;

    const { sales, total, pagination } = await saleService.findAll({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      paymentStatus: paymentStatus as string,
      paymentMethod: paymentMethod as string,
      sortField: sortField as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, sales, 'Sales retrieved', 200, pagination);
  } catch (error) {
    next(error);
  }
};

export const getSale = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await saleService.findById(req.params.id);
    sendSuccess(res, sale, 'Sale retrieved');
  } catch (error) {
    next(error);
  }
};

export const createSale = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await saleService.createSale(req.body, req.user!.id);
    sendCreated(res, sale, 'Sale created successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadChequeImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) throw new AppError('No image file provided', 400);
    const { url } = await uploadToCloudinary(req.file.buffer, 'cheques');
    const sale = await saleService.updateChequeImage(req.params.id, url);
    sendSuccess(res, sale, 'Cheque image uploaded');
  } catch (error) {
    next(error);
  }
};
