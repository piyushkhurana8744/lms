import { Schema, model } from 'mongoose';
const schema = new Schema({ tenantId: { type: Schema.Types.ObjectId, required: true }, key: { type: String, required: true }, revision: { type: Number, default: 0 } }, { timestamps: true }); schema.index({ tenantId: 1, key: 1 }, { unique: true }); export const SchedulingMutexModel = model('SchedulingMutex', schema);
