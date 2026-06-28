import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISaleItem {
  product: Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  profit: number;
  warrantyMonths: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customer: Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  totalProfit: number;
  totalCost: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'city_ledger';
  paymentStatus: 'paid' | 'partial' | 'pending';
  amountPaid: number;
  chequeImage?: string;
  notes?: string;
  soldBy: Types.ObjectId;
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true },
    warrantyMonths: { type: Number, default: 0 },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    items: { type: [saleItemSchema], required: true, validate: [(v: ISaleItem[]) => v.length > 0, 'At least one item required'] },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    totalAmount: { type: Number, required: true, min: 0 },
    totalProfit: { type: Number, required: true },
    totalCost: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'cheque', 'city_ledger'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'pending'],
      default: 'paid',
    },
    amountPaid: { type: Number, required: true, min: 0 },
    chequeImage: { type: String },
    notes: { type: String, trim: true },
    soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    saleDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

saleSchema.index({ saleDate: -1, customer: 1 });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
