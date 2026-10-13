import mongoose, { Schema } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { connectDatabase, disconnectDatabase, AutomationEventModel, AutomationExecutionModel, AutomationModel, AutomationStepExecutionModel, CourseModel, FinancialLedgerModel, FinancialSequenceModel, NotificationDeliveryModel, NotificationIntentModel, NotificationModel, OrganizationEmailSettingsModel, OutboxEventModel, PaymentModel, ReceiptModel, RefundModel, StudentFeePlanModel, TenantModel, UserModel, runInTransaction, verifyTransactionSupport } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { FinanceService } from '../finance.service';
import { PaymentProviderFactory } from '../payment/paymentProviderFactory';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification.service';
import { AutomationService } from '../automation.service';

const enabled = process.env.RUN_MONGO_INTEGRATION === '1';
const suite = enabled ? describe : describe.skip;

suite('Phase 11B MongoDB replica-set transaction integration', () => {
  const runId = new mongoose.Types.ObjectId().toString();
  const tenantA = new mongoose.Types.ObjectId();
  const tenantB = new mongoose.Types.ObjectId();
  const studentA = new mongoose.Types.ObjectId();
  const studentB = new mongoose.Types.ObjectId();
  const Probe = mongoose.models.FinanceTransactionProbe || mongoose.model('FinanceTransactionProbe', new Schema({ runId: String, step: String }));

  async function seedPlan(label: string, amountMinor: number) {
    const tenantId = new mongoose.Types.ObjectId(); const studentId = new mongoose.Types.ObjectId(); const courseId = new mongoose.Types.ObjectId(); const planId = new mongoose.Types.ObjectId(); const installmentId = new mongoose.Types.ObjectId();
    await TenantModel.collection.insertOne({ _id: tenantId, name: `Tenant ${label}`, slug: `${runId}-${label}` });
    await UserModel.collection.insertOne({ _id: studentId, tenantId, allowedTenantIds: [tenantId], name: `Student ${label}`, email: `${label}@example.com`, phone: '', passwordHash: 'x', status: 'ACTIVE' });
    await CourseModel.collection.insertOne({ _id: courseId, tenantId, title: `Course ${label}` });
    await StudentFeePlanModel.collection.insertOne({ _id: planId, tenantId, studentUserId: studentId, courseId, currency: 'INR', baseAmountMinor: amountMinor, discountAmountMinor: 0, netPayableMinor: amountMinor, paidAmountMinor: 0, outstandingBalanceMinor: amountMinor, installments: [{ _id: installmentId, sequence: 1, label: 'Full fee', dueDate: new Date(), amountMinor, paidAmountMinor: 0, status: 'DUE' }], status: 'ACTIVE', createdBy: studentId, updatedBy: studentId, createdAt: new Date(), updatedAt: new Date() });
    return { tenantId, studentId, courseId, planId, installmentId };
  }

  const inTenant = <T>(tenantId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, callback: () => Promise<T>) => tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: userId.toString(), isPlatformContext: false, allowedTenantIds: [tenantId.toString()] }, callback);

  async function seedProcessingRefund(label: string, withProviderRefundId = true) {
    const seeded = await seedPlan(label, 10000); const paymentId = new mongoose.Types.ObjectId(); const refundId = new mongoose.Types.ObjectId();
    await StudentFeePlanModel.collection.updateOne({ _id: seeded.planId }, { $set: { paidAmountMinor: 10000, outstandingBalanceMinor: 0, status: 'FULLY_PAID', 'installments.0.paidAmountMinor': 10000, 'installments.0.status': 'PAID' } });
    await PaymentModel.collection.insertOne({ _id: paymentId, tenantId: seeded.tenantId, paymentNumber: `${runId}-${label}-payment`, studentUserId: seeded.studentId, studentFeePlanId: seeded.planId, amountMinor: 10000, currency: 'INR', method: 'ONLINE_GATEWAY', status: 'SUCCESS', gatewayProvider: 'RAZORPAY', gatewayOrderId: `${runId}-${label}-order`, gatewayPaymentId: `${runId}-${label}-provider-payment`, receivedAt: new Date(), allocations: [{ studentFeePlanId: seeded.planId, installmentId: seeded.installmentId, amountMinor: 10000 }], refundedAmountMinor: 0, reservedRefundAmountMinor: 4000, createdBy: seeded.studentId, updatedBy: seeded.studentId, createdAt: new Date(), updatedAt: new Date() });
    await RefundModel.collection.insertOne({ _id: refundId, tenantId: seeded.tenantId, refundNumber: `${runId}-${label}-refund`, paymentId, studentUserId: seeded.studentId, studentFeePlanId: seeded.planId, amountMinor: 4000, currency: 'INR', reason: 'test', status: 'PROCESSING', gatewayProvider: 'RAZORPAY', ...(withProviderRefundId ? { gatewayRefundId: `${runId}-${label}-provider-refund` } : {}), requestedBy: seeded.studentId, createdAt: new Date(), updatedAt: new Date() });
    return { ...seeded, paymentId, refundId, gatewayPaymentId: `${runId}-${label}-provider-payment` };
  }

  beforeAll(async () => {
    process.env.WEB_APP_URL = 'https://learn.didm.test';
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://localhost:27017/edtech_lms_test?replicaSet=rs0');
    await OutboxEventModel.deleteMany({});
    await Promise.all([OutboxEventModel.syncIndexes(), FinancialSequenceModel.syncIndexes()]);
  });

  afterAll(async () => {
    await Probe.deleteMany({ runId });
    await FinancialSequenceModel.deleteMany({ period: runId });
    await OutboxEventModel.deleteMany({ eventId: new RegExp(`^${runId}`) });
    await PaymentModel.collection.deleteMany({ paymentNumber: new RegExp(`^${runId}`) });
    await ReceiptModel.collection.deleteMany({ receiptNumber: new RegExp(`^${runId}`) });
    const tenants = await TenantModel.collection.find({ slug: new RegExp(`^${runId}`) }).project({ _id: 1 }).toArray();
    const tenantIds = tenants.map((tenant) => tenant._id);
    await Promise.all([PaymentModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), RefundModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), ReceiptModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), StudentFeePlanModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), FinancialLedgerModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), UserModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), CourseModel.collection.deleteMany({ tenantId: { $in: tenantIds } }), TenantModel.collection.deleteMany({ _id: { $in: tenantIds } })]);
    await disconnectDatabase();
  });

  it('detects transaction capability from the actual server topology', async () => {
    await expect(verifyTransactionSupport()).resolves.toBe(true);
  });

  it('rolls back every write when a transaction operation fails', async () => {
    await expect(runInTransaction(async (session) => {
      await Probe.create([{ runId, step: 'payment-success' }, { runId, step: 'receipt' }], { session, ordered: true });
      throw new Error('injected receipt persistence failure');
    })).rejects.toThrow('injected receipt persistence failure');
    expect(await Probe.countDocuments({ runId })).toBe(0);
  });

  it('allocates unique atomic sequence values under concurrency', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const counters = await Promise.all(Array.from({ length: 20 }, () =>
      FinancialSequenceModel.findOneAndUpdate(
        { tenantId, kind: 'RECEIPT', period: runId },
        { $inc: { value: 1 }, $setOnInsert: { tenantId, kind: 'RECEIPT', period: runId } },
        { upsert: true, new: true }
      ).then((document) => document.value)
    ));
    expect(new Set(counters).size).toBe(20);
    expect(Math.min(...counters)).toBe(1);
    expect(Math.max(...counters)).toBe(20);
  });

  it('rolls back a transactional outbox event with its financial write', async () => {
    await expect(runInTransaction(async (session) => {
      await Probe.create([{ runId, step: 'financial-state' }], { session });
      await OutboxEventModel.create([{ tenantId: new mongoose.Types.ObjectId(), eventId: `${runId}:payment.success`, eventType: 'payment.success', aggregateType: 'Payment', aggregateId: new mongoose.Types.ObjectId(), payload: {}, status: 'PENDING' }], { session });
      throw new Error('injected outbox boundary failure');
    })).rejects.toThrow('injected outbox boundary failure');
    expect(await Probe.countDocuments({ runId })).toBe(0);
    expect(await OutboxEventModel.countDocuments({ eventId: `${runId}:payment.success` })).toBe(0);
  });

  it('enforces one stable outbox identity under concurrent insertion', async () => {
    const event = { tenantId: new mongoose.Types.ObjectId(), eventId: `${runId}:receipt.generated`, eventType: 'receipt.generated', aggregateType: 'Receipt', aggregateId: new mongoose.Types.ObjectId(), payload: {}, status: 'PENDING' };
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => OutboxEventModel.create(event)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await OutboxEventModel.countDocuments({ eventId: event.eventId })).toBe(1);
  });

  it('enforces tenant isolation against an actual finance collection', async () => {
    const base = { studentUserId: studentA, studentFeePlanId: new mongoose.Types.ObjectId(), amountMinor: 100, currency: 'INR', method: 'CASH', status: 'SUCCESS', receivedAt: new Date(), allocations: [], refundedAmountMinor: 0, reservedRefundAmountMinor: 0, createdBy: studentA, updatedBy: studentA };
    await PaymentModel.collection.insertMany([
      { ...base, tenantId: tenantA, paymentNumber: `${runId}-tenant-a` },
      { ...base, tenantId: tenantB, paymentNumber: `${runId}-tenant-b` }
    ] as any[]);

    const visible = await tenantContextStorage.run({ currentTenantId: tenantA.toString(), currentUserId: studentA.toString(), isPlatformContext: false, allowedTenantIds: [tenantA.toString()] }, () =>
      FinanceService.getPayments({ page: 1, limit: 100 } as any)
    );
    const matching = visible.payments.filter((payment: { paymentNumber: string }) => payment.paymentNumber.startsWith(runId));
    expect(matching).toHaveLength(1);
    expect(matching[0].paymentNumber).toBe(`${runId}-tenant-a`);
  });

  it('denies a student access to another student receipt', async () => {
    const receiptId = new mongoose.Types.ObjectId();
    await ReceiptModel.collection.insertOne({ _id: receiptId, tenantId: tenantA, receiptNumber: `${runId}-receipt`, paymentId: new mongoose.Types.ObjectId(), studentUserId: studentA, studentFeePlanId: new mongoose.Types.ObjectId(), amountMinor: 100, currency: 'INR', paymentMethod: 'CASH', issuedAt: new Date(), studentSnapshot: { fullName: 'A', phone: '' }, courseSnapshot: { courseId: 'course', title: 'Course' }, organizationSnapshot: { organizationName: 'Org' }, status: 'ISSUED', issuedBy: studentA });

    await expect(tenantContextStorage.run({ currentTenantId: tenantA.toString(), currentUserId: studentB.toString(), isPlatformContext: false, allowedTenantIds: [tenantA.toString()] }, () =>
      FinanceService.getReceiptById(receiptId.toString(), studentB.toString())
    )).rejects.toThrow('Receipt not found');
  });

  it('finalizes the same captured online payment once under ten concurrent attempts', async () => {
    const seeded = await seedPlan('payment-race', 10000); const paymentId = new mongoose.Types.ObjectId();
    await PaymentModel.collection.insertOne({ _id: paymentId, tenantId: seeded.tenantId, paymentNumber: `${runId}-online-race`, studentUserId: seeded.studentId, studentFeePlanId: seeded.planId, amountMinor: 10000, currency: 'INR', method: 'ONLINE_GATEWAY', status: 'PENDING', gatewayProvider: 'RAZORPAY', gatewayOrderId: `${runId}-order`, receivedAt: new Date(), allocations: [], refundedAmountMinor: 0, reservedRefundAmountMinor: 0, createdBy: seeded.studentId, updatedBy: seeded.studentId, createdAt: new Date(), updatedAt: new Date() });
    const provider = { paymentId: `${runId}-provider-payment`, orderId: `${runId}-order`, amountMinor: 10000, currency: 'INR', status: 'CAPTURED' };
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => inTenant(seeded.tenantId, seeded.studentId, () => (FinanceService as any).finalizeSuccessfulPayment(paymentId.toString(), provider, seeded.studentId.toString()))));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    const [payment, plan, ledgerCount, receiptCount, outboxCount] = await Promise.all([PaymentModel.collection.findOne({ _id: paymentId }), StudentFeePlanModel.collection.findOne({ _id: seeded.planId }), FinancialLedgerModel.collection.countDocuments({ paymentId }), ReceiptModel.collection.countDocuments({ paymentId }), OutboxEventModel.collection.countDocuments({ aggregateId: { $in: [paymentId] }, eventType: 'payment.success' })]);
    expect(payment?.status).toBe('SUCCESS'); expect(plan?.paidAmountMinor).toBe(10000); expect(plan?.outstandingBalanceMinor).toBe(0); expect(ledgerCount).toBe(1); expect(receiptCount).toBe(1); expect(outboxCount).toBe(1);
  });

  it('deduplicates ten simultaneous manual payment requests by idempotency key', async () => {
    const seeded = await seedPlan('manual-race', 10000); const key = `${runId}-manual-key`;
    const payload: any = { studentFeePlanId: seeded.planId.toString(), amountMinor: 4000, method: 'CASH', idempotencyKey: key };
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.recordManualPayment(payload, seeded.studentId.toString()))));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    const payments = await PaymentModel.collection.find({ tenantId: seeded.tenantId, idempotencyKey: key }).toArray();
    const plan = await StudentFeePlanModel.collection.findOne({ _id: seeded.planId });
    expect(payments).toHaveLength(1); expect(plan?.paidAmountMinor).toBe(4000); expect(await FinancialLedgerModel.collection.countDocuments({ paymentId: payments[0]._id })).toBe(1); expect(await ReceiptModel.collection.countDocuments({ paymentId: payments[0]._id })).toBe(1);
  });

  it('drives canonical payment-success outbox through failure, 10-way replay, and one delivery without finance mutation', async () => {
    const seeded = await seedPlan('notification-outbox', 10000); const key = `${runId}-notification-outbox`;
    const result = await inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.recordManualPayment({ studentFeePlanId: seeded.planId.toString(), amountMinor: 4000, method: 'CASH', idempotencyKey: key } as any, seeded.studentId.toString()));
    const paymentId = result.payment._id; const event = await OutboxEventModel.findOne({ aggregateId: paymentId, eventType: 'payment.success' }).setOptions({ bypassTenantFilter: true }).lean();
    expect(event?.payload.studentUserId).toBe(seeded.studentId.toString());
    const financeSnapshot = async () => JSON.stringify({ payment: await PaymentModel.collection.findOne({ _id: paymentId }), plan: await StudentFeePlanModel.collection.findOne({ _id: seeded.planId }), ledger: await FinancialLedgerModel.collection.find({ paymentId }).sort({ _id: 1 }).toArray(), receipt: await ReceiptModel.collection.find({ paymentId }).sort({ _id: 1 }).toArray(), refunds: await RefundModel.collection.find({ paymentId }).sort({ _id: 1 }).toArray() });
    const before = await financeSnapshot();
    await Promise.all(Array.from({ length: 10 }, () => NotificationService.consumeFinanceOutboxEvent(event!.eventId)));
    const notification = await NotificationModel.findOne({ sourceType: 'Payment', sourceId: paymentId });
    expect(await NotificationModel.countDocuments({ sourceType: 'Payment', sourceId: paymentId })).toBe(1);
    expect(await NotificationDeliveryModel.countDocuments({ notificationId: notification!._id })).toBe(1);
    await OrganizationEmailSettingsModel.deleteMany({ tenantId: seeded.tenantId }).setOptions({ bypassTenantFilter: true });
    await OrganizationEmailSettingsModel.create({ tenantId: seeded.tenantId, provider: 'SMTP', status: 'VERIFIED', fromName: 'Finance', fromEmail: 'finance@example.com' });
    const sendEmail = vi.fn().mockRejectedValueOnce(new Error('provider 503 timeout')).mockResolvedValue({ success: true, messageId: 'payment-message-1' });
    const spy = vi.spyOn(EmailService, 'createProvider').mockReturnValue({ sendEmail, verifyConnection: vi.fn(), getProviderName: () => 'DOUBLE' });
    try {
      const delivery = await NotificationDeliveryModel.findOne({ notificationId: notification!._id });
      await expect(NotificationService.processDelivery(delivery!._id.toString())).rejects.toThrow('503');
      expect((await NotificationDeliveryModel.findById(delivery!._id))?.status).toBe('FAILED');
      expect(await financeSnapshot()).toBe(before);
      await Promise.all(Array.from({ length: 10 }, () => NotificationService.consumeFinanceOutboxEvent(event!.eventId)));
      await NotificationDeliveryModel.updateOne({ _id: delivery!._id }, { $set: { nextRetryAt: new Date(0) } }).setOptions({ bypassTenantFilter: true });
      await Promise.all(Array.from({ length: 10 }, () => NotificationService.processDelivery(delivery!._id.toString())));
      const saved = await NotificationDeliveryModel.findById(delivery!._id).setOptions({ bypassTenantFilter: true });
      expect(saved?.status).toBe('DELIVERED'); expect(saved?.providerMessageId).toBe('payment-message-1'); expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sendEmail.mock.calls[1][0]).toMatchObject({ to: `${'notification-outbox'}@example.com`, subject: 'Payment received', fromEmail: 'finance@example.com' }); expect(sendEmail.mock.calls[1][0].html).toContain('https://learn.didm.test/student/fees');
      expect(await NotificationModel.countDocuments({ sourceType: 'Payment', sourceId: paymentId })).toBe(1);
      expect(await NotificationDeliveryModel.countDocuments({ notificationId: notification!._id })).toBe(1);
      expect(await financeSnapshot()).toBe(before);
    } finally { spy.mockRestore(); }
  });

  it('composes canonical payment success into one automation action without finance mutation', async () => {
    const seeded=await seedPlan('automation-composition',10000);await TenantModel.collection.updateOne({_id:seeded.tenantId},{$set:{status:'ACTIVE'}});await Promise.all([AutomationEventModel.syncIndexes(),AutomationExecutionModel.syncIndexes(),AutomationStepExecutionModel.syncIndexes(),NotificationIntentModel.syncIndexes()]);
    const automation:any=await AutomationModel.create({tenantId:seeded.tenantId,name:'Payment composition',status:'ACTIVE',version:1,triggerType:'payment.success',conditions:{mode:'ALL',items:[]},steps:[{stepId:'notify',type:'ACTION',actionType:'NOTIFICATION_CREATE',inputs:{recipientUserId:seeded.studentId.toString(),notificationType:'payment.success',data:{paymentNumber:'Automated'}}}],branchMode:'ALL',branchIds:[],capabilitySnapshot:['organization.notifications.update'],createdBy:seeded.studentId,updatedBy:seeded.studentId});
    const result=await inTenant(seeded.tenantId,seeded.studentId,()=>FinanceService.recordManualPayment({studentFeePlanId:seeded.planId.toString(),amountMinor:4000,method:'CASH',idempotencyKey:`${runId}-automation-composition`} as any,seeded.studentId.toString()));const paymentId=result.payment._id;const outbox:any=await OutboxEventModel.findOne({aggregateId:paymentId,eventType:'payment.success'}).setOptions({bypassTenantFilter:true}).lean();
    const finance=async()=>JSON.stringify({payment:await PaymentModel.collection.findOne({_id:paymentId}),ledger:await FinancialLedgerModel.collection.find({paymentId}).toArray(),receipt:await ReceiptModel.collection.find({paymentId}).toArray(),refund:await RefundModel.collection.find({paymentId}).toArray()});const before=await finance();
    await NotificationService.consumeFinanceOutboxEvent(outbox.eventId);const event:any=await AutomationEventModel.findOne({eventId:`domain:${outbox.eventId}`});
    await AutomationEventModel.updateMany({_id:{$ne:event._id},status:'PENDING'},{$set:{status:'PROCESSED'}}).setOptions({bypassTenantFilter:true});
    await AutomationService.processNextEvent();const execution:any=await AutomationExecutionModel.findOne({triggerEventId:event.eventId,automationId:automation._id});expect(execution.status).toBe('COMPLETED');expect(await AutomationStepExecutionModel.countDocuments({executionId:execution._id,status:'COMPLETED'})).toBe(1);expect(await NotificationIntentModel.countDocuments({eventId:`${execution._id}:notify`})).toBe(1);
    await NotificationService.consumeOutboxEvent(`${execution._id}:notify`);const composedNotification:any=await NotificationModel.findOne({sourceId:paymentId.toString(),occurrenceKey:`${execution._id}:notify`});const delivery:any=await NotificationDeliveryModel.findOne({notificationId:composedNotification._id});await OrganizationEmailSettingsModel.deleteMany({tenantId:seeded.tenantId}).setOptions({bypassTenantFilter:true});await OrganizationEmailSettingsModel.create({tenantId:seeded.tenantId,provider:'SMTP',status:'VERIFIED',fromName:'Composition',fromEmail:'composition@example.com'});const sendEmail=vi.fn().mockRejectedValueOnce(new Error('provider 503 composition')).mockResolvedValue({success:true,messageId:'composition-delivered'});const providerSpy=vi.spyOn(EmailService,'createProvider').mockReturnValue({sendEmail,verifyConnection:vi.fn(),getProviderName:()=> 'DOUBLE'});await expect(NotificationService.processDelivery(delivery._id.toString())).rejects.toThrow('503');expect((await NotificationDeliveryModel.findById(delivery._id))?.status).toBe('FAILED');expect(await NotificationIntentModel.countDocuments({eventId:`${execution._id}:notify`})).toBe(1);await NotificationDeliveryModel.updateOne({_id:delivery._id},{$set:{nextRetryAt:new Date(0)}}).setOptions({bypassTenantFilter:true});await NotificationService.processDelivery(delivery._id.toString());expect((await NotificationDeliveryModel.findById(delivery._id))?.status).toBe('DELIVERED');expect(sendEmail).toHaveBeenCalledTimes(2);expect(await NotificationModel.countDocuments({_id:composedNotification._id})).toBe(1);providerSpy.mockRestore();
    await Promise.all(Array.from({length:10},()=>NotificationService.consumeFinanceOutboxEvent(outbox.eventId)));await AutomationService.processNextEvent();expect(await AutomationEventModel.countDocuments({eventId:event.eventId})).toBe(1);expect(await AutomationExecutionModel.countDocuments({triggerEventId:event.eventId,automationId:automation._id})).toBe(1);expect(await NotificationIntentModel.countDocuments({eventId:`${execution._id}:notify`})).toBe(1);expect(await finance()).toBe(before);
  });

  it('does not over-deduplicate distinct manual idempotency keys', async () => {
    const seeded = await seedPlan('manual-distinct', 10000);
    const results = await Promise.all(['a', 'b'].map((suffix) => inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.recordManualPayment({ studentFeePlanId: seeded.planId.toString(), amountMinor: 3000, method: 'CASH', idempotencyKey: `${runId}-${suffix}` } as any, seeded.studentId.toString()))));
    expect(new Set(results.map((result) => result.payment._id.toString())).size).toBe(2);
    expect((await StudentFeePlanModel.collection.findOne({ _id: seeded.planId }))?.paidAmountMinor).toBe(6000);
  });

  it('prevents concurrent over-refund while allowing valid combined refund capacity', async () => {
    const seeded = await seedPlan('refund-race', 10000); const paymentId = new mongoose.Types.ObjectId();
    await StudentFeePlanModel.collection.updateOne({ _id: seeded.planId }, { $set: { paidAmountMinor: 10000, outstandingBalanceMinor: 0, status: 'FULLY_PAID', 'installments.0.paidAmountMinor': 10000, 'installments.0.status': 'PAID' } });
    await PaymentModel.collection.insertOne({ _id: paymentId, tenantId: seeded.tenantId, paymentNumber: `${runId}-refund-payment`, studentUserId: seeded.studentId, studentFeePlanId: seeded.planId, amountMinor: 10000, currency: 'INR', method: 'CASH', status: 'SUCCESS', gatewayProvider: 'MANUAL', receivedAt: new Date(), allocations: [{ studentFeePlanId: seeded.planId, installmentId: seeded.installmentId, amountMinor: 10000 }], refundedAmountMinor: 0, reservedRefundAmountMinor: 0, createdBy: seeded.studentId, updatedBy: seeded.studentId, createdAt: new Date(), updatedAt: new Date() });
    const conflicting = await Promise.allSettled([7000, 7000].map((amountMinor, index) => inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.requestRefund({ paymentId: paymentId.toString(), amountMinor, reason: `Conflict ${index}` }, seeded.studentId.toString()))));
    expect(conflicting.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const payment = await PaymentModel.collection.findOne({ _id: paymentId });
    expect((payment?.refundedAmountMinor || 0) + (payment?.reservedRefundAmountMinor || 0)).toBeLessThanOrEqual(10000);
  });

  it('permits concurrent valid refunds whose total equals capacity', async () => {
    const seeded = await seedPlan('refund-valid', 10000); const paymentId = new mongoose.Types.ObjectId();
    await StudentFeePlanModel.collection.updateOne({ _id: seeded.planId }, { $set: { paidAmountMinor: 10000, outstandingBalanceMinor: 0, status: 'FULLY_PAID', 'installments.0.paidAmountMinor': 10000, 'installments.0.status': 'PAID' } });
    await PaymentModel.collection.insertOne({ _id: paymentId, tenantId: seeded.tenantId, paymentNumber: `${runId}-refund-valid-payment`, studentUserId: seeded.studentId, studentFeePlanId: seeded.planId, amountMinor: 10000, currency: 'INR', method: 'CASH', status: 'SUCCESS', gatewayProvider: 'MANUAL', receivedAt: new Date(), allocations: [{ studentFeePlanId: seeded.planId, installmentId: seeded.installmentId, amountMinor: 10000 }], refundedAmountMinor: 0, reservedRefundAmountMinor: 0, createdBy: seeded.studentId, updatedBy: seeded.studentId, createdAt: new Date(), updatedAt: new Date() });
    const results = await Promise.all([4000, 6000].map((amountMinor, index) => inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.requestRefund({ paymentId: paymentId.toString(), amountMinor, reason: `Valid ${index}` }, seeded.studentId.toString()))));
    expect(results.every((refund) => refund.status === 'SUCCESS')).toBe(true);
    const payment = await PaymentModel.collection.findOne({ _id: paymentId });
    expect(payment?.refundedAmountMinor).toBe(10000); expect(payment?.reservedRefundAmountMinor).toBe(0); expect(await FinancialLedgerModel.collection.countDocuments({ paymentId, entryType: 'REFUND' })).toBe(2);
  });

  it('finalizes provider-confirmed refund once under concurrent reconciliation', async () => {
    const seeded = await seedProcessingRefund('refund-finalize-race');
    const spy = vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue({ fetchRefund: async () => ({ refundId: 'provider-refund', paymentId: seeded.gatewayPaymentId, amountMinor: 4000, status: 'PROCESSED' }) } as any);
    try {
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.reconcileRefund(seeded.refundId.toString(), seeded.studentId.toString()))));
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
      const payment = await PaymentModel.collection.findOne({ _id: seeded.paymentId }); const plan = await StudentFeePlanModel.collection.findOne({ _id: seeded.planId });
      expect(payment?.refundedAmountMinor).toBe(4000); expect(payment?.reservedRefundAmountMinor).toBe(0); expect(plan?.outstandingBalanceMinor).toBe(4000); expect(await FinancialLedgerModel.collection.countDocuments({ refundId: seeded.refundId })).toBe(1); expect(await OutboxEventModel.collection.countDocuments({ aggregateId: seeded.refundId, eventType: 'refund.success' })).toBe(1);
    } finally { spy.mockRestore(); }
  });

  it('releases reservation on provider-confirmed refund failure', async () => {
    const seeded = await seedProcessingRefund('refund-failed'); const spy = vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue({ fetchRefund: async () => ({ refundId: 'provider-refund', paymentId: seeded.gatewayPaymentId, amountMinor: 4000, status: 'FAILED' }) } as any);
    try { await inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.reconcileRefund(seeded.refundId.toString(), seeded.studentId.toString())); const payment = await PaymentModel.collection.findOne({ _id: seeded.paymentId }); expect(payment?.reservedRefundAmountMinor).toBe(0); expect(payment?.refundedAmountMinor).toBe(0); expect((await RefundModel.collection.findOne({ _id: seeded.refundId }))?.status).toBe('FAILED'); } finally { spy.mockRestore(); }
  });

  it('keeps unresolved refund processing and reserved', async () => {
    const seeded = await seedProcessingRefund('refund-unresolved'); const spy = vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue({ fetchRefund: async () => ({ refundId: 'provider-refund', paymentId: seeded.gatewayPaymentId, amountMinor: 4000, status: 'PENDING' }) } as any);
    try { await inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.reconcileRefund(seeded.refundId.toString(), seeded.studentId.toString())); expect((await RefundModel.collection.findOne({ _id: seeded.refundId }))?.status).toBe('PROCESSING'); expect((await PaymentModel.collection.findOne({ _id: seeded.paymentId }))?.reservedRefundAmountMinor).toBe(4000); } finally { spy.mockRestore(); }
  });

  it('discovers an accepted timed-out refund without issuing a second refund', async () => {
    const seeded = await seedProcessingRefund('refund-discovery', false); const initiate = vi.fn(); const spy = vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue({ findRefund: async () => ({ refundId: 'discovered-refund', paymentId: seeded.gatewayPaymentId, amountMinor: 4000, status: 'PROCESSED' }), initiateRefund: initiate } as any);
    try { await inTenant(seeded.tenantId, seeded.studentId, () => FinanceService.reconcileRefund(seeded.refundId.toString(), seeded.studentId.toString())); const refund = await RefundModel.collection.findOne({ _id: seeded.refundId }); expect(refund?.status).toBe('SUCCESS'); expect(refund?.gatewayRefundId).toBe('discovered-refund'); expect(initiate).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
  });
});
