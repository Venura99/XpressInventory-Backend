import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProductImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: Types.ObjectId;
  brand: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  warrantyMonths: number;
  stockQuantity: number;
  lowStockThreshold: number;
  images: IProductImage[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    warrantyMonths: { type: Number, default: 0, min: 0 },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    images: [productImageSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

productSchema.virtual('profit').get(function () {
  return this.sellingPrice - this.costPrice;
});

productSchema.virtual('profitMargin').get(function () {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ name: 'text', sku: 'text', brand: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
