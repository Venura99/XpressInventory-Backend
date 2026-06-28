import mongoose, { Document, Schema, Types } from 'mongoose';

export type DeliveryStatus = 'pending' | 'packed' | 'dispatched' | 'delivered' | 'returned';
export type CourierCompany = 'koombiyo' | 'domex' | 'pronto' | 'citypak' | 'other';

export interface IDeliveryStatusHistory {
  status: DeliveryStatus;
  note?: string;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface IDelivery extends Document {
  sale: Types.ObjectId;
  invoiceNumber: string;
  customer: Types.ObjectId;
  courierCompany: CourierCompany;
  trackingNumber: string;
  status: DeliveryStatus;
  statusHistory: IDeliveryStatusHistory[];
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  deliveryAddress: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IDeliveryStatusHistory>(
  {
    status: { type: String, required: true },
    note: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliverySchema = new Schema<IDelivery>(
  {
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    invoiceNumber: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    courierCompany: {
      type: String,
      enum: ['koombiyo', 'domex', 'pronto', 'citypak', 'other'],
      required: true,
    },
    trackingNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'packed', 'dispatched', 'delivered', 'returned'],
      default: 'pending',
      index: true,
    },
    statusHistory: [statusHistorySchema],
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    deliveryAddress: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliverySchema.index({ status: 1, createdAt: -1 });

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
