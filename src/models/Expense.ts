import mongoose, { Document, Schema, Types } from 'mongoose';

export type ExpenseCategory =
  | 'courier_charges'
  | 'facebook_ads'
  | 'packaging'
  | 'transport'
  | 'miscellaneous';

export interface IExpense extends Document {
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Date;
  receipt?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      enum: ['courier_charges', 'facebook_ads', 'packaging', 'transport', 'miscellaneous'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    receipt: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1, category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
