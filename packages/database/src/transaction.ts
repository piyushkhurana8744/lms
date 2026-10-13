import mongoose, { ClientSession } from 'mongoose';

let transactionCapabilityOverride: boolean | undefined;

export function setTransactionCapabilityOverride(value?: boolean): void {
  if (process.env.NODE_ENV !== 'test' && value !== undefined) throw new Error('Transaction capability override is test-only');
  transactionCapabilityOverride = value;
}

export function getTransactionCapabilityOverride(): boolean | undefined {
  return transactionCapabilityOverride;
}

type TransactionOptions = NonNullable<Parameters<ClientSession['withTransaction']>[1]>;

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' }
};

export async function runInTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = DEFAULT_TRANSACTION_OPTIONS
): Promise<T> {
  if (transactionCapabilityOverride === false) throw new Error('MongoDB transactions are unavailable');
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await operation(session);
    }, options);
    if (result === undefined) throw new Error('Transaction completed without a result');
    return result;
  } finally {
    await session.endSession();
  }
}

export async function verifyTransactionSupport(): Promise<boolean> {
  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  return Boolean(hello?.setName && hello?.logicalSessionTimeoutMinutes);
}
