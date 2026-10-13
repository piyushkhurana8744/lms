import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type AutomationStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type AutomationExecutionStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DEAD_LETTER';
export type AutomationStepStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

const conditionSchema = new Schema({ field: { type: String, required: true }, operator: { type: String, required: true }, value: Schema.Types.Mixed }, { _id: false });
const stepSchema = new Schema({
  stepId: { type: String, required: true },
  type: { type: String, enum: ['ACTION', 'DELAY'], required: true },
  actionType: String,
  inputs: { type: Schema.Types.Mixed, default: {} },
  delaySeconds: Number
}, { _id: false });
const snapshotSchema = new Schema({
  name: { type: String, required: true }, triggerType: { type: String, required: true },
  conditions: { mode: { type: String, enum: ['ALL', 'ANY'], default: 'ALL' }, items: { type: [conditionSchema], default: [] } },
  steps: { type: [stepSchema], default: [] }, branchMode: { type: String, enum: ['ALL', 'SELECTED'], default: 'ALL' },
  branchIds: { type: [Schema.Types.ObjectId], default: [] }, capabilitySnapshot: { type: [String], default: [] }
  ,activationActorId: Schema.Types.ObjectId
}, { _id: false });

export interface IAutomationDocument extends Document {
  tenantId: Types.ObjectId; name: string; description?: string; status: AutomationStatus; version: number;
  triggerType: string; conditions: { mode: 'ALL' | 'ANY'; items: Array<{ field: string; operator: string; value?: unknown }> };
  steps: Array<{ stepId: string; type: 'ACTION' | 'DELAY'; actionType?: string; inputs?: Record<string, unknown>; delaySeconds?: number }>;
  branchMode: 'ALL' | 'SELECTED'; branchIds: Types.ObjectId[]; capabilitySnapshot: string[];
  createdBy: Types.ObjectId; updatedBy: Types.ObjectId; publishedAt?: Date; archivedAt?: Date;
}
const automationSchema = new Schema<IAutomationDocument>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 1000 }, status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'DRAFT' },
  version: { type: Number, default: 0 }, triggerType: { type: String, required: true },
  conditions: { mode: { type: String, enum: ['ALL', 'ANY'], default: 'ALL' }, items: { type: [conditionSchema], default: [] } },
  steps: { type: [stepSchema], default: [] }, branchMode: { type: String, enum: ['ALL', 'SELECTED'], default: 'ALL' },
  branchIds: { type: [Schema.Types.ObjectId], default: [] }, capabilitySnapshot: { type: [String], default: [] },
  createdBy: { type: Schema.Types.ObjectId, required: true }, updatedBy: { type: Schema.Types.ObjectId, required: true }, publishedAt: Date, archivedAt: Date
}, { timestamps: true });
automationSchema.index({ tenantId: 1, status: 1, triggerType: 1, updatedAt: -1 });
automationSchema.index({ tenantId: 1, name: 1 });
automationSchema.plugin(tenantIsolationPlugin);
export const AutomationModel = model<IAutomationDocument>('Automation', automationSchema);

export interface IAutomationEventDocument extends Document {
  tenantId: Types.ObjectId; eventId: string; eventType: string; occurredAt: Date; actorId?: Types.ObjectId; resourceType: string; resourceId: string;
  branchId?: Types.ObjectId; correlationId: string; causationId?: string; depth: number; payloadVersion: number; payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'; availableAt: Date; attemptCount: number; leaseUntil?: Date; lastError?: string;
}
const automationEventSchema = new Schema<IAutomationEventDocument>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true }, eventId: { type: String, required: true }, eventType: { type: String, required: true },
  occurredAt: { type: Date, required: true }, actorId: Schema.Types.ObjectId, resourceType: { type: String, required: true }, resourceId: { type: String, required: true },
  branchId: Schema.Types.ObjectId, correlationId: { type: String, required: true }, causationId: String, depth: { type: Number, default: 0 }, payloadVersion: { type: Number, default: 1 },
  payload: { type: Schema.Types.Mixed, required: true }, status: { type: String, enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'], default: 'PENDING' },
  availableAt: { type: Date, default: Date.now }, attemptCount: { type: Number, default: 0 }, leaseUntil: Date, lastError: { type: String, maxlength: 500 }
}, { timestamps: true });
automationEventSchema.index({ eventId: 1 }, { unique: true });
automationEventSchema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
automationEventSchema.plugin(tenantIsolationPlugin);
export const AutomationEventModel = model<IAutomationEventDocument>('AutomationEvent', automationEventSchema);

export interface IAutomationExecutionDocument extends Document {
  tenantId: Types.ObjectId; automationId: Types.ObjectId; automationVersion: number; triggerEventId: string; triggerType: string; resourceType: string; resourceId: string;
  branchId?: Types.ObjectId; status: AutomationExecutionStatus; currentStep: number; snapshot: Record<string, unknown>; context: Record<string, unknown>;
  correlationId: string; causationId?: string; depth: number; replayOfExecutionId?: Types.ObjectId; replayedBy?: Types.ObjectId;
  startedAt?: Date; completedAt?: Date; failedAt?: Date; nextRunAt?: Date; error?: { category: string; message: string };
}
const executionSchema = new Schema<IAutomationExecutionDocument>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true }, automationId: { type: Schema.Types.ObjectId, required: true }, automationVersion: { type: Number, required: true },
  triggerEventId: { type: String, required: true }, triggerType: { type: String, required: true }, resourceType: String, resourceId: String, branchId: Schema.Types.ObjectId,
  status: { type: String, enum: ['PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'], default: 'PENDING' }, currentStep: { type: Number, default: 0 },
  snapshot: { type: snapshotSchema, required: true }, context: { type: Schema.Types.Mixed, required: true }, correlationId: { type: String, required: true }, causationId: String, depth: { type: Number, default: 0 },
  replayOfExecutionId: Schema.Types.ObjectId, replayedBy: Schema.Types.ObjectId, startedAt: Date, completedAt: Date, failedAt: Date, nextRunAt: Date,
  error: { category: String, message: { type: String, maxlength: 500 } }
}, { timestamps: true });
executionSchema.index({ tenantId: 1, triggerEventId: 1, automationId: 1, automationVersion: 1 }, { unique: true });
executionSchema.index({ tenantId: 1, automationId: 1, status: 1, createdAt: -1 });
executionSchema.index({ status: 1, nextRunAt: 1 });
executionSchema.plugin(tenantIsolationPlugin);
export const AutomationExecutionModel = model<IAutomationExecutionDocument>('AutomationExecution', executionSchema);

export interface IAutomationStepExecutionDocument extends Document { tenantId: Types.ObjectId; executionId: Types.ObjectId; stepId: string; stepIndex: number; actionType?: string; status: AutomationStepStatus; attemptCount: number; idempotencyKey: string; startedAt?: Date; completedAt?: Date; nextAttemptAt?: Date; error?: { category: string; message: string }; result?: Record<string, unknown>; }
const stepExecutionSchema = new Schema<IAutomationStepExecutionDocument>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true }, executionId: { type: Schema.Types.ObjectId, required: true }, stepId: { type: String, required: true }, stepIndex: { type: Number, required: true }, actionType: String,
  status: { type: String, enum: ['PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'PENDING' }, attemptCount: { type: Number, default: 0 }, idempotencyKey: { type: String, required: true },
  startedAt: Date, completedAt: Date, nextAttemptAt: Date, error: { category: String, message: { type: String, maxlength: 500 } }, result: Schema.Types.Mixed
}, { timestamps: true });
stepExecutionSchema.index({ executionId: 1, stepId: 1 }, { unique: true });
stepExecutionSchema.index({ status: 1, nextAttemptAt: 1 });
stepExecutionSchema.plugin(tenantIsolationPlugin);
export const AutomationStepExecutionModel = model<IAutomationStepExecutionDocument>('AutomationStepExecution', stepExecutionSchema);
