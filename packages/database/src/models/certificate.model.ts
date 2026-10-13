import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type CertificateStatus = 'ISSUED' | 'REVOKED';
export type CertificateArtifactStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface ICertificateDocument extends Document {
  tenantId: Types.ObjectId; certificateNumber: string; verificationCode: string;
  studentId: Types.ObjectId; enrollmentId: Types.ObjectId; courseId: Types.ObjectId;
  status: CertificateStatus; issuedAt: Date; issuedBy: Types.ObjectId;
  revokedAt?: Date; revokedBy?: Types.ObjectId; revocationReason?: string;
  eligibilitySnapshot: { enrollmentStatus: string; progressPercent: number; completedAt: Date };
  credentialSnapshot: { studentName: string; courseTitle: string; organizationName: string; completionDate: Date; issueDate: Date };
  artifact: { status: CertificateArtifactStatus; storageProvider?: string; storageKey?: string; mimeType?: string; sizeBytes?: number; generatedAt?: Date; lastError?: string; retryCount: number; leaseUntil?: Date };
}

const schema = new Schema<ICertificateDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  certificateNumber: { type: String, required: true }, verificationCode: { type: String, required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  status: { type: String, enum: ['ISSUED', 'REVOKED'], default: 'ISSUED', required: true, index: true },
  issuedAt: { type: Date, required: true }, issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  revokedAt: Date, revokedBy: { type: Schema.Types.ObjectId, ref: 'User' }, revocationReason: { type: String, maxlength: 500 },
  eligibilitySnapshot: { enrollmentStatus: { type: String, required: true }, progressPercent: { type: Number, required: true }, completedAt: { type: Date, required: true } },
  credentialSnapshot: { studentName: { type: String, required: true }, courseTitle: { type: String, required: true }, organizationName: { type: String, required: true }, completionDate: { type: Date, required: true }, issueDate: { type: Date, required: true } },
  artifact: { status: { type: String, enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'], default: 'PENDING' }, storageProvider: String, storageKey: String, mimeType: String, sizeBytes: Number, generatedAt: Date, lastError: { type: String, maxlength: 500 }, retryCount: { type: Number, default: 0 }, leaseUntil: Date }
}, { timestamps: true });
schema.index({ tenantId: 1, certificateNumber: 1 }, { unique: true });
schema.index({ verificationCode: 1 }, { unique: true });
schema.index({ tenantId: 1, enrollmentId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'ISSUED' } });
schema.index({ tenantId: 1, studentId: 1, issuedAt: -1 }); schema.index({ tenantId: 1, courseId: 1, issuedAt: -1 }); schema.index({ tenantId: 1, status: 1, issuedAt: -1 });
schema.plugin(tenantIsolationPlugin);
export const CertificateModel = model<ICertificateDocument>('Certificate', schema);
