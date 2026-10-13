import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
export interface IAcademicCalendarDocument extends Document { tenantId: Types.ObjectId; name: string; timezone: string; startDate: Date; endDate: Date; workingDays: number[]; status: 'ACTIVE'|'ARCHIVED'; createdAt: Date; updatedAt: Date; }
const schema = new Schema<IAcademicCalendarDocument>({ tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true }, name: { type: String, required: true, trim: true }, timezone: { type: String, required: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, workingDays: [{ type: Number, min: 1, max: 7 }], status: { type: String, enum: ['ACTIVE','ARCHIVED'], default: 'ACTIVE' } }, { timestamps: true });
schema.index({ tenantId: 1, status: 1 }); schema.plugin(tenantIsolationPlugin);
export const AcademicCalendarModel = model<IAcademicCalendarDocument>('AcademicCalendar', schema);
