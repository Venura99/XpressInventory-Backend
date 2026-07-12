import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { importService } from '../services/import.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

export const downloadSalesTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workbook = importService.generateSalesImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="gadgetxpress-sales-import-template.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const importSales = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const summary = await importService.importSales(req.file.buffer, req.user!.id);
    sendSuccess(res, summary, 'Import completed');
  } catch (error) {
    next(error);
  }
};
