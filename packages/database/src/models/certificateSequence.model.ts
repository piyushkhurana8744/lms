import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
interface ICertificateSequence extends Document { tenantId: Types.ObjectId; year: number; value: number }
const schema = new Schema<ICertificateSequence>({ tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true }, year: { type: Number, required: true }, value: { type: Number, required: true, default: 0 } }, { timestamps: true });
schema.index({ tenantId: 1, year: 1 }, { unique: true }); schema.plugin(tenantIsolationPlugin);
export const CertificateSequenceModel = model<ICertificateSequence>('CertificateSequence', schema);
