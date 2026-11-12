import { authorizeInternalSystemCaller, NotificationDeliveryModel, NotificationIntentModel, OutboxEventModel } from '@edtech/database';
import { NotificationService } from '../notification.service';

function authority() {
  process.env.INTERNAL_WORKER_SECRET ||= 'wave07-notification-test-secret';
  return authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'notification-integration-test')!;
}

export async function consumeNotificationIntent(eventId: string) {
  const binding = await NotificationIntentModel.collection.findOne({ eventId }, { projection: { tenantId: 1 } });
  return NotificationService.consumeOutboxEvent(eventId, authority(), binding?.tenantId?.toString());
}

export async function consumeFinanceOutbox(eventId: string) {
  const binding = await OutboxEventModel.collection.findOne({ eventId }, { projection: { tenantId: 1 } });
  return NotificationService.consumeFinanceOutboxEvent(eventId, authority(), binding?.tenantId?.toString());
}

export async function processNotificationDelivery(id: string) {
  const binding = await NotificationDeliveryModel.collection.findOne({ _id: new NotificationDeliveryModel({ _id: id })._id }, { projection: { tenantId: 1 } });
  return NotificationService.processDelivery(id, authority(), binding?.tenantId?.toString());
}
