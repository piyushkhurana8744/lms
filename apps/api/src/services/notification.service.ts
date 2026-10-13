import { NotificationCategory, NotificationDeliveryModel, NotificationIntentModel, NotificationModel, NotificationPreferenceModel, NotificationType, OrganizationEmailSettingsModel, OutboxEventModel, UserModel } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, NotFoundError } from '../errors/appError';
import { EmailService } from './email/email.service';
import { getCertificatePublicOrigin } from './certificateArtifact.service';
import { DomainEventService } from './domainEvent.service';

const CATEGORIES: NotificationCategory[] = ['ACADEMIC', 'ATTENDANCE', 'FINANCE', 'ADMISSION', 'CERTIFICATE', 'SYSTEM', 'COMMUNICATION'];
const MANDATORY = new Set<NotificationType>(['certificate.revoked', 'payment.success']);
const MAX_ATTEMPTS = 5; const LEASE_MS = 60_000;
let handoffFailure = false;
export function setNotificationHandoffFailure(enabled: boolean) { if (process.env.NODE_ENV !== 'test' && enabled) throw new Error('Notification handoff failure injection is test-only'); handoffFailure = enabled; }
export type NotificationIntent = { tenantId: string; recipientUserId: string; type: NotificationType; sourceType: string; sourceId: string; occurrenceKey?: string; data: Record<string, string | number> };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
function template(type: NotificationType, data: Record<string, string | number>) {
  const value = (key: string, fallback = '') => String(data[key] ?? fallback);
  const definitions = {
    'certificate.issued': { category: 'CERTIFICATE', title: 'Certificate ready', body: `Your certificate for ${value('courseTitle', 'your course')} is ready.`, actionUrl: '/student/certificates' },
    'certificate.revoked': { category: 'CERTIFICATE', title: 'Certificate revoked', body: `Your certificate ${value('certificateNumber')} has been revoked.`, actionUrl: '/student/certificates' },
    'payment.success': { category: 'FINANCE', title: 'Payment received', body: `Payment ${value('paymentNumber')} was received successfully.`, actionUrl: '/student/fees' },
    'admission.confirmed': { category: 'ADMISSION', title: 'Admission confirmed', body: `Your admission for ${value('courseTitle', 'your course')} is confirmed.`, actionUrl: '/student' },
    'attendance.finalized': { category: 'ATTENDANCE', title: 'Attendance updated', body: `Attendance for ${value('classTitle', 'your class')} was finalized.`, actionUrl: '/student/attendance' },
    'assessment.graded': { category: 'ACADEMIC', title: 'Assignment graded', body: `${value('assessmentTitle', 'Your assignment')} has been graded.`, actionUrl: '/student/assessments' },
    'class.rescheduled': { category: 'ACADEMIC', title: 'Class rescheduled', body: `${value('classTitle', 'Your class')} has been rescheduled.`, actionUrl: '/student/calendar' },
    'class.cancelled': { category: 'ACADEMIC', title: 'Class cancelled', body: `${value('classTitle', 'Your class')} has been cancelled.`, actionUrl: '/student/calendar' },
    'student.activated': { category: 'ACADEMIC', title: 'Account activated', body: `Your student account for ${value('courseTitle', 'your course')} is now active.`, actionUrl: '/student' },
    'student.batch_transferred': { category: 'ACADEMIC', title: 'Batch updated', body: `You have been transferred to batch ${value('batchName', 'new batch')}.`, actionUrl: '/student/calendar' },
    'student.hold_started': { category: 'ACADEMIC', title: 'Academic hold placed', body: `Your academic journey has been placed on hold: ${value('reason', 'Administrative hold')}`, actionUrl: '/student' },
    'student.resumed': { category: 'ACADEMIC', title: 'Academic journey resumed', body: `Your academic status is now active. Welcome back!`, actionUrl: '/student' },
    'student.withdrawn': { category: 'ACADEMIC', title: 'Withdrawal processed', body: `Your withdrawal for ${value('courseTitle', 'your course')} has been processed.`, actionUrl: '/student' },
    'student.completed': { category: 'ACADEMIC', title: 'Course completed', body: `Congratulations! You have completed ${value('courseTitle', 'your course')}.`, actionUrl: '/student/certificates' },
    'student.reactivated': { category: 'ACADEMIC', title: 'Academic journey reactivated', body: `Your academic journey has been reactivated.`, actionUrl: '/student' },
    'announcement.published': { category: 'COMMUNICATION', title: value('title', 'Institutional Announcement'), body: value('body', 'You have a new announcement from your institution.'), actionUrl: value('actionUrl', '/student/inbox') },
    'communication.message_received': { category: 'COMMUNICATION', title: value('title', 'New Message'), body: value('preview', 'You received a new institutional message.'), actionUrl: value('actionUrl', '/student/conversations') }
  } as const;
  return definitions[type];
}

export class NotificationService {
  private static tenant() { const tenantId = getWorkspaceContext().currentTenantId; if (!tenantId) throw new Error('Tenant context required'); return tenantId; }
  static async preferences(userId: string) { const tenantId = this.tenant(); const stored = await NotificationPreferenceModel.find({ tenantId, userId }).lean(); return CATEGORIES.map((category) => ({ category, inAppEnabled: stored.find((item) => item.category === category)?.inAppEnabled ?? true, emailEnabled: stored.find((item) => item.category === category)?.emailEnabled ?? true })); }
  static async updatePreferences(userId: string, input: Array<{ category: NotificationCategory; inAppEnabled: boolean; emailEnabled: boolean }>) { const tenantId = this.tenant(); for (const item of input) { if (!CATEGORIES.includes(item.category)) throw new BadRequestError('Unknown notification category'); await NotificationPreferenceModel.updateOne({ tenantId, userId, category: item.category }, { $set: { inAppEnabled: item.inAppEnabled, emailEnabled: item.emailEnabled } }, { upsert: true }); } return this.preferences(userId); }

  static async createIntent(intent: NotificationIntent) {
    const recipient = await UserModel.findOne({ _id: intent.recipientUserId, tenantId: intent.tenantId }).setOptions({ bypassTenantFilter: true }).select('status email').lean();
    if (!recipient) throw new NotFoundError('Notification recipient not found');
    const content = template(intent.type, intent.data); const occurrence = intent.occurrenceKey || 'default';
    const deduplicationKey = `${intent.recipientUserId}:${intent.type}:${intent.sourceType}:${intent.sourceId}:${occurrence}`;
    const preference = await NotificationPreferenceModel.findOne({ tenantId: intent.tenantId, userId: intent.recipientUserId, category: content.category }).setOptions({ bypassTenantFilter: true }).lean();
    const inAppEnabled = preference?.inAppEnabled ?? true; const emailEnabled = MANDATORY.has(intent.type) || (preference?.emailEnabled ?? true);
    if (!inAppEnabled && !emailEnabled) return null;
    let notification;
    try { notification = await NotificationModel.create({ tenantId: intent.tenantId, recipientUserId: intent.recipientUserId, type: intent.type, category: content.category, title: content.title, body: content.body, actionUrl: content.actionUrl, sourceType: intent.sourceType, sourceId: intent.sourceId, occurrenceKey: occurrence, deduplicationKey }); }
    catch (error: unknown) { if ((error as { code?: number }).code !== 11000) throw error; notification = await NotificationModel.findOne({ tenantId: intent.tenantId, deduplicationKey }).setOptions({ bypassTenantFilter: true }); }
    if (notification && emailEnabled) await NotificationDeliveryModel.updateOne({ notificationId: notification._id, channel: 'EMAIL' }, { $setOnInsert: { tenantId: intent.tenantId, recipientUserId: intent.recipientUserId, status: recipient.status === 'ACTIVE' ? 'PENDING' : 'SKIPPED', attemptCount: 0, nextRetryAt: new Date(), lastErrorCode: recipient.status === 'ACTIVE' ? undefined : 'RECIPIENT_INACTIVE' } }, { upsert: true });
    return notification;
  }
  static async enqueueIntent(intent: NotificationIntent, idempotencyKey: string) {
    const occurrenceKey = intent.occurrenceKey || idempotencyKey;
    return NotificationIntentModel.findOneAndUpdate(
      { eventId: idempotencyKey },
      { $setOnInsert: { tenantId: intent.tenantId, eventId: idempotencyKey, type: intent.type, recipientUserId: intent.recipientUserId, sourceType: intent.sourceType, sourceId: intent.sourceId, occurrenceKey, data: intent.data, status: 'PENDING', availableAt: new Date(), attemptCount: 0 } },
      { upsert: true, new: true }
    );
  }
  static async consumeOutboxEvent(eventId: string) {
    if (handoffFailure) throw new Error('Injected notification handoff crash');
    const now = new Date(); const event = await NotificationIntentModel.findOneAndUpdate({ eventId, attemptCount: { $lt: 5 }, availableAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }, { $set: { status: 'PROCESSING', leaseUntil: new Date(now.getTime() + LEASE_MS) }, $inc: { attemptCount: 1 } }, { new: true });
    if (!event) return NotificationIntentModel.findOne({ eventId });
    try { await DomainEventService.publish({ tenantId:event.tenantId.toString(),eventId:`domain:${event.eventId}`,eventType:event.type,occurredAt:new Date(),resourceType:event.sourceType.replace(/[^A-Za-z0-9]/g,''),resourceId:event.sourceId,branchId:event.branchId?.toString(),correlationId:event.eventId,depth:0,payloadVersion:1,payload:{...event.data,recipientUserId:event.recipientUserId.toString()} }); await this.createIntent({ tenantId: event.tenantId.toString(), recipientUserId: event.recipientUserId.toString(), type: event.type, sourceType: event.sourceType, sourceId: event.sourceId, occurrenceKey: event.occurrenceKey, data: event.data }); event.status = 'PROCESSED'; event.processedAt = new Date(); event.leaseUntil = undefined; event.lastError = undefined; await event.save(); return event; }
    catch (error: unknown) { event.status = event.attemptCount >= 5 ? 'FAILED' : 'PENDING'; event.availableAt = new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** event.attemptCount))); event.leaseUntil = undefined; event.lastError = String((error as Error).message || error).slice(0, 500); await event.save(); throw error; }
  }
  static async consumeFinanceOutboxEvent(eventId: string) {
    const event = await OutboxEventModel.findOne({ eventId, eventType: 'payment.success' }).setOptions({ bypassTenantFilter: true }).lean();
    if (!event) throw new NotFoundError('Finance event not found');
    await DomainEventService.publish({tenantId:event.tenantId.toString(),eventId:`domain:${event.eventId}`,eventType:'payment.success',occurredAt:new Date(),resourceType:'Payment',resourceId:event.aggregateId.toString(),correlationId:event.eventId,depth:0,payloadVersion:1,payload:{amountMinor:event.payload.amountMinor,studentId:event.payload.studentUserId,paymentNumber:event.payload.paymentNumber,recipientUserId:event.payload.studentUserId}});
    return this.createIntent({ tenantId: event.tenantId.toString(), recipientUserId: String(event.payload.studentUserId || ''), type: 'payment.success', sourceType: 'Payment', sourceId: event.aggregateId.toString(), data: { paymentNumber: String(event.payload.paymentNumber || '') } });
  }

  private static dto(item: any) { return { id: item._id.toString(), type: item.type, category: item.category, title: item.title, body: item.body, actionUrl: item.actionUrl, createdAt: item.createdAt, readAt: item.readAt, isRead: Boolean(item.readAt), metadata: item.metadata || undefined }; }
  static async list(userId: string, page = 1, limit = 20) { const tenantId = this.tenant(); const safeLimit = Math.min(50, Math.max(1, limit)); const filter = { tenantId, recipientUserId: userId }; const [items, total] = await Promise.all([NotificationModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((Math.max(1, page) - 1) * safeLimit).limit(safeLimit).lean(), NotificationModel.countDocuments(filter)]); return { data: items.map(this.dto), pagination: { page: Math.max(1, page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } }; }
  static async unreadCount(userId: string) { return NotificationModel.countDocuments({ tenantId: this.tenant(), recipientUserId: userId, readAt: null }); }
  static async setRead(userId: string, id: string, read: boolean) { const item = await NotificationModel.findOneAndUpdate({ _id: id, tenantId: this.tenant(), recipientUserId: userId }, { $set: { readAt: read ? new Date() : null } }, { new: true }); if (!item) throw new NotFoundError('Notification not found'); return this.dto(item); }
  static async markAllRead(userId: string, cutoff = new Date()) { await NotificationModel.updateMany({ tenantId: this.tenant(), recipientUserId: userId, readAt: null, createdAt: { $lte: cutoff } }, { $set: { readAt: new Date() } }); return { cutoff, unreadCount: await this.unreadCount(userId) }; }

  static async claimDelivery(id: string, now = new Date()) { return NotificationDeliveryModel.findOneAndUpdate({ _id: id, attemptCount: { $lt: MAX_ATTEMPTS }, isRetryable: { $ne: false }, $or: [{ status: { $in: ['PENDING', 'FAILED'] }, nextRetryAt: { $lte: now } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }, { $set: { status: 'PROCESSING', leaseUntil: new Date(now.getTime() + LEASE_MS), lastAttemptAt: now }, $inc: { attemptCount: 1 } }, { new: true }).setOptions({ bypassTenantFilter: true }); }
  static async processDelivery(id: string) {
    const delivery = await this.claimDelivery(id); if (!delivery) return null;
    try {
      const [notification, recipient, settings] = await Promise.all([NotificationModel.findById(delivery.notificationId).setOptions({ bypassTenantFilter: true }).lean(), UserModel.findOne({ _id: delivery.recipientUserId, tenantId: delivery.tenantId }).setOptions({ bypassTenantFilter: true }).select('email status').lean(), OrganizationEmailSettingsModel.findOne({ tenantId: delivery.tenantId }).setOptions({ bypassTenantFilter: true })]);
      if (!notification || !recipient || recipient.status !== 'ACTIVE' || !recipient.email) { delivery.status = 'SKIPPED'; delivery.lastErrorCode = 'INVALID_RECIPIENT'; delivery.sanitizedLastError = 'Recipient is unavailable'; delivery.leaseUntil = undefined; await delivery.save(); return delivery; }
      if (!settings || settings.status === 'NOT_CONFIGURED') { delivery.status = 'SKIPPED'; delivery.lastErrorCode = 'EMAIL_NOT_CONFIGURED'; delivery.sanitizedLastError = 'Tenant email is not configured'; delivery.leaseUntil = undefined; await delivery.save(); return delivery; }
      const origin = await getCertificatePublicOrigin(delivery.tenantId.toString()); const actionUrl = notification.actionUrl ? `${origin}${notification.actionUrl}` : origin;
      const result = await EmailService.createProvider(settings).sendEmail({ to: recipient.email, subject: notification.title, text: `${notification.body}\n\n${actionUrl}`, html: `<h2>${escapeHtml(notification.title)}</h2><p>${escapeHtml(notification.body)}</p><p><a href="${escapeHtml(actionUrl)}">View details</a></p>`, fromName: settings.fromName, fromEmail: settings.fromEmail, replyTo: settings.replyTo });
      if (!result.success) throw new Error(result.error || 'Email provider rejected delivery');
      delivery.status = 'DELIVERED'; delivery.provider = settings.provider; delivery.providerMessageId = result.messageId; delivery.deliveredAt = new Date(); delivery.leaseUntil = undefined; delivery.sanitizedLastError = undefined; await delivery.save(); return delivery;
    } catch (error: unknown) { const message = String((error as Error).message || error).slice(0, 500); const permanent = /invalid|reject/i.test(message); delivery.status = 'FAILED'; delivery.failedAt = new Date(); delivery.leaseUntil = undefined; delivery.sanitizedLastError = message; delivery.lastErrorCode = permanent ? 'PERMANENT_REJECTION' : 'TRANSIENT_PROVIDER_ERROR'; delivery.isRetryable = !permanent && delivery.attemptCount < MAX_ATTEMPTS; delivery.nextRetryAt = delivery.isRetryable ? new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** delivery.attemptCount))) : undefined; await delivery.save(); throw error; }
  }
}
