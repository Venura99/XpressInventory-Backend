import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { productService } from '../services/product.service';
import { sendSuccess, sendCreated, buildPagination } from '../utils/response';

export class ProductController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, search, category, sortField, sortOrder, lowStockOnly } = req.query;

      const { products, total } = await productService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        sortField: sortField as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        lowStockOnly: lowStockOnly === 'true',
      });

      sendSuccess(
        res,
        products,
        'Products retrieved',
        200,
        buildPagination(total, Number(page), Number(limit))
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.findById(req.params['id']);
      sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.create({ ...req.body, createdBy: req.user!.id });
      sendCreated(res, product, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.update(req.params['id'], req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await productService.delete(req.params['id']);
      sendSuccess(res, null, 'Product deleted');
    } catch (error) {
      next(error);
    }
  }

  async uploadImages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        res.status(400).json({ success: false, message: 'No image files provided' });
        return;
      }
      const product = await productService.uploadImages(req.params['id'], files);
      sendSuccess(res, product, 'Images uploaded');
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.deleteImage(
        req.params['id'],
        decodeURIComponent(req.params['publicId'])
      );
      sendSuccess(res, product, 'Image deleted');
    } catch (error) {
      next(error);
    }
  }

  async setPrimaryImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.setPrimaryImage(
        req.params['id'],
        decodeURIComponent(req.params['publicId'])
      );
      sendSuccess(res, product, 'Primary image updated');
    } catch (error) {
      next(error);
    }
  }

  async getLowStock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await productService.getLowStockProducts();
      sendSuccess(res, products, 'Low stock products');
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
