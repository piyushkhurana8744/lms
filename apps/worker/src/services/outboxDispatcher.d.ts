export declare const OUTBOX_MAX_ATTEMPTS = 5;
export declare const OUTBOX_LEASE_MS = 60000;
export interface QueuePublisher {
    add(name: string, data: any, options: any): Promise<any>;
}
export declare function claimOutboxEvent(now?: Date): Promise<(import("mongoose").Document<unknown, {}, import("@edtech/database").IOutboxEventDocument, {}, {}> & import("@edtech/database").IOutboxEventDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function dispatchClaimedEvent(event: any, queue: QueuePublisher, processReceipt?: (receiptId: string) => Promise<void>, afterPublish?: () => Promise<void>): Promise<boolean>;
export declare function dispatchOutboxBatch(queue: QueuePublisher, processReceipt?: (receiptId: string) => Promise<void>, batchSize?: number): Promise<number>;
//# sourceMappingURL=outboxDispatcher.d.ts.map