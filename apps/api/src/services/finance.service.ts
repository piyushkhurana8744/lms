import { ClientSession, Types } from 'mongoose';
import crypto from 'crypto';
import {
  FeeStructureModel,
  StudentFeePlanModel,
  PaymentModel,
  FinancialLedgerModel,
  ReceiptModel,
  RefundModel,
  PaymentGatewayConfigModel,
  FinancialSequenceModel,
  runInTransaction,
  PaymentWebhookEventModel,
  OutboxEventModel,
  isDatabaseTransactionCapable,
  UserModel,
  CourseModel,
  BatchModel,
  BranchModel,
  AdmissionModel,
  TenantModel,
  OrganizationBrandingModel,
  IFeeStructureDocument,
  IStudentFeePlanDocument,
  IPaymentDocument,
  IReceiptDocument,
  IRefundDocument,
  PaymentMethod,
  DiscountType,
  InstallmentStatus,
  LedgerEntryType
} from '@edtech/database';
import {
  tenantContextStorage,
  toMinorUnits,
  fromMinorUnits,
  calculatePercentageDiscount,
  formatCurrency,
  logger
} from '@edtech/utils';
import {
  CreateFeeStructurePayload,
  UpdateFeeStructurePayload,
  CreateStudentFeePlanPayload,
  RecordManualPaymentPayload,
  CreateOnlineOrderPayload,
  VerifyOnlinePaymentPayload,
  RequestRefundPayload,
  FeePlanFilterQuery,
  PaymentFilterQuery,
  DueFilterQuery,
  FinanceDashboardSummary,
  IPaymentGatewayConfig
} from '@edtech/types';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../errors/appError';
import { AuditService } from './audit.service';
import { SecretEncryptionService } from './security/secretEncryption.service';
import { PaymentProviderFactory } from './payment/paymentProviderFactory';
import { getRedisClient, getRedisState } from '../config/redis';
import { financeCheckpoint } from './financeFailureInjection';
import { BranchAccessService, BranchActor } from './branchAccess.service';

export class FinanceService {
  private static async financeBranchFilter(tenantId: string, actor?: BranchActor) {
    if (!actor) return {};
    const scope = await BranchAccessService.getScope(tenantId, actor);
    return scope.mode === 'ALL' ? {} : { branchId: { $in: scope.branchIds.map((id) => new Types.ObjectId(id)) } };
  }

  private static async assertFinanceRecordBranch(tenantId: string, branchId: any, actor?: BranchActor) {
    if (actor && branchId) await BranchAccessService.assertBranchAccess(tenantId, actor, branchId.toString(), { requireActive: true });
  }

  private static async resolveFinanceBranch(tenantId: string, source: { branchId?: string | Types.ObjectId | null; batchId?: string | Types.ObjectId | null; admissionId?: string | Types.ObjectId | null; feeStructureId?: string | Types.ObjectId | null }, session?: ClientSession): Promise<Types.ObjectId | undefined> {
    if (source.feeStructureId) {
      const structure = await FeeStructureModel.findOne({ _id: source.feeStructureId, tenantId }).select('branchId').session(session || null).lean();
      if (structure?.branchId) return structure.branchId as Types.ObjectId;
    }
    if (source.admissionId) {
      const admission = await AdmissionModel.findOne({ _id: source.admissionId, tenantId }).select('branchId').session(session || null).lean();
      if (admission?.branchId) return admission.branchId as Types.ObjectId;
    }
    if (source.batchId) {
      const batch = await BatchModel.findOne({ _id: source.batchId, tenantId }).select('branchId').session(session || null).lean();
      if (batch?.branchId) return batch.branchId as Types.ObjectId;
    }
    if (source.branchId) {
      if (!Types.ObjectId.isValid(String(source.branchId))) throw new BadRequestError('Invalid branch');
      const branch = await BranchModel.findOne({ _id: source.branchId, tenantId, status: 'ACTIVE' }).select('_id').session(session || null).lean();
      if (!branch) throw new NotFoundError('Branch not found');
      return branch._id as Types.ObjectId;
    }
    return undefined;
  }

  public static async getFinanceOperations() {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    const staleBefore = new Date(Date.now() - 15 * 60_000);
    const [failedWebhooks, failedOutbox, stalePayments, staleRefunds, reconciliationAnomalies, failedReceiptArtifacts] = await Promise.all([
      PaymentWebhookEventModel.find({ tenantId, status: 'FAILED' }).select('providerEventId eventType attemptCount lastError updatedAt').sort({ updatedAt: -1 }).limit(50).lean(),
      OutboxEventModel.find({ tenantId, status: 'FAILED' }).select('eventId eventType attemptCount lastError availableAt updatedAt').sort({ updatedAt: -1 }).limit(50).lean(),
      PaymentModel.find({ tenantId, status: 'PENDING', createdAt: { $lte: staleBefore } }).select('paymentNumber gatewayProvider gatewayOrderId createdAt').sort({ createdAt: 1 }).limit(50).lean(),
      RefundModel.find({ tenantId, status: 'PROCESSING', createdAt: { $lte: staleBefore } }).select('refundNumber gatewayProvider gatewayRefundId createdAt').sort({ createdAt: 1 }).limit(50).lean(),
      PaymentModel.find({ tenantId, reconciliationAnomaly: { $exists: true, $ne: '' } }).select('paymentNumber reconciliationAnomaly reconciliationAttempts updatedAt').limit(50).lean(),
      ReceiptModel.find({ tenantId, 'artifact.status': 'FAILED' }).select('receiptNumber artifact updatedAt').limit(50).lean()
    ]);
    return { failedWebhooks, failedOutbox, stalePayments, staleRefunds, reconciliationAnomalies, failedReceiptArtifacts, staleThresholdMinutes: 15 };
  }
  public static async getFinanceReadiness(tenantId?: string) {
    const resolvedTenantId = tenantId || tenantContextStorage.getStore()?.currentTenantId;
    if (!resolvedTenantId) throw new Error('Tenant context required');
    const config = await PaymentGatewayConfigModel.findOne({ tenantId: resolvedTenantId });
    let workerHeartbeat = false;
    let reconciliationHeartbeat = false;
    if (getRedisState() === 'connected') {
      try {
        const heartbeat = Number(await getRedisClient().get('finance:worker:heartbeat'));
        workerHeartbeat = Number.isFinite(heartbeat) && Date.now() - heartbeat < 45_000;
        const reconciliation = Number(await getRedisClient().get('finance:reconciliation:heartbeat'));
        reconciliationHeartbeat = Number.isFinite(reconciliation) && Date.now() - reconciliation < 90_000;
      } catch {
        workerHeartbeat = false;
      }
    }
    const checks = {
      transactions: isDatabaseTransactionCapable(),
      redis: getRedisState() === 'connected',
      workerHeartbeat,
      reconciliationHeartbeat,
      gatewayEnabled: Boolean(config?.isEnabled),
      credentials: Boolean(config?.razorpay?.keyId && config?.razorpay?.keySecretEncrypted),
      webhookSecret: Boolean(config?.razorpay?.webhookSecretEncrypted),
      encryptionKey: process.env.NODE_ENV !== 'production' || Boolean(process.env.STORAGE_ENCRYPTION_KEY)
    };
    return { ready: Object.values(checks).every(Boolean), checks };
  }

  private static async assertOnlineFinanceReady(tenantId: string) {
    const readiness = await this.getFinanceReadiness(tenantId);
    if (!readiness.ready) throw new ConflictError('Online finance is not production-ready', readiness.checks);
  }
  private static async writeOutbox(
    session: ClientSession,
    event: { tenantId: string; eventId: string; eventType: 'payment.success' | 'receipt.generated' | 'payment.reversed' | 'refund.success'; aggregateType: 'Payment' | 'Receipt' | 'Refund'; aggregateId: Types.ObjectId; payload: Record<string, unknown> }
  ) {
    await OutboxEventModel.create([{ ...event, status: 'PENDING', availableAt: new Date(), attemptCount: 0 }], { session });
  }
  public static async reconcilePayment(paymentId: string, actorId: string, actor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    const payment = await PaymentModel.findOne({ _id: paymentId, tenantId });
    if (!payment || payment.gatewayProvider !== 'RAZORPAY' || !payment.gatewayOrderId) throw new NotFoundError('Reconciliable payment not found');
    await this.assertFinanceRecordBranch(tenantId, payment.branchId, actor);
    const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
    const details = payment.gatewayPaymentId ? await provider.fetchPayment(payment.gatewayPaymentId) : await provider.fetchPaymentForOrder(payment.gatewayOrderId);
    if (!details) return { success: false, status: 'UNRESOLVED', paymentNumber: payment.paymentNumber };
    if (details.status === 'CAPTURED') return this.finalizeSuccessfulPayment(paymentId, details, actorId);
    if (details.status === 'FAILED' && payment.status === 'PENDING') {
      payment.status = 'FAILED'; payment.notes = 'Provider reconciliation reported payment failed'; await payment.save();
    }
    return { success: false, status: details.status, paymentNumber: payment.paymentNumber };
  }

  public static async reconcileRefund(refundId: string, actorId: string, actor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    const refund = await RefundModel.findOne({ _id: refundId, tenantId });
    if (!refund || refund.gatewayProvider !== 'RAZORPAY') throw new NotFoundError('Reconciliable refund not found');
    await this.assertFinanceRecordBranch(tenantId, refund.branchId, actor);
    const payment = await PaymentModel.findOne({ _id: refund.paymentId, tenantId });
    if (!payment?.gatewayPaymentId) throw new ConflictError('Provider payment reference is missing');
    const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
    let details;
    if (refund.gatewayRefundId) {
      details = await provider.fetchRefund(refund.gatewayRefundId);
    } else {
      details = await provider.findRefund(payment.gatewayPaymentId, refund.refundNumber);
      if (!details) return refund;
      refund.gatewayRefundId = details.refundId;
      await refund.save();
    }
    if (details.amountMinor !== refund.amountMinor) throw new ConflictError('Provider refund amount mismatch requires manual review');
    if (details.paymentId !== payment.gatewayPaymentId) throw new ConflictError('Provider refund payment mismatch requires manual review');
    if (details.status === 'PROCESSED') return this.finalizeRefund(refundId, actorId);
    if (details.status === 'FAILED') {
      return runInTransaction(async (session) => {
        const currentRefund = await RefundModel.findOne({ _id: refund._id, tenantId }).session(session);
        if (!currentRefund || currentRefund.status !== 'PROCESSING') return currentRefund || refund;
        const payment = await PaymentModel.findOne({ _id: currentRefund.paymentId, tenantId }).session(session);
        if (!payment || payment.reservedRefundAmountMinor < currentRefund.amountMinor) throw new ConflictError('Refund reservation is missing');
        payment.reservedRefundAmountMinor -= currentRefund.amountMinor;
        currentRefund.status = 'FAILED';
        currentRefund.failureReason = 'Provider reconciliation reported refund failed';
        await payment.save({ session });
        await currentRefund.save({ session });
        return currentRefund;
      });
    }
    return refund;
  }
  public static async reverseManualPayment(paymentId: string, reason: string, actorId: string, actor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    return runInTransaction(async (session) => {
      const payment = await PaymentModel.findOne({ _id: paymentId, tenantId }).session(session);
      if (!payment) throw new NotFoundError('Payment not found');
      await this.assertFinanceRecordBranch(tenantId, payment.branchId, actor);
      if (payment.status === 'REVERSED') return payment;
      if (payment.gatewayProvider !== 'MANUAL' || payment.method === 'ONLINE_GATEWAY') throw new BadRequestError('Online payments must use refund semantics');
      if (payment.status !== 'SUCCESS' || payment.refundedAmountMinor > 0 || payment.reservedRefundAmountMinor > 0) throw new ConflictError('Payment cannot be reversed in its current state');
      const feePlan = await StudentFeePlanModel.findOne({ _id: payment.studentFeePlanId, tenantId }).session(session);
      if (!feePlan) throw new NotFoundError('Fee plan not found');
      for (const allocation of payment.allocations) {
        const installment: any = feePlan.installments.find((item: any) => item._id?.toString() === allocation.installmentId?.toString());
        if (!installment || installment.paidAmountMinor < allocation.amountMinor) throw new ConflictError('Allocation history cannot be safely reversed');
        installment.paidAmountMinor -= allocation.amountMinor;
        installment.paidAt = undefined;
        installment.status = installment.paidAmountMinor > 0 ? 'PARTIALLY_PAID' : (installment.dueDate < new Date() ? 'DUE' : 'UPCOMING');
      }
      financeCheckpoint('REVERSAL_AFTER_ALLOCATION_UNDO');
      feePlan.paidAmountMinor -= payment.amountMinor;
      feePlan.outstandingBalanceMinor += payment.amountMinor;
      feePlan.status = 'ACTIVE';
      financeCheckpoint('REVERSAL_AFTER_FEE_PLAN');
      payment.status = 'REVERSED'; payment.reversedAt = new Date(); payment.reversedBy = new Types.ObjectId(actorId); payment.reversalReason = reason;
      financeCheckpoint('REVERSAL_AFTER_PAYMENT_STATE');
      await feePlan.save({ session }); await payment.save({ session });
      await ReceiptModel.updateOne({ tenantId, paymentId: payment._id }, { $set: { status: 'CANCELLED' } }, { session });
      financeCheckpoint('REVERSAL_AFTER_RECEIPT_CANCEL');
      await FinancialLedgerModel.create([{ tenantId, studentUserId: payment.studentUserId, studentFeePlanId: feePlan._id, paymentId: payment._id, branchId: feePlan.branchId, entryType: 'REVERSAL', description: `Manual payment reversed: ${reason}`, amountMinor: payment.amountMinor, currency: payment.currency, isDebit: true, runningBalanceMinor: feePlan.outstandingBalanceMinor, actorId: new Types.ObjectId(actorId) }], { session });
      financeCheckpoint('REVERSAL_AFTER_LEDGER');
      await this.writeOutbox(session, { tenantId, eventId: `payment.reversed:${payment._id}`, eventType: 'payment.reversed', aggregateType: 'Payment', aggregateId: payment._id, payload: { paymentId: payment._id.toString(), paymentNumber: payment.paymentNumber, studentUserId: payment.studentUserId.toString(), amountMinor: payment.amountMinor, currency: payment.currency } });
      financeCheckpoint('REVERSAL_AFTER_OUTBOX');
      return payment;
    });
  }
  public static async processRazorpayWebhook(rawBody: Buffer, signature: string, providerEventId?: string) {
    let event: any;
    try { event = JSON.parse(rawBody.toString('utf8')); } catch { throw new BadRequestError('Invalid webhook JSON'); }
    const eventId = String(providerEventId || event?.id || event?.event_id || crypto.createHash('sha256').update(rawBody).digest('hex'));
    const eventType = String(event?.event || '');
    if (!eventId || !eventType) throw new BadRequestError('Webhook event identity is missing');

    const entity = event?.payload?.payment?.entity;
    const refundEntity = event?.payload?.refund?.entity;
    const orderId = entity?.order_id;
    const providerRefundId = refundEntity?.id;
    const payment = orderId
      ? await PaymentModel.findOne({ gatewayProvider: 'RAZORPAY', gatewayOrderId: orderId }).setOptions({ bypassTenantFilter: true })
      : providerRefundId
        ? await RefundModel.findOne({ gatewayProvider: 'RAZORPAY', gatewayRefundId: providerRefundId }).setOptions({ bypassTenantFilter: true })
        : null;
    if (!payment) throw new NotFoundError('Webhook does not reference a known internal transaction');
    const related: any = payment;
    const tenantId = related.tenantId.toString();

    return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: 'webhook', isPlatformContext: false, allowedTenantIds: [tenantId] }, async () => {
      const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
      if (!provider.verifyWebhookSignature(rawBody.toString('utf8'), signature)) throw new ForbiddenError('Invalid webhook signature');
      let inbox: any;
      try {
        inbox = await PaymentWebhookEventModel.create({ tenantId, provider: 'RAZORPAY', providerEventId: eventId, eventType, status: 'PROCESSING', attemptCount: 1, paymentId: orderId ? related._id : undefined, refundId: providerRefundId ? related._id : undefined });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        inbox = await PaymentWebhookEventModel.findOne({ provider: 'RAZORPAY', providerEventId: eventId });
        if (inbox?.status === 'PROCESSED') return { processed: true, duplicate: true };
        inbox.status = 'PROCESSING'; inbox.attemptCount += 1; inbox.lastError = undefined; await inbox.save();
      }
      try {
        if (eventType === 'payment.captured') {
          const details = await provider.fetchPayment(entity.id);
          await this.finalizeSuccessfulPayment(related._id.toString(), details, related.studentUserId.toString());
        } else if (eventType === 'refund.processed') {
          await this.finalizeRefund(related._id.toString(), related.requestedBy.toString());
        } else {
          throw new BadRequestError(`Unsupported webhook event: ${eventType}`);
        }
        inbox.status = 'PROCESSED'; inbox.processedAt = new Date(); await inbox.save();
        return { processed: true, duplicate: false };
      } catch (error: any) {
        inbox.status = 'FAILED'; inbox.lastError = String(error?.message || 'Webhook processing failed').slice(0, 500); await inbox.save();
        throw error;
      }
    });
  }
  /**
   * Helper: Generate a tenant-scoped concurrency-safe Payment Number (e.g. PAY-2026-0001)
   */
  private static async generateFinancialNumber(
    tenantId: string,
    kind: 'PAYMENT' | 'RECEIPT' | 'REFUND',
    session?: ClientSession
  ): Promise<string> {
    const period = String(new Date().getFullYear());
    const counter = await FinancialSequenceModel.findOneAndUpdate(
      { tenantId, kind, period },
      { $inc: { value: 1 }, $setOnInsert: { tenantId, kind, period } },
      { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );
    const prefix = kind === 'PAYMENT' ? 'PAY' : kind === 'RECEIPT' ? 'RCPT' : 'RFND';
    return `${prefix}-${period}-${String(counter.value).padStart(6, '0')}`;
  }

  private static generatePaymentNumber(tenantId: string, session?: ClientSession): Promise<string> {
    return this.generateFinancialNumber(tenantId, 'PAYMENT', session);
  }

  /**
   * Helper: Generate a tenant-scoped concurrency-safe Receipt Number (e.g. RCPT-2026-0001)
   */
  private static async generateReceiptNumber(tenantId: string, session?: ClientSession): Promise<string> {
    return this.generateFinancialNumber(tenantId, 'RECEIPT', session);
  }

  /**
   * Helper: Generate Refund Number (e.g. RFND-2026-0001)
   */
  private static async generateRefundNumber(tenantId: string, session?: ClientSession): Promise<string> {
    return this.generateFinancialNumber(tenantId, 'REFUND', session);
  }

  // ==========================================
  // 1. FEE STRUCTURES (TEMPLATES)
  // ==========================================

  public static async createFeeStructure(payload: CreateFeeStructurePayload, actorId: string, actor?: BranchActor): Promise<IFeeStructureDocument> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const course = await CourseModel.findOne({ _id: payload.courseId, tenantId });
    if (!course) throw new NotFoundError('Target course not found in this organization');
    const branchId = await this.resolveFinanceBranch(tenantId, { batchId: payload.batchId, branchId: payload.branchId });
    await this.assertFinanceRecordBranch(tenantId, branchId, actor);

    // Calculate sum of components in integer minor units
    let calculatedTotalMinor = 0;
    for (const comp of payload.components) {
      if (comp.amountMinor < 0) throw new BadRequestError('Fee component amount cannot be negative');
      calculatedTotalMinor += comp.amountMinor;
    }

    if (calculatedTotalMinor <= 0) {
      throw new BadRequestError('Total fee structure amount must be greater than zero');
    }

    const templates = payload.installmentTemplates || [];
    if (templates.length > 0) {
      const sequences = new Set(templates.map((template) => template.sequence));
      if (sequences.size !== templates.length) {
        throw new BadRequestError('Installment template sequences must be unique');
      }
      const usesFixed = templates.some((template) => template.amountMinor !== undefined);
      const usesPercentage = templates.some((template) => template.percentage !== undefined);
      if (usesFixed === usesPercentage) {
        throw new BadRequestError('Installment templates must use either all fixed amounts or all percentages');
      }
      if (usesFixed && templates.reduce((sum, template) => sum + (template.amountMinor || 0), 0) !== calculatedTotalMinor) {
        throw new BadRequestError('Fixed installment templates must total the fee structure amount');
      }
      if (usesPercentage && Math.abs(templates.reduce((sum, template) => sum + (template.percentage || 0), 0) - 100) > 0.000001) {
        throw new BadRequestError('Percentage installment templates must total 100%');
      }
    }

    const structure = await FeeStructureModel.create({
      tenantId,
      name: payload.name.trim(),
      code: payload.code?.trim(),
      courseId: new Types.ObjectId(payload.courseId),
      batchId: payload.batchId ? new Types.ObjectId(payload.batchId) : null,
      branchId,
      currency: payload.currency?.trim() || 'INR',
      totalAmountMinor: calculatedTotalMinor,
      components: payload.components,
      installmentTemplates: templates,
      status: 'ACTIVE',
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId)
    });

      await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'FEE_STRUCTURE_CREATED',
      resource: 'FeeStructure',
      resourceId: structure._id.toString(),
      metadata: { name: structure.name, totalAmountMinor: calculatedTotalMinor }
    });

    return structure;
  }

  public static async listFeeStructures(courseId?: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const query: any = { tenantId };
    if (courseId) query.courseId = courseId;

    return FeeStructureModel.find(query)
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .sort({ createdAt: -1 })
      .lean();
  }

  public static async getFeeStructureById(id: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const structure = await FeeStructureModel.findOne({ _id: id, tenantId })
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .lean();

    if (!structure) throw new NotFoundError('Fee structure not found');
    return structure;
  }

  // ==========================================
  // 2. STUDENT FEE PLANS (CONTRACTUAL SNAPSHOTS)
  // ==========================================

  public static async createStudentFeePlan(payload: CreateStudentFeePlanPayload, actorId: string, actor?: BranchActor): Promise<IStudentFeePlanDocument> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const student = await UserModel.findOne({ _id: payload.studentUserId, tenantId });
    if (!student) throw new NotFoundError('Student identity not found in this organization');

    const course = await CourseModel.findOne({ _id: payload.courseId, tenantId });
    if (!course) throw new NotFoundError('Course not found');

    const feeStructure = payload.feeStructureId
      ? await FeeStructureModel.findOne({ _id: payload.feeStructureId, tenantId, status: 'ACTIVE' }).lean()
      : null;
    if (payload.feeStructureId && !feeStructure) throw new NotFoundError('Active fee structure not found');
    if (feeStructure && feeStructure.courseId.toString() !== payload.courseId) {
      throw new BadRequestError('Fee structure does not belong to the selected course');
    }
    const baseAmountMinor = feeStructure?.totalAmountMinor ?? payload.baseAmountMinor;
    const currency = feeStructure?.currency ?? payload.currency ?? 'INR';
    if (feeStructure && payload.baseAmountMinor !== baseAmountMinor) {
      throw new BadRequestError('Base amount must match the selected fee structure');
    }
    const branchId = await this.resolveFinanceBranch(tenantId, {
      feeStructureId: payload.feeStructureId,
      admissionId: payload.admissionId,
      batchId: payload.batchId,
      branchId: payload.branchId
    });
    await this.assertFinanceRecordBranch(tenantId, branchId, actor);

    // 1. Calculate discount in integer minor units
    let discountAmountMinor = 0;
    if (payload.discountType && payload.discountValue) {
      if (payload.discountType === 'PERCENTAGE') {
        discountAmountMinor = calculatePercentageDiscount(baseAmountMinor, payload.discountValue);
      } else {
        discountAmountMinor = Math.min(baseAmountMinor, Math.round(payload.discountValue));
      }
    }

    const netPayableMinor = Math.max(0, baseAmountMinor - discountAmountMinor);

    // 2. Generate or validate installments
    let installments: any[] = [];
    if (payload.installments && payload.installments.length > 0) {
      const sequences = new Set(payload.installments.map((installment) => installment.sequence));
      if (sequences.size !== payload.installments.length) {
        throw new BadRequestError('Installment sequences must be unique');
      }
      let sumInstallments = 0;
      installments = [...payload.installments].sort((a, b) => {
        const dateDifference = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return dateDifference || a.sequence - b.sequence;
      }).map((inst, index) => {
        sumInstallments += inst.amountMinor;
        return {
          sequence: inst.sequence || index + 1,
          label: inst.label,
          dueDate: new Date(inst.dueDate),
          amountMinor: inst.amountMinor,
          paidAmountMinor: 0,
          status: new Date(inst.dueDate) < new Date() ? 'DUE' : 'UPCOMING'
        };
      });

      if (sumInstallments !== netPayableMinor) {
        throw new BadRequestError(
          `Sum of installments (${formatCurrency(sumInstallments)}) does not match net payable amount (${formatCurrency(netPayableMinor)})`
        );
      }
    } else if (netPayableMinor > 0) {
      // Default to single full-payment installment due today
      installments = [
        {
          sequence: 1,
          label: 'Full Course Fee',
          dueDate: new Date(),
          amountMinor: netPayableMinor,
          paidAmountMinor: 0,
          status: 'DUE'
        }
      ];
    }

    // 3. Create the contractual StudentFeePlan snapshot
    const feePlan = await StudentFeePlanModel.create({
      tenantId,
      studentUserId: new Types.ObjectId(payload.studentUserId),
      admissionId: payload.admissionId ? new Types.ObjectId(payload.admissionId) : null,
      enrollmentId: payload.enrollmentId ? new Types.ObjectId(payload.enrollmentId) : null,
      courseId: new Types.ObjectId(payload.courseId),
      batchId: payload.batchId ? new Types.ObjectId(payload.batchId) : null,
      branchId,
      feeStructureId: payload.feeStructureId ? new Types.ObjectId(payload.feeStructureId) : null,
      feeStructureSnapshot: feeStructure ? {
        name: feeStructure.name,
        code: feeStructure.code,
        totalAmountMinor: feeStructure.totalAmountMinor,
        components: feeStructure.components.map((component) => ({
          name: component.name,
          type: component.type,
          amountMinor: component.amountMinor,
          isRefundable: component.isRefundable
        })),
        capturedAt: new Date()
      } : undefined,
      currency,
      baseAmountMinor,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      discountAmountMinor,
      discountReason: payload.discountReason,
      discountApprovedBy: discountAmountMinor > 0 ? new Types.ObjectId(actorId) : null,
      discountApprovedAt: discountAmountMinor > 0 ? new Date() : null,
      netPayableMinor,
      paidAmountMinor: 0,
      outstandingBalanceMinor: netPayableMinor,
      installments,
      status: netPayableMinor === 0 ? 'FULLY_PAID' : 'ACTIVE',
      notes: payload.notes?.trim(),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId)
    });

    // 4. Initial Ledger Entry (CHARGE)
    await FinancialLedgerModel.create({
      tenantId,
      studentUserId: feePlan.studentUserId,
      studentFeePlanId: feePlan._id,
      branchId: feePlan.branchId,
      entryType: 'CHARGE',
      description: `Course Tuition Charge: ${course.title}`,
      amountMinor: baseAmountMinor,
      currency: feePlan.currency,
      isDebit: true,
      runningBalanceMinor: baseAmountMinor,
      actorId: new Types.ObjectId(actorId)
    });

    // If discount was applied, write DISCOUNT entry to ledger
    if (discountAmountMinor > 0) {
      await FinancialLedgerModel.create({
        tenantId,
        studentUserId: feePlan.studentUserId,
        studentFeePlanId: feePlan._id,
        branchId: feePlan.branchId,
        entryType: 'DISCOUNT',
        description: `Approved Fee Concession / Scholarship: ${payload.discountReason || 'Discount Applied'}`,
        amountMinor: discountAmountMinor,
        currency: feePlan.currency,
        isDebit: false,
        runningBalanceMinor: netPayableMinor,
        actorId: new Types.ObjectId(actorId)
      });
    }

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'FEE_PLAN_CREATED',
      resource: 'StudentFeePlan',
      resourceId: feePlan._id.toString(),
      metadata: {
        studentUserId: payload.studentUserId,
        netPayableMinor,
        discountAmountMinor
      }
    });

    return feePlan;
  }

  public static async getStudentFeePlans(filters: FeePlanFilterQuery, actor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { tenantId, ...(await this.financeBranchFilter(tenantId, actor)) };
    if (filters.status && filters.status !== 'ALL') query.status = filters.status;
    if (filters.courseId) query.courseId = filters.courseId;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.branchId) await this.assertFinanceRecordBranch(tenantId, filters.branchId, actor);
    if (filters.hasOutstanding) query.outstandingBalanceMinor = { $gt: 0 };

    const total = await StudentFeePlanModel.countDocuments(query);
    const rawPlans = await StudentFeePlanModel.find(query)
      .populate('studentUserId', 'name email phone avatarUrl')
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const plans = rawPlans.map((p: any) => {
      // Resolve next due installment
      const pendingInstallment = p.installments?.find(
        (inst: any) => inst.status !== 'PAID' && inst.amountMinor > inst.paidAmountMinor
      );

      return {
        id: p._id.toString(),
        student: p.studentUserId
          ? {
              id: p.studentUserId._id.toString(),
              name: p.studentUserId.name,
              email: p.studentUserId.email,
              phone: p.studentUserId.phone
            }
          : undefined,
        course: p.courseId
          ? {
              id: p.courseId._id.toString(),
              title: p.courseId.title
            }
          : undefined,
        batch: p.batchId
          ? {
              id: p.batchId._id.toString(),
              name: p.batchId.name
            }
          : undefined,
        currency: p.currency,
        baseAmountMinor: p.baseAmountMinor,
        discountAmountMinor: p.discountAmountMinor,
        netPayableMinor: p.netPayableMinor,
        paidAmountMinor: p.paidAmountMinor,
        outstandingBalanceMinor: p.outstandingBalanceMinor,
        status: p.status,
        installments: p.installments?.map((inst: any) => ({
          id: inst._id?.toString(),
          sequence: inst.sequence,
          label: inst.label,
          dueDate: inst.dueDate,
          amountMinor: inst.amountMinor,
          paidAmountMinor: inst.paidAmountMinor,
          status: inst.status,
          isOverdue: inst.status !== 'PAID' && new Date(inst.dueDate) < new Date()
        })),
        nextDue: pendingInstallment
          ? {
              dueDate: pendingInstallment.dueDate,
              amountMinor: pendingInstallment.amountMinor - pendingInstallment.paidAmountMinor,
              label: pendingInstallment.label
            }
          : undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    return {
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static async getStudentFeePlanById(id: string, studentUserId?: string, actor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const plan = await StudentFeePlanModel.findOne({ _id: id, tenantId, ...(studentUserId ? { studentUserId } : {}) })
      .populate('studentUserId', 'name email phone avatarUrl')
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .populate('feeStructureId', 'name code')
      .lean();

    if (!plan) throw new NotFoundError('Student fee plan not found');
    await this.assertFinanceRecordBranch(tenantId, plan.branchId, actor);

    const payments = await PaymentModel.find({ tenantId, studentFeePlanId: id })
      .populate('collectedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const ledger = await FinancialLedgerModel.find({ tenantId, studentFeePlanId: id })
      .populate('actorId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const receipts = await ReceiptModel.find({ tenantId, studentFeePlanId: id })
      .sort({ createdAt: -1 })
      .lean();

    return {
      plan,
      payments,
      ledger,
      receipts
    };
  }

  // ==========================================
  // 3. PAYMENT RECORDING & ALLOCATION ENGINE
  // ==========================================

  /**
   * Deterministically allocates funds across scheduled installments in chronological order
   */
  public static allocatePaymentToInstallments(
    installments: any[],
    paymentAmountMinor: number
  ): { updatedInstallments: any[]; allocations: any[] } {
    let unallocatedFunds = paymentAmountMinor;
    const allocations: any[] = [];

    const updatedInstallments = installments.map((inst) => {
      const remainingDue = inst.amountMinor - inst.paidAmountMinor;
      if (unallocatedFunds <= 0 || remainingDue <= 0) {
        return inst;
      }

      const allocatedToThis = Math.min(unallocatedFunds, remainingDue);
      const newPaidAmount = inst.paidAmountMinor + allocatedToThis;
      unallocatedFunds -= allocatedToThis;

      allocations.push({
        installmentId: inst._id,
        amountMinor: allocatedToThis
      });

      return {
        ...inst,
        paidAmountMinor: newPaidAmount,
        status: newPaidAmount >= inst.amountMinor ? ('PAID' as InstallmentStatus) : ('PARTIALLY_PAID' as InstallmentStatus),
        paidAt: newPaidAmount >= inst.amountMinor ? new Date() : inst.paidAt
      };
    });

    return { updatedInstallments, allocations };
  }

  /**
   * Records an authorized manual offline payment (Cash / UPI / Bank Transfer)
   */
  public static async recordManualPayment(
    payload: RecordManualPaymentPayload,
    actorId: string,
    actor?: BranchActor
  ): Promise<{ payment: IPaymentDocument; receipt: IReceiptDocument }> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    try {
      return await runInTransaction(async (session) => {

    if (payload.idempotencyKey) {
      const existing = await PaymentModel.findOne({ tenantId, idempotencyKey: payload.idempotencyKey }).session(session);
      if (existing) {
        if (existing.studentFeePlanId.toString() !== payload.studentFeePlanId || existing.amountMinor !== payload.amountMinor) {
          throw new ConflictError('Idempotency key was already used for a different payment request');
        }
        const receipt = await ReceiptModel.findOne({ tenantId, paymentId: existing._id }).session(session);
        if (!receipt) throw new ConflictError('The original payment request is still being processed');
        return { payment: existing, receipt };
      }
    }

    const feePlan = await StudentFeePlanModel.findOne({ _id: payload.studentFeePlanId, tenantId })
      .populate('studentUserId', 'name email phone')
      .populate('courseId', 'title')
      .session(session);

    if (!feePlan) throw new NotFoundError('Student fee plan not found');
    await this.assertFinanceRecordBranch(tenantId, feePlan.branchId, actor);

    if (feePlan.outstandingBalanceMinor <= 0) {
      throw new BadRequestError('This student fee plan is already fully paid');
    }

    if (payload.amountMinor > feePlan.outstandingBalanceMinor) {
      throw new BadRequestError(
        `Payment amount (${formatCurrency(payload.amountMinor)}) cannot exceed outstanding balance (${formatCurrency(
          feePlan.outstandingBalanceMinor
        )})`
      );
    }

    // 1. Allocate funds across installments
    const { updatedInstallments, allocations } = this.allocatePaymentToInstallments(
      feePlan.installments,
      payload.amountMinor
    );
    allocations.forEach((allocation) => { allocation.studentFeePlanId = feePlan._id; });
    financeCheckpoint('MANUAL_AFTER_ALLOCATION');

    // 2. Create Payment Document
    const paymentNumber = await this.generatePaymentNumber(tenantId, session);
    const [payment] = await PaymentModel.create([{
      tenantId,
      paymentNumber,
      studentUserId: feePlan.studentUserId._id,
      studentFeePlanId: feePlan._id,
      admissionId: feePlan.admissionId,
      enrollmentId: feePlan.enrollmentId,
      branchId: feePlan.branchId,
      amountMinor: payload.amountMinor,
      currency: feePlan.currency,
      method: payload.method,
      status: 'SUCCESS',
      transactionReference: payload.transactionReference?.trim(),
      receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
      collectedBy: new Types.ObjectId(actorId),
      verifiedBy: new Types.ObjectId(actorId),
      verifiedAt: new Date(),
      gatewayProvider: 'MANUAL',
      idempotencyKey: payload.idempotencyKey,
      allocations,
      notes: payload.notes?.trim(),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId)
    }], { session });

    // 3. Update Fee Plan Balances
    const newPaidAmount = feePlan.paidAmountMinor + payload.amountMinor;
    const newOutstanding = Math.max(0, feePlan.netPayableMinor - newPaidAmount);

    feePlan.paidAmountMinor = newPaidAmount;
    feePlan.outstandingBalanceMinor = newOutstanding;
    feePlan.installments = updatedInstallments as any;
    feePlan.status = newOutstanding === 0 ? 'FULLY_PAID' : 'ACTIVE';
    feePlan.updatedBy = new Types.ObjectId(actorId);
    await feePlan.save({ session });
    financeCheckpoint('MANUAL_AFTER_FEE_PLAN');

    // 4. Record Immutable Ledger Entry
    await FinancialLedgerModel.create([{
      tenantId,
      studentUserId: feePlan.studentUserId._id,
      studentFeePlanId: feePlan._id,
      paymentId: payment._id,
      branchId: feePlan.branchId,
      entryType: 'PAYMENT',
      description: `Manual Payment Received (${payload.method}): ${payment.paymentNumber}${
        payload.transactionReference ? ` [Ref: ${payload.transactionReference}]` : ''
      }`,
      amountMinor: payload.amountMinor,
      currency: feePlan.currency,
      isDebit: false,
      runningBalanceMinor: newOutstanding,
      actorId: new Types.ObjectId(actorId)
    }], { session });
    financeCheckpoint('MANUAL_AFTER_LEDGER');

    // 5. Generate Official Receipt
    financeCheckpoint('MANUAL_DURING_RECEIPT');
    const receipt = await this.generateReceiptForPayment(payment, feePlan, actorId, session);
    payment.receiptId = receipt._id;
    await payment.save({ session });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'PAYMENT_COLLECTED',
      resource: 'Payment',
      resourceId: payment._id.toString(),
      metadata: {
        paymentNumber: payment.paymentNumber,
        amountMinor: payload.amountMinor,
        method: payload.method,
        newOutstanding
      },
      session
    });

    const student: any = feePlan.studentUserId;
    await this.writeOutbox(session, { tenantId, eventId: `payment.success:${payment._id}`, eventType: 'payment.success', aggregateType: 'Payment', aggregateId: payment._id, payload: { paymentId: payment._id.toString(), paymentNumber: payment.paymentNumber, studentUserId: student._id.toString(), email: student.email, studentName: student.name, amountMinor: payment.amountMinor, currency: payment.currency } });
    await this.writeOutbox(session, { tenantId, eventId: `receipt.generated:${receipt._id}`, eventType: 'receipt.generated', aggregateType: 'Receipt', aggregateId: receipt._id, payload: { receiptId: receipt._id.toString(), receiptNumber: receipt.receiptNumber, email: student.email, studentName: student.name } });
    financeCheckpoint('MANUAL_AFTER_OUTBOX');

    return { payment, receipt };
      });
    } catch (error: any) {
      if (error?.code !== 11000 || !payload.idempotencyKey) throw error;
      const existing = await PaymentModel.findOne({ tenantId, idempotencyKey: payload.idempotencyKey });
      if (!existing || existing.studentFeePlanId.toString() !== payload.studentFeePlanId || existing.amountMinor !== payload.amountMinor) {
        throw new ConflictError('Idempotency key was already used for a different payment request');
      }
      const receipt = await ReceiptModel.findOne({ tenantId, paymentId: existing._id });
      if (!receipt) throw new ConflictError('The original payment request is still being processed');
      return { payment: existing, receipt };
    }
  }

  /**
   * Generates a formal, immutable Receipt snapshot for a successful payment
   */
  private static async generateReceiptForPayment(
    payment: IPaymentDocument,
    feePlan: any,
    actorId: string,
    session?: ClientSession
  ): Promise<IReceiptDocument> {
    const tenantId = payment.tenantId.toString();
    const existing = await ReceiptModel.findOne({ tenantId, paymentId: payment._id }).session(session || null);
    if (existing) return existing;

    const tenant = await TenantModel.findById(tenantId).session(session || null);
    const branding = await OrganizationBrandingModel.findOne({ tenantId }).session(session || null);

    const studentUser = feePlan.studentUserId;
    const course = feePlan.courseId;
    const receiptNumber = await this.generateReceiptNumber(tenantId, session);

    const [receipt] = await ReceiptModel.create([{
      tenantId,
      receiptNumber,
      paymentId: payment._id,
      studentUserId: studentUser._id,
      studentFeePlanId: feePlan._id,
      admissionId: feePlan.admissionId,
      branchId: feePlan.branchId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      paymentMethod: payment.method,
      transactionReference: payment.transactionReference || payment.gatewayPaymentId,
      issuedAt: new Date(),
      studentSnapshot: {
        fullName: studentUser.name,
        email: studentUser.email,
        phone: studentUser.phone || ''
      },
      courseSnapshot: {
        courseId: course._id.toString(),
        title: course.title,
        batchName: feePlan.batchId?.name
      },
      organizationSnapshot: {
        organizationName: branding?.organizationName || tenant?.name || 'DIDM Institute'
      },

      status: 'ISSUED',
      notes: payment.notes,
      issuedBy: new Types.ObjectId(actorId)
    }], { session });

    return receipt;
  }

  private static async finalizeSuccessfulPayment(
    paymentId: string,
    providerPayment: { paymentId: string; orderId: string; amountMinor: number; currency: string; status: string },
    actorId: string
  ) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    return runInTransaction(async (session) => {
      const payment = await PaymentModel.findOne({ _id: paymentId, tenantId }).session(session);
      if (!payment) throw new NotFoundError('Payment attempt not found');
      if (payment.status === 'SUCCESS') {
        const receipt = await ReceiptModel.findOne({ tenantId, paymentId: payment._id }).session(session);
        if (!receipt) throw new ConflictError('Successful payment is missing its receipt');
        return { success: true, alreadyProcessed: true, paymentNumber: payment.paymentNumber, receiptNumber: receipt.receiptNumber };
      }
      if (providerPayment.status !== 'CAPTURED') throw new BadRequestError('Provider payment is not captured');
      if (providerPayment.orderId !== payment.gatewayOrderId) throw new BadRequestError('Provider order mismatch');
      if (providerPayment.amountMinor !== payment.amountMinor) throw new BadRequestError('Provider amount mismatch');
      if (providerPayment.currency.toUpperCase() !== payment.currency.toUpperCase()) throw new BadRequestError('Provider currency mismatch');

      const feePlan = await StudentFeePlanModel.findOne({ _id: payment.studentFeePlanId, tenantId })
        .populate('studentUserId', 'name email phone')
        .populate('courseId', 'title')
        .session(session);
      if (!feePlan) throw new NotFoundError('Student fee plan not found');
      if (payment.amountMinor > feePlan.outstandingBalanceMinor) throw new ConflictError('Payment exceeds the current outstanding balance');

      const { updatedInstallments, allocations } = this.allocatePaymentToInstallments(feePlan.installments, payment.amountMinor);
      allocations.forEach((allocation) => { allocation.studentFeePlanId = feePlan._id; });
      const newPaidAmount = feePlan.paidAmountMinor + payment.amountMinor;
      const newOutstanding = feePlan.netPayableMinor - newPaidAmount;
      payment.status = 'SUCCESS';
      financeCheckpoint('ONLINE_AFTER_PAYMENT_MUTATION');
      payment.gatewayPaymentId = providerPayment.paymentId;
      payment.verifiedAt = new Date();
      payment.verifiedBy = new Types.ObjectId(actorId);
      payment.allocations = allocations;
      financeCheckpoint('ONLINE_AFTER_ALLOCATION');
      feePlan.paidAmountMinor = newPaidAmount;
      feePlan.outstandingBalanceMinor = newOutstanding;
      feePlan.installments = updatedInstallments as any;
      feePlan.status = newOutstanding === 0 ? 'FULLY_PAID' : 'ACTIVE';
      financeCheckpoint('ONLINE_AFTER_FEE_PLAN');
      await feePlan.save({ session });
      await FinancialLedgerModel.create([{
        tenantId,
        studentUserId: feePlan.studentUserId._id,
        studentFeePlanId: feePlan._id,
        paymentId: payment._id,
        branchId: feePlan.branchId,
        entryType: 'PAYMENT',
        description: `Online Payment Verified: ${payment.paymentNumber}`,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        isDebit: false,
        runningBalanceMinor: newOutstanding,
        actorId: new Types.ObjectId(actorId)
      }], { session });
      financeCheckpoint('ONLINE_AFTER_LEDGER');
      financeCheckpoint('ONLINE_DURING_RECEIPT');
      const receipt = await this.generateReceiptForPayment(payment, feePlan, actorId, session);
      payment.receiptId = receipt._id;
      await payment.save({ session });
      const student: any = feePlan.studentUserId;
      await this.writeOutbox(session, { tenantId, eventId: `payment.success:${payment._id}`, eventType: 'payment.success', aggregateType: 'Payment', aggregateId: payment._id, payload: { paymentId: payment._id.toString(), paymentNumber: payment.paymentNumber, studentUserId: student._id.toString(), email: student.email, studentName: student.name, amountMinor: payment.amountMinor, currency: payment.currency } });
      await this.writeOutbox(session, { tenantId, eventId: `receipt.generated:${receipt._id}`, eventType: 'receipt.generated', aggregateType: 'Receipt', aggregateId: receipt._id, payload: { receiptId: receipt._id.toString(), receiptNumber: receipt.receiptNumber, email: student.email, studentName: student.name } });
      financeCheckpoint('ONLINE_AFTER_OUTBOX');
      return { success: true, paymentNumber: payment.paymentNumber, receiptNumber: receipt.receiptNumber, newOutstanding };
    });
  }

  // ==========================================
  // 4. ONLINE PAYMENT GATEWAY & WEBHOOK ENGINE
  // ==========================================

  /**
   * Creates an online gateway order (e.g. Razorpay) server-authoritatively
   */
  public static async createOnlinePaymentOrder(
    payload: CreateOnlineOrderPayload,
    studentUserId: string
  ) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    await this.assertOnlineFinanceReady(tenantId);

    if (payload.idempotencyKey) {
      const existing = await PaymentModel.findOne({ tenantId, idempotencyKey: payload.idempotencyKey });
      if (existing) {
        if (existing.studentFeePlanId.toString() !== payload.studentFeePlanId) {
          throw new ConflictError('Idempotency key was already used for a different payment request');
        }
        return {
          paymentId: existing._id.toString(),
          paymentNumber: existing.paymentNumber,
          gatewayOrderId: existing.gatewayOrderId,
          amountMinor: existing.amountMinor,
          currency: existing.currency,
          alreadyCreated: true
        };
      }
    }

    const feePlan = await StudentFeePlanModel.findOne({
      _id: payload.studentFeePlanId,
      tenantId,
      studentUserId
    }).populate('studentUserId', 'name email phone');

    if (!feePlan) throw new NotFoundError('Student fee plan not found');
    if (feePlan.outstandingBalanceMinor <= 0) {
      throw new BadRequestError('Fee plan is already fully paid');
    }

    // Determine authorized payable amount
    let payableAmountMinor = feePlan.outstandingBalanceMinor;
    if (payload.installmentId) {
      const targetInst = feePlan.installments.find(
        (i: any) => i._id.toString() === payload.installmentId
      );
      if (targetInst) {
        payableAmountMinor = targetInst.amountMinor - targetInst.paidAmountMinor;
      }
    } else if (payload.amountMinor && payload.amountMinor > 0) {
      payableAmountMinor = Math.min(payload.amountMinor, feePlan.outstandingBalanceMinor);
    }

    if (payableAmountMinor <= 0) {
      throw new BadRequestError('Invalid payable amount calculated');
    }

    // Resolve tenant provider (e.g. Razorpay)
    const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
    const paymentNumber = await this.generatePaymentNumber(tenantId);

    const gatewayOrder = await provider.createOrder({
      amountMinor: payableAmountMinor,
      currency: feePlan.currency,
      receiptId: paymentNumber,
      notes: {
        tenantId,
        studentFeePlanId: feePlan._id.toString(),
        studentUserId: studentUserId.toString()
      }
    });

    // Create internal PENDING payment attempt record
    const payment = await PaymentModel.create({
      tenantId,
      paymentNumber,
      studentUserId: feePlan.studentUserId._id,
      studentFeePlanId: feePlan._id,
      admissionId: feePlan.admissionId,
      enrollmentId: feePlan.enrollmentId,
      branchId: feePlan.branchId,
      amountMinor: payableAmountMinor,
      currency: feePlan.currency,
      method: 'ONLINE_GATEWAY',
      status: 'PENDING',
      gatewayProvider: gatewayOrder.provider,
      gatewayOrderId: gatewayOrder.orderId,
      idempotencyKey: payload.idempotencyKey,
      receivedAt: new Date(),
      createdBy: new Types.ObjectId(studentUserId),
      updatedBy: new Types.ObjectId(studentUserId)
    });

    return {
      paymentId: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      gatewayOrderId: gatewayOrder.orderId,
      amountMinor: payableAmountMinor,
      currency: feePlan.currency,
      keyId: gatewayOrder.keyId,
      student: {
        name: (feePlan.studentUserId as any).name,
        email: (feePlan.studentUserId as any).email,
        phone: (feePlan.studentUserId as any).phone
      }
    };
  }

  /**
   * Verifies online payment signature and finalizes allocation + receipt idempotently
   */
  public static async verifyAndCompleteOnlinePayment(
    payload: VerifyOnlinePaymentPayload,
    actorId: string
  ) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const payment = await PaymentModel.findOne({ _id: payload.paymentId, tenantId });
    if (!payment) throw new NotFoundError('Payment attempt not found');

    if (payment.status === 'SUCCESS') {
      // Idempotent return if already confirmed
      const receipt = await ReceiptModel.findOne({ paymentId: payment._id, tenantId });
      return {
        success: true,
        alreadyProcessed: true,
        paymentNumber: payment.paymentNumber,
        receiptNumber: receipt?.receiptNumber
      };
    }

    if (payment.gatewayOrderId !== payload.gatewayOrderId) {
      throw new BadRequestError('Gateway order does not match the internal payment attempt');
    }

    if (payment.method !== 'ONLINE_GATEWAY' || payment.gatewayProvider === 'MANUAL') {
      throw new BadRequestError('Payment attempt is not an online gateway payment');
    }

    // Verify cryptographic signature
    const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
    const isValid = provider.verifyPaymentSignature({
      orderId: payload.gatewayOrderId,
      paymentId: payload.gatewayPaymentId,
      signature: payload.gatewaySignature
    });

    if (!isValid) {
      payment.status = 'FAILED';
      payment.notes = 'Cryptographic signature verification failed';
      await payment.save();
      throw new BadRequestError('Payment signature verification failed');
    }

    const providerPayment = await provider.fetchPayment(payload.gatewayPaymentId);
    return this.finalizeSuccessfulPayment(payment._id.toString(), providerPayment, actorId);
  }

  // ==========================================
  // 5. REFUND ENGINE
  // ==========================================

  public static async requestRefund(payload: RequestRefundPayload, actorId: string): Promise<IRefundDocument> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const reservation = await runInTransaction(async (session) => {
      const payment = await PaymentModel.findOne({ _id: payload.paymentId, tenantId }).session(session);
      if (!payment) throw new NotFoundError('Original payment not found');
      if (!['SUCCESS', 'PARTIALLY_REFUNDED'].includes(payment.status)) throw new BadRequestError('Only successful payments can be refunded');
      const available = payment.amountMinor - payment.refundedAmountMinor - payment.reservedRefundAmountMinor;
      if (payload.amountMinor > available) throw new BadRequestError(`Refund exceeds available amount (${formatCurrency(available)})`);
      payment.reservedRefundAmountMinor += payload.amountMinor;
      await payment.save({ session });
      const refundNumber = await this.generateRefundNumber(tenantId, session);
      const [refund] = await RefundModel.create([{
        tenantId, refundNumber, paymentId: payment._id, studentUserId: payment.studentUserId,
        studentFeePlanId: payment.studentFeePlanId, amountMinor: payload.amountMinor,
        branchId: payment.branchId,
        currency: payment.currency, reason: payload.reason.trim(), status: 'PROCESSING',
        gatewayProvider: payment.gatewayProvider, requestedBy: new Types.ObjectId(actorId),
        approvedBy: new Types.ObjectId(actorId), approvedAt: new Date()
      }], { session });
      return { payment, refund };
    });

    if (reservation.payment.gatewayProvider === 'RAZORPAY') {
      if (!reservation.payment.gatewayPaymentId) throw new ConflictError('Provider payment reference is missing');
      const provider = await PaymentProviderFactory.getProviderForTenant(tenantId);
      const result = await provider.initiateRefund({ paymentId: reservation.payment.gatewayPaymentId, amountMinor: payload.amountMinor, reason: payload.reason, idempotencyKey: reservation.refund.refundNumber });
      reservation.refund.gatewayRefundId = result.refundId;
      await reservation.refund.save();
      if (result.status !== 'processed') return reservation.refund;
    }
    return this.finalizeRefund(reservation.refund._id.toString(), actorId);
  }

  private static async finalizeRefund(refundId: string, actorId: string): Promise<IRefundDocument> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    return runInTransaction(async (session) => {
      const refund = await RefundModel.findOne({ _id: refundId, tenantId }).session(session);
      if (!refund) throw new NotFoundError('Refund not found');
      if (refund.status === 'SUCCESS') return refund;
      if (refund.status !== 'PROCESSING') throw new ConflictError('Refund is not ready for finalization');
      const payment = await PaymentModel.findOne({ _id: refund.paymentId, tenantId }).session(session);
      const feePlan = payment && await StudentFeePlanModel.findOne({ _id: payment.studentFeePlanId, tenantId }).session(session);
      if (!payment || !feePlan) throw new NotFoundError('Refund financial context not found');
      if (payment.reservedRefundAmountMinor < refund.amountMinor) throw new ConflictError('Refund reservation is missing');
      payment.reservedRefundAmountMinor -= refund.amountMinor;
      payment.refundedAmountMinor += refund.amountMinor;
      financeCheckpoint('REFUND_AFTER_PAYMENT_AGGREGATES');
      payment.status = payment.refundedAmountMinor === payment.amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      feePlan.paidAmountMinor -= refund.amountMinor;
      feePlan.outstandingBalanceMinor += refund.amountMinor;
      feePlan.status = 'ACTIVE';
      financeCheckpoint('REFUND_AFTER_LIABILITY');
      refund.status = 'SUCCESS';
      refund.processedAt = new Date();
      financeCheckpoint('REFUND_AFTER_STATE');
      await payment.save({ session });
      await feePlan.save({ session });
      await refund.save({ session });
      await FinancialLedgerModel.create([{
        tenantId, studentUserId: feePlan.studentUserId, studentFeePlanId: feePlan._id,
        paymentId: payment._id, refundId: refund._id, branchId: feePlan.branchId, entryType: 'REFUND',
        description: `Refund Executed: ${refund.refundNumber} (${refund.reason})`, amountMinor: refund.amountMinor,
        currency: refund.currency, isDebit: true, runningBalanceMinor: feePlan.outstandingBalanceMinor,
        actorId: new Types.ObjectId(actorId)
      }], { session });
      financeCheckpoint('REFUND_AFTER_LEDGER');
      await this.writeOutbox(session, { tenantId, eventId: `refund.success:${refund._id}`, eventType: 'refund.success', aggregateType: 'Refund', aggregateId: refund._id, payload: { refundId: refund._id.toString(), refundNumber: refund.refundNumber, studentUserId: refund.studentUserId.toString(), amountMinor: refund.amountMinor, currency: refund.currency } });
      financeCheckpoint('REFUND_AFTER_OUTBOX');
      return refund;
    });
  }

  // ==========================================
  // 6. DASHBOARD & REPORTING METRICS
  // ==========================================

  public static async getDashboardMetrics(actor?: BranchActor): Promise<FinanceDashboardSummary> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    const branchFilter = await this.financeBranchFilter(tenantId, actor);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      activePlansCount,
      fullyPaidPlansCount,
      paymentsSummaryAggr,
      todayPaymentsAggr,
      allPlansWithOutstanding,
      recentPaymentsRaw
    ] = await Promise.all([
      StudentFeePlanModel.countDocuments({ tenantId, status: 'ACTIVE', ...branchFilter }),
      StudentFeePlanModel.countDocuments({ tenantId, status: 'FULLY_PAID', ...branchFilter }),
      PaymentModel.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId), status: { $in: ['SUCCESS', 'PARTIALLY_REFUNDED'] }, ...branchFilter } },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: '$amountMinor' },
            totalRefunded: { $sum: '$refundedAmountMinor' },
            onlineTotal: {
              $sum: { $cond: [{ $eq: ['$method', 'ONLINE_GATEWAY'] }, '$amountMinor', 0] }
            },
            offlineTotal: {
              $sum: { $cond: [{ $ne: ['$method', 'ONLINE_GATEWAY'] }, '$amountMinor', 0] }
            }
          }
        }
      ]),
      PaymentModel.aggregate([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            status: { $in: ['SUCCESS', 'PARTIALLY_REFUNDED'] },
            ...branchFilter,
            receivedAt: { $gte: startOfToday, $lte: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } }
      ]),
      StudentFeePlanModel.find({ tenantId, outstandingBalanceMinor: { $gt: 0 }, ...branchFilter })
        .populate('studentUserId', 'name phone')
        .populate('courseId', 'title')
        .lean(),
      PaymentModel.find({ tenantId, status: 'SUCCESS', ...branchFilter })
        .populate('studentUserId', 'name email phone')
        .populate('receiptId', 'receiptNumber')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    const summary = paymentsSummaryAggr[0] || {
      totalCollected: 0,
      totalRefunded: 0,
      onlineTotal: 0,
      offlineTotal: 0
    };

    let totalOutstandingMinor = 0;
    let totalOverdueMinor = 0;
    const upcomingDues: any[] = [];

    allPlansWithOutstanding.forEach((plan: any) => {
      totalOutstandingMinor += plan.outstandingBalanceMinor;
      plan.installments?.forEach((inst: any) => {
        const remaining = inst.amountMinor - inst.paidAmountMinor;
        if (remaining > 0) {
          const isOverdue = new Date(inst.dueDate) < startOfToday;
          if (isOverdue) {
            totalOverdueMinor += remaining;
          }
          upcomingDues.push({
            studentFeePlanId: plan._id.toString(),
            studentName: plan.studentUserId?.name || 'Student',
            studentPhone: plan.studentUserId?.phone || '',
            courseTitle: plan.courseId?.title || 'Course',
            dueDate: inst.dueDate,
            amountMinor: remaining,
            installmentLabel: inst.label,
            isOverdue
          });
        }
      });
    });

    upcomingDues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      stats: {
        totalCollectedMinor: summary.totalCollected,
        totalOutstandingMinor,
        totalOverdueMinor,
        collectedTodayMinor: todayPaymentsAggr[0]?.total || 0,
        onlineCollectionsMinor: summary.onlineTotal,
        offlineCollectionsMinor: summary.offlineTotal,
        totalRefundedMinor: summary.totalRefunded,
        activePlansCount,
        fullyPaidPlansCount
      },
      recentPayments: recentPaymentsRaw.map((p: any) => ({
        id: p._id.toString(),
        tenantId: p.tenantId.toString(),
        paymentNumber: p.paymentNumber,
        studentUserId: p.studentUserId?._id?.toString() || '',
        student: p.studentUserId
          ? {
              id: p.studentUserId._id.toString(),
              name: p.studentUserId.name,
              email: p.studentUserId.email,
              phone: p.studentUserId.phone
            }
          : undefined,
        studentFeePlanId: p.studentFeePlanId.toString(),
        amountMinor: p.amountMinor,
        currency: p.currency,
        method: p.method,
        status: p.status,
        receiptNumber: p.receiptId?.receiptNumber,
        refundedAmountMinor: p.refundedAmountMinor,
        receivedAt: p.receivedAt,
        allocations: p.allocations || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      upcomingDues: upcomingDues.slice(0, 8),
      monthlyTrends: []
    };
  }

  // ==========================================
  // 7. PAYMENT GATEWAY CONFIGURATION
  // ==========================================

  public static async getPaymentGatewayConfig(): Promise<IPaymentGatewayConfig> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const doc = await PaymentGatewayConfigModel.findOne({ tenantId });
    if (!doc) {
      return {
        provider: 'RAZORPAY',
        isEnabled: false,
        isLiveMode: false
      };
    }

    return {
      provider: doc.provider as any,
      isEnabled: doc.isEnabled,
      isLiveMode: doc.isLiveMode,
      razorpay: doc.razorpay
        ? {
            keyId: doc.razorpay.keyId || '',
            isKeySecretConfigured: Boolean(doc.razorpay.keySecretEncrypted),
            isWebhookSecretConfigured: Boolean(doc.razorpay.webhookSecretEncrypted)
          }
        : undefined,
      stripe: doc.stripe
        ? {
            publishableKey: doc.stripe.publishableKey || '',
            isSecretKeyConfigured: Boolean(doc.stripe.secretKeyEncrypted),
            isWebhookSecretConfigured: Boolean(doc.stripe.webhookSecretEncrypted)
          }
        : undefined
    };
  }

  public static async updatePaymentGatewayConfig(
    payload: any,
    actorId: string
  ): Promise<IPaymentGatewayConfig> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    let doc = await PaymentGatewayConfigModel.findOne({ tenantId });
    if (!doc) {
      doc = new PaymentGatewayConfigModel({
        tenantId,
        provider: payload.provider || 'RAZORPAY',
        isEnabled: payload.isEnabled ?? false,
        isLiveMode: payload.isLiveMode ?? false
      });
    }

    doc.provider = payload.provider;
    doc.isEnabled = payload.isEnabled ?? doc.isEnabled;
    doc.isLiveMode = payload.isLiveMode ?? doc.isLiveMode;
    doc.updatedBy = new Types.ObjectId(actorId);

    if (payload.razorpay) {
      if (!doc.razorpay) doc.razorpay = { keyId: '' };
      if (payload.razorpay.keyId !== undefined) doc.razorpay.keyId = payload.razorpay.keyId;
      if (payload.razorpay.keySecret) {
        doc.razorpay.keySecretEncrypted = SecretEncryptionService.encryptSecret(payload.razorpay.keySecret);
      }
      if (payload.razorpay.webhookSecret) {
        doc.razorpay.webhookSecretEncrypted = SecretEncryptionService.encryptSecret(payload.razorpay.webhookSecret);
      }
    }

    if (doc.isEnabled) {
      const readiness = await this.getFinanceReadiness(tenantId);
      if (!readiness.checks.transactions || !readiness.checks.redis || !readiness.checks.workerHeartbeat || !readiness.checks.reconciliationHeartbeat) {
        throw new ConflictError('Cannot enable online payments until MongoDB transactions, Redis workers, and reconciliation are available');
      }
      if (!doc.razorpay?.keyId || !doc.razorpay?.keySecretEncrypted || !doc.razorpay?.webhookSecretEncrypted) throw new BadRequestError('Razorpay key ID, key secret and webhook secret are required');
      if (process.env.NODE_ENV === 'production' && !process.env.STORAGE_ENCRYPTION_KEY) throw new ConflictError('A production credential encryption key is required');
    }

    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
      resource: 'PaymentGatewayConfig',
      resourceId: doc._id.toString(),
      metadata: { provider: doc.provider, isEnabled: doc.isEnabled }
    });

    return this.getPaymentGatewayConfig();
  }

  // ==========================================
  // 8. STUDENT FINANCE SELF-SERVICE
  // ==========================================

  public static async getStudentSelfFinanceOverview(studentUserId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const plans = await StudentFeePlanModel.find({ tenantId, studentUserId })
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .sort({ createdAt: -1 })
      .lean();

    const planIds = plans.map((p) => p._id);

    const [payments, receipts] = await Promise.all([
      PaymentModel.find({ tenantId, studentFeePlanId: { $in: planIds } })
        .populate('receiptId', 'receiptNumber')
        .sort({ receivedAt: -1 })
        .lean(),
      ReceiptModel.find({ tenantId, studentFeePlanId: { $in: planIds } })
        .sort({ issuedAt: -1 })
        .lean()
    ]);

    return {
      plans,
      payments,
      receipts
    };
  }

  // ==========================================
  // 9. QUERIES: PAYMENTS, RECEIPTS, DUES, REFUNDS
  // ==========================================

  public static async getPayments(filters: PaymentFilterQuery) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { tenantId };
    if (filters.status && filters.status !== 'ALL') query.status = filters.status;
    if (filters.method && filters.method !== 'ALL') query.method = filters.method;
    if (filters.studentUserId) query.studentUserId = filters.studentUserId;

    if (filters.startDate || filters.endDate) {
      query.receivedAt = {};
      if (filters.startDate) query.receivedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.receivedAt.$lte = new Date(filters.endDate);
    }

    const total = await PaymentModel.countDocuments(query);
    const rawPayments = await PaymentModel.find(query)
      .populate('studentUserId', 'name email phone')
      .populate('collectedBy', 'name')
      .populate('receiptId', 'receiptNumber')
      .sort({ receivedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const payments = rawPayments.map((p: any) => ({
      id: p._id.toString(),
      paymentNumber: p.paymentNumber,
      studentUserId: p.studentUserId?._id?.toString() || '',
      student: p.studentUserId
        ? {
            id: p.studentUserId._id.toString(),
            name: p.studentUserId.name,
            email: p.studentUserId.email,
            phone: p.studentUserId.phone
          }
        : undefined,
      studentFeePlanId: p.studentFeePlanId?.toString(),
      amountMinor: p.amountMinor,
      currency: p.currency,
      method: p.method,
      status: p.status,
      transactionReference: p.transactionReference || p.gatewayPaymentId,
      receiptId: p.receiptId?._id?.toString(),
      receiptNumber: p.receiptId?.receiptNumber,
      refundedAmountMinor: p.refundedAmountMinor,
      receivedAt: p.receivedAt,
      allocations: p.allocations || [],
      notes: p.notes,
      collector: p.collectedBy ? { id: p.collectedBy._id.toString(), name: p.collectedBy.name } : undefined,
      createdAt: p.createdAt
    }));

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static async getReceiptById(receiptId: string, studentUserId?: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const query: any = { _id: receiptId, tenantId };
    if (studentUserId) {
      query.studentUserId = studentUserId;
    }

    const receipt = await ReceiptModel.findOne(query).lean();
    if (!receipt) throw new NotFoundError('Receipt not found');
    return receipt;
  }

  public static async getReceipts(studentFeePlanId?: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const query: any = { tenantId };
    if (studentFeePlanId) query.studentFeePlanId = studentFeePlanId;

    return ReceiptModel.find(query).sort({ issuedAt: -1 }).lean();
  }

  public static async getRefunds(page = 1, limit = 20) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const skip = (page - 1) * limit;
    const total = await RefundModel.countDocuments({ tenantId });
    const refunds = await RefundModel.find({ tenantId })
      .populate('studentUserId', 'name email phone')
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static async getDuesQueue(filters: DueFilterQuery) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { tenantId, outstandingBalanceMinor: { $gt: 0 } };
    if (filters.courseId) query.courseId = filters.courseId;
    if (filters.branchId) query.branchId = filters.branchId;

    const plans = await StudentFeePlanModel.find(query)
      .populate('studentUserId', 'name email phone')
      .populate('courseId', 'title')
      .populate('batchId', 'name batchCode')
      .lean();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dues: any[] = [];

    plans.forEach((plan: any) => {
      plan.installments?.forEach((inst: any) => {
        const remainingMinor = inst.amountMinor - inst.paidAmountMinor;
        if (remainingMinor > 0) {
          const dueDate = new Date(inst.dueDate);
          const isOverdue = dueDate < startOfToday;
          const isToday = dueDate >= startOfToday && dueDate <= endOfToday;
          const isThisWeek = dueDate >= startOfToday && dueDate <= endOfWeek;

          let matchesFilter = true;
          if (filters.filterType === 'OVERDUE') matchesFilter = isOverdue;
          else if (filters.filterType === 'TODAY') matchesFilter = isToday;
          else if (filters.filterType === 'THIS_WEEK') matchesFilter = isThisWeek;
          else if (filters.filterType === 'UPCOMING') matchesFilter = dueDate > endOfToday;

          if (matchesFilter) {
            dues.push({
              studentFeePlanId: plan._id.toString(),
              student: plan.studentUserId
                ? {
                    id: plan.studentUserId._id.toString(),
                    name: plan.studentUserId.name,
                    email: plan.studentUserId.email,
                    phone: plan.studentUserId.phone
                  }
                : undefined,
              course: plan.courseId ? { id: plan.courseId._id.toString(), title: plan.courseId.title } : undefined,
              batch: plan.batchId ? { id: plan.batchId._id.toString(), name: plan.batchId.name } : undefined,
              installmentId: inst._id.toString(),
              installmentLabel: inst.label,
              dueDate: inst.dueDate,
              amountMinor: remainingMinor,
              totalInstallmentMinor: inst.amountMinor,
              paidAmountMinor: inst.paidAmountMinor,
              isOverdue,
              isToday
            });
          }
        }
      });
    });

    dues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const total = dues.length;
    const paginatedDues = dues.slice(skip, skip + limit);

    return {
      dues: paginatedDues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
