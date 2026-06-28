import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { InventoryLog } from '../models/InventoryLog';
import { AppError } from '../middleware/error.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload.middleware';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  lowStockOnly?: boolean;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  category: string;
  brand: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  warrantyMonths?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  createdBy: string;
}

export class ProductService {
  async findAll(params: ProductQueryParams): Promise<{ products: IProduct[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      sortField = 'createdAt',
      sortOrder = 'desc',
      lowStockOnly,
    } = params;

    const query: FilterQuery<IProduct> = { isActive: true };

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query['category'] = category;

    if (lowStockOnly) {
      query['$expr'] = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(query),
    ]);

    return { products: products as unknown as IProduct[], total };
  }

  async findById(id: string): Promise<IProduct> {
    const product = await Product.findById(id).populate('category', 'name slug');
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async create(data: CreateProductDto): Promise<IProduct> {
    const exists = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (exists) throw new AppError('SKU already exists', 409);

    const product = await Product.create({ ...data, sku: data.sku.toUpperCase() });

    if (data.stockQuantity > 0) {
      await InventoryLog.create({
        product: product._id,
        action: 'stock_in',
        quantityBefore: 0,
        quantityChange: data.stockQuantity,
        quantityAfter: data.stockQuantity,
        notes: 'Initial stock on product creation',
        referenceType: 'manual',
        performedBy: data.createdBy,
      });
    }

    return product;
  }

  async update(id: string, data: Partial<CreateProductDto>): Promise<IProduct> {
    if (data.sku) {
      const conflict = await Product.findOne({ sku: data.sku.toUpperCase(), _id: { $ne: id } });
      if (conflict) throw new AppError('SKU already in use by another product', 409);
      data.sku = data.sku.toUpperCase();
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async delete(id: string): Promise<void> {
    const product = await Product.findByIdAndUpdate(id, { isActive: false });
    if (!product) throw new AppError('Product not found', 404);
  }

  async uploadImages(productId: string, files: Express.Multer.File[]): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const results = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer, 'products'))
    );

    results.forEach((result, index) => {
      product.images.push({
        url: result.url,
        publicId: result.publicId,
        isPrimary: product.images.length === 0 && index === 0,
      });
    });

    await product.save();
    return product;
  }

  async deleteImage(productId: string, publicId: string): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const idx = product.images.findIndex((img) => img.publicId === publicId);
    if (idx === -1) throw new AppError('Image not found', 404);

    const wasPrimary = product.images[idx].isPrimary;
    await deleteFromCloudinary(publicId);
    product.images.splice(idx, 1);

    if (wasPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true;
    }

    await product.save();
    return product;
  }

  async setPrimaryImage(productId: string, publicId: string): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    product.images.forEach((img) => {
      img.isPrimary = img.publicId === publicId;
    });

    await product.save();
    return product;
  }

  async getLowStockProducts(): Promise<IProduct[]> {
    return Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ stockQuantity: 1 });
  }
}

export const productService = new ProductService();
