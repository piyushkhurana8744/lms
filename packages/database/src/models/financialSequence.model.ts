import { Schema, model, Document, Types } from 'mongoose';

export type FinancialSequenceKind = 'PAYMENT' | 'RECEIPT' | 'REFUND';

export interface IFinancialSequenceDocument extends Document {
  tenantId: Types.ObjectId;
  kind: FinancialSequenceKind;
  period: string;
  value: number;
}

const FinancialSequenceSchema = new Schema<IFinancialSequenceDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    kind: { type: String, enum: ['PAYMENT', 'RECEIPT', 'REFUND'], required: true },
    period: { type: String, required: true },
    value: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

FinancialSequenceSchema.index({ tenantId: 1, kind: 1, period: 1 }, { unique: true });

export const FinancialSequenceModel = model<IFinancialSequenceDocument>(
  'FinancialSequence',
  FinancialSequenceSchema
);
