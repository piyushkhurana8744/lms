export type ReconciliationKind = 'payment' | 'refund';
export declare function claimReconciliation(kind: ReconciliationKind, staleMinutes: number, now?: Date): Promise<any>;
export declare function releaseReconciliation(kind: ReconciliationKind, id: string, retryDelayMs: number, anomaly?: string): Promise<void>;
export declare function enqueueReconciliationBatch(queue: {
    add: Function;
}, options: {
    paymentStaleMinutes: number;
    refundStaleMinutes: number;
    batchSize: number;
}): Promise<number>;
//# sourceMappingURL=financeReconciliation.d.ts.map