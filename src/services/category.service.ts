import { Category, ICategory } from '../models/Category';
import { AppError } from '../middleware/error.middleware';

export class CategoryService {
  async findAll(): Promise<ICategory[]> {
    return Category.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<ICategory> {
    const category = await Category.findById(id);
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async create(data: { name: string; description?: string }): Promise<ICategory> {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = await Category.findOne({ slug });
    if (exists) throw new AppError('Category already exists', 409);
    return Category.create({ ...data, slug });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<ICategory> {
    if (data.name) {
      (data as Record<string, unknown>)['slug'] = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async delete(id: string): Promise<void> {
    const category = await Category.findByIdAndUpdate(id, { isActive: false });
    if (!category) throw new AppError('Category not found', 404);
  }
}

export const categoryService = new CategoryService();
