import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { categoryService } from '../services/category.service';
import { sendSuccess, sendCreated } from '../utils/response';

export class CategoryController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.findAll();
      sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.findById(req.params['id']);
      sendSuccess(res, category);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.create(req.body);
      sendCreated(res, category, 'Category created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.update(req.params['id'], req.body);
      sendSuccess(res, category, 'Category updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await categoryService.delete(req.params['id']);
      sendSuccess(res, null, 'Category deleted');
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
