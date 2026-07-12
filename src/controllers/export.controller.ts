import { Request, Response, NextFunction } from 'express';
import { exportService } from '../services/export.service';

const parseDate = (val: unknown): Date | undefined => {
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

export const exportSalesCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFrom = parseDate(req.query['dateFrom']);
    const dateTo = parseDate(req.query['dateTo']);
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    const workbook = await exportService.generateSalesCustomersWorkbook(dateFrom, dateTo);

    const filename = `gadgetxpress-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
