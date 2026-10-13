import mongoose from 'mongoose';
import { getTransactionCapabilityOverride } from './transaction';
export * from './transaction';

export * from './plugin/tenantIsolationPlugin';
export * from './models/tenant.model';
export * from './models/user.model';
export * from './models/role.model';
export * from './models/session.model';
export * from './models/auditLog.model';
export * from './models/course.model';
export * from './models/courseModule.model';
export * from './models/lesson.model';
export * from './models/media.model';
export * from './models/websiteConfig.model';
export * from './models/enrollment.model';
export * from './models/lessonProgress.model';
export * from './models/organizationSettings.model';
export * from './models/organizationStorage.model';
export * from './models/organizationBranding.model';
export * from './models/organizationWebsite.model';
export * from './models/organizationMember.model';
export * from './models/organizationInvitation.model';
export * from './models/organizationEmailSettings.model';
export * from './models/organizationDomain.model';
export * from './models/batch.model';
export * from './models/class.model';
export * from './models/assessment.model';
export * from './models/submission.model';
export * from './models/lead.model';
export * from './models/leadActivity.model';
export * from './models/leadFollowUp.model';
export * from './models/admission.model';
export * from './models/feeStructure.model';
export * from './models/studentFeePlan.model';
export * from './models/payment.model';
export * from './models/financialLedger.model';
export * from './models/receipt.model';
export * from './models/refund.model';
export * from './models/paymentGatewayConfig.model';
export * from './models/financialSequence.model';
export * from './models/paymentWebhookEvent.model';
export * from './models/outboxEvent.model';
export * from './models/attendanceSession.model';
export * from './models/attendanceRecord.model';
export * from './models/attendanceCorrection.model';
export * from './models/certificate.model';
export * from './models/certificateSequence.model';
export * from './models/notification.model';
export * from './models/notificationDelivery.model';
export * from './models/notificationPreference.model';
export * from './models/notificationIntent.model';
export * from './models/academicCalendar.model';
export * from './models/calendarException.model';
export * from './models/academicRoom.model';
export * from './models/timetable.model';
export * from './models/schedulingMutex.model';
export * from './models/studentLifecycle.model';
export * from './models/studentLifecycleEvent.model';
export * from './models/studentSequence.model';
export * from './models/instructorAvailability.model';
export * from './models/branch.model';
export * from './models/analyticsExport.model';
export * from './models/communicationAnnouncement.model';
export * from './models/communicationConversation.model';
export * from './models/communicationMessage.model';
export * from './models/communicationReadState.model';
export * from './models/automation.model';
export * from './models/aiSettings.model';
export * from './models/aiExecution.model';
export * from './models/aiUsage.model';
export * from './models/aiQuota.model';
export * from './models/integrationConnection.model';
export * from './models/externalAcademicResource.model';
export * from './models/externalMeeting.model';
export * from './models/integrationOperation.model';
export * from './models/integrationSyncRun.model';
export * from './models/integrationWebhookEvent.model';
export * from './models/integrationOAuthState.model';
export * from './models/liveMeetingAssociationHistory.model';
export * from './models/attendanceEvidence.model';



/**
 * MongoDB Connection Lifecycle Manager (@edtech/database)
 */
let isConnected = false;
let transactionCapable = false;

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('[Database] MongoDB connection established.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[Database] MongoDB connection lost.');
  });

  try {
    const isLocalhost = uri.includes('127.0.0.1') || uri.includes('localhost');
    const hasDirectConnParam = uri.includes('directConnection=');
    const conn = await mongoose.connect(uri, {
      // Production indexes are applied explicitly by versioned migration scripts.
      // Automatic reconciliation during application startup can lock large collections.
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
      ...(isLocalhost && !hasDirectConnParam ? { directConnection: true } : {})
    });
    isConnected = true;
    const hello = await conn.connection.db?.admin().command({ hello: 1 });
    transactionCapable = Boolean(hello?.setName && hello?.logicalSessionTimeoutMinutes);
    console.log(`[Database] MongoDB Connected to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB Connection Failure:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB connection closed gracefully.');
  }
}

export function getDatabaseState(): 'connected' | 'disconnected' | 'connecting' {
  const stateMap: Record<number, 'disconnected' | 'connected' | 'connecting'> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnected'
  };
  return stateMap[mongoose.connection.readyState] || 'disconnected';
}

export function isDatabaseTransactionCapable(): boolean {
  const override = getTransactionCapabilityOverride();
  return override === undefined ? isConnected && transactionCapable : override;
}
