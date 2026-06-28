import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';

const parseDate = (val: unknown, fallback: Date): Date => {
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
};

const defaultRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

export const getPnLReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = defaultRange();
    const dateFrom = parseDate(req.query['dateFrom'], from);
    const dateTo = parseDate(req.query['dateTo'], to);
    dateTo.setHours(23, 59, 59, 999);
    const data = await reportService.getPnLReport(dateFrom, dateTo);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = defaultRange();
    const dateFrom = parseDate(req.query['dateFrom'], from);
    const dateTo = parseDate(req.query['dateTo'], to);
    dateTo.setHours(23, 59, 59, 999);
    const data = await reportService.getSalesReport(dateFrom, dateTo);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInventoryReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await reportService.getInventoryReport();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getWarrantyDeliveryReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = defaultRange();
    const dateFrom = parseDate(req.query['dateFrom'], from);
    const dateTo = parseDate(req.query['dateTo'], to);
    dateTo.setHours(23, 59, 59, 999);
    const data = await reportService.getWarrantyDeliveryReport(dateFrom, dateTo);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
