export interface NotificationQueue {
    add(name: string, data: {
        deliveryId: string;
    }, options: Record<string, unknown>): Promise<unknown>;
}
export declare function enqueuePendingNotificationDeliveries(queue: NotificationQueue, limit?: number, now?: Date): Promise<number>;
export declare function recoverNotificationIntents(consume: (eventId: string) => Promise<void>, limit?: number, now?: Date): Promise<number>;
//# sourceMappingURL=notificationDispatcher.d.ts.map