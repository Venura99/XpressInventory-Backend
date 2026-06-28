import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const getDashboard = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await dashboardService.getData();
    sendSuccess(res, data, 'Dashboard data retrieved');
  } catch (error) {
    next(error);
  }
};
