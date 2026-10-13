import { ClientSession } from 'mongoose';
import { AutomationEventModel } from '@edtech/database';
import { AutomationEventEnvelopeSchema } from '@edtech/validation';

type FailurePoint = 'BEFORE_INSERT' | 'AFTER_INSERT' | null;
let failurePoint: FailurePoint = null;
export function setDomainEventFailurePoint(point: FailurePoint) {
  if (process.env.NODE_ENV !== 'test' && point) throw new Error('Domain event failure injection is test-only');
  failurePoint = point;
}

/** Canonical durable domain-event publisher. Always accepts the caller's Mongo session. */
export class DomainEventService {
  static async publish(raw: unknown, session?: ClientSession) {
    const event = AutomationEventEnvelopeSchema.parse(raw);
    if (failurePoint === 'BEFORE_INSERT') throw new Error('Injected failure before domain event insertion');
    const doc = await AutomationEventModel.findOneAndUpdate(
      { eventId: event.eventId },
      { $setOnInsert: { ...event, status: 'PENDING', availableAt: new Date(), attemptCount: 0 } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true }
    );
    if (failurePoint === 'AFTER_INSERT') throw new Error('Injected failure after domain event insertion');
    return doc;
  }
}
