import { Request, Response, NextFunction } from 'express';
import { SortOrder } from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

// Fields safe to expose publicly — costPrice is intentionally excluded
const PUBLIC_PRODUCT_FIELDS =
  'name sku brand description sellingPrice warrantyMonths stockQuantity lowStockThreshold images category isActive';

export const getPublicProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      category,
      inStockOnly = 'true',
      sort = 'name',
      page = '1',
      limit = '48',
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = { isActive: true };

    if (inStockOnly === 'true') {
      query['stockQuantity'] = { $gt: 0 };
    }

    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) query['category'] = cat._id;
    }

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap: Record<string, Record<string, SortOrder>> = {
      name:        { name: 1 },
      '-name':     { name: -1 },
      price_asc:   { sellingPrice: 1 },
      price_desc:  { sellingPrice: -1 },
      newest:      { createdAt: -1 },
    };
    const sortObj = sortMap[sort] ?? { name: 1 };

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(96, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select(PUBLIC_PRODUCT_FIELDS)
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Strip costPrice entirely and add stockStatus
    const safe = products.map((p) => ({
      ...p,
      costPrice: undefined,
      stockStatus:
        p.stockQuantity === 0
          ? 'out_of_stock'
          : p.stockQuantity <= p.lowStockThreshold
          ? 'low_stock'
          : 'in_stock',
    }));

    sendSuccess(res, safe, 'Products retrieved', 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    } as never);
  } catch (error) {
    next(error);
  }
};

export const getPublicProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .lean();

    if (!product) throw new AppError('Product not found', 404);

    const safe = {
      ...product,
      costPrice: undefined,
      stockStatus:
        product.stockQuantity === 0
          ? 'out_of_stock'
          : product.stockQuantity <= product.lowStockThreshold
          ? 'low_stock'
          : 'in_stock',
    };

    // Related products (same category, excluding this one)
    const related = await Product.find({
      category: (product.category as { _id: unknown })._id,
      _id: { $ne: product._id },
      isActive: true,
      stockQuantity: { $gt: 0 },
    })
      .select('name sellingPrice images warrantyMonths stockQuantity lowStockThreshold brand')
      .limit(4)
      .lean()
      .then((items) =>
        items.map((p) => ({
          ...p,
          costPrice: undefined,
          stockStatus:
            p.stockQuantity === 0
              ? 'out_of_stock'
              : p.stockQuantity <= p.lowStockThreshold
              ? 'low_stock'
              : 'in_stock',
        }))
      );

    sendSuccess(res, { ...safe, related }, 'Product retrieved');
  } catch (error) {
    next(error);
  }
};

export const getPublicCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug description')
      .sort({ name: 1 })
      .lean();

    sendSuccess(res, categories, 'Categories retrieved');
  } catch (error) {
    next(error);
  }
};
