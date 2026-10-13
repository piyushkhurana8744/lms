import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IStudentSequenceDocument extends Document {
  tenantId: Types.ObjectId;
  year: number;
  value: number;
}

const StudentSequenceSchema = new Schema<IStudentSequenceDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  year: { type: Number, required: true },
  value: { type: Number, default: 0 }
});

StudentSequenceSchema.index({ tenantId: 1, year: 1 }, { unique: true });
StudentSequenceSchema.plugin(tenantIsolationPlugin);

export const StudentSequenceModel = model<IStudentSequenceDocument>(
  'StudentSequence',
  StudentSequenceSchema
);
