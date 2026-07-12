import mongoose, { Document, Schema, Types } from 'mongoose';

export type DeliveryStatus = 'pending' | 'packed' | 'dispatched' | 'delivered' | 'returned';
export type CourierCompany = 'sl_post' | 'koombiyo' | 'domex' | 'pronto' | 'citypak' | 'other';
export type RemittanceStatus = 'not_applicable' | 'pending' | 'partial' | 'remitted';

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

  // Courier cost (what SL Post / courier actually charges us for this parcel)
  courierChargeToCustomer: number;
  actualCourierCost: number;

  // COD cash reconciliation (post office collects from customer, remits to us later)
  isCOD: boolean;
  codAmountExpected: number;
  codAmountRemitted: number;
  courierDeduction: number;
  remittanceStatus: RemittanceStatus;
  remittedDate?: Date;
  remittanceNotes?: string;

  // Returns
  returnShippingCost: number;
  returnReason?: string;

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
      enum: ['sl_post', 'koombiyo', 'domex', 'pronto', 'citypak', 'other'],
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

    courierChargeToCustomer: { type: Number, default: 0, min: 0 },
    actualCourierCost: { type: Number, default: 0, min: 0 },

    isCOD: { type: Boolean, default: false },
    codAmountExpected: { type: Number, default: 0, min: 0 },
    codAmountRemitted: { type: Number, default: 0, min: 0 },
    courierDeduction: { type: Number, default: 0, min: 0 },
    remittanceStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'partial', 'remitted'],
      default: 'not_applicable',
      index: true,
    },
    remittedDate: { type: Date },
    remittanceNotes: { type: String, trim: true },

    returnShippingCost: { type: Number, default: 0, min: 0 },
    returnReason: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliverySchema.index({ status: 1, createdAt: -1 });

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
