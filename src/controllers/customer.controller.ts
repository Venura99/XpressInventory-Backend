import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { customerService } from '../services/customer.service';
import { sendSuccess, sendCreated, buildPagination } from '../utils/response';

export class CustomerController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, search, sortField, sortOrder } = req.query;

      const { customers, total } = await customerService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortField: sortField as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      sendSuccess(
        res,
        customers,
        'Customers retrieved',
        200,
        buildPagination(total, Number(page), Number(limit))
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.findById(req.params['id']);
      sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async searchByPhone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const phone = req.query['phone'] as string;
      if (!phone) {
        res.status(400).json({ success: false, message: 'Phone query parameter required' });
        return;
      }
      const customers = await customerService.findByPhone(phone);
      sendSuccess(res, customers);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.create({ ...req.body, createdBy: req.user!.id });
      sendCreated(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.update(req.params['id'], req.body);
      sendSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await customerService.delete(req.params['id']);
      sendSuccess(res, null, 'Customer deleted');
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
