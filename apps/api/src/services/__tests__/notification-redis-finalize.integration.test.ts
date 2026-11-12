import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { processNotificationDelivery } from './notification-system-test-helper';
import { NotificationDeliveryModel, NotificationModel, OrganizationEmailSettingsModel, connectDatabase, disconnectDatabase } from '@edtech/database';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification.service';

const suite = process.env.REDIS_RECOVERY_PROOF === 'FINALIZE' ? describe : describe.skip;
suite('Phase 14 real Redis recovery final delivery proof', () => {
  beforeAll(async () => { process.env.WEB_APP_URL = 'https://learn.didm.test'; await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'); });
  afterAll(async () => { vi.restoreAllMocks(); await disconnectDatabase(); });
  it('delivers the recovered queued record once through the provider abstraction', async () => {
    const notification = await NotificationModel.collection.findOne({ sourceId: 'phase14-real-redis-outage' }); expect(notification).not.toBeNull();
    const delivery = await NotificationDeliveryModel.collection.findOne({ notificationId: notification!._id }); expect(delivery?.status).toBe('PENDING');
    await OrganizationEmailSettingsModel.collection.deleteMany({ tenantId: notification!.tenantId }); await OrganizationEmailSettingsModel.create({ tenantId: notification!.tenantId, provider: 'SMTP', status: 'VERIFIED', fromName: 'Recovery', fromEmail: 'recovery@example.com' });
    const sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'redis-recovered-message' }); vi.spyOn(EmailService, 'createProvider').mockReturnValue({ sendEmail, verifyConnection: vi.fn(), getProviderName: () => 'DOUBLE' });
    await Promise.all(Array.from({ length: 10 }, () => processNotificationDelivery(delivery!._id.toString())));
    const saved = await NotificationDeliveryModel.collection.findOne({ _id: delivery!._id }); expect(saved?.status).toBe('DELIVERED'); expect(saved?.providerMessageId).toBe('redis-recovered-message'); expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
