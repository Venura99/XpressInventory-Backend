import mongoose, { Document, Schema, Types } from 'mongoose';

export type InventoryAction = 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'return';

export interface IInventoryLog extends Document {
  product: Types.ObjectId;
  action: InventoryAction;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reference?: string;
  referenceType?: 'sale' | 'manual' | 'return';
  notes?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    action: {
      type: String,
      enum: ['stock_in', 'stock_out', 'adjustment', 'sale', 'return'],
      required: true,
    },
    quantityBefore: { type: Number, required: true },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    reference: { type: String },
    referenceType: {
      type: String,
      enum: ['sale', 'manual', 'return'],
    },
    notes: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

export const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', inventoryLogSchema);
