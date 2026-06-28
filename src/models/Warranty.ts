import mongoose, { Document, Schema, Types } from 'mongoose';

export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided';

export interface IWarranty extends Document {
  product: Types.ObjectId;
  productName: string;
  customer: Types.ObjectId;
  sale: Types.ObjectId;
  invoiceNumber: string;
  purchaseDate: Date;
  warrantyMonths: number;
  expiryDate: Date;
  status: WarrantyStatus;
  claimNotes?: string;
  claimDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const warrantySchema = new Schema<IWarranty>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    invoiceNumber: { type: String, required: true, index: true },
    purchaseDate: { type: Date, required: true },
    warrantyMonths: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'claimed', 'voided'],
      default: 'active',
      index: true,
    },
    claimNotes: { type: String, trim: true },
    claimDate: { type: Date },
  },
  { timestamps: true }
);

warrantySchema.pre('save', function (next) {
  if (this.isModified('expiryDate') || this.isNew) {
    const now = new Date();
    if (this.status === 'active' && this.expiryDate < now) {
      this.status = 'expired';
    }
  }
  next();
});

export const Warranty = mongoose.model<IWarranty>('Warranty', warrantySchema);
