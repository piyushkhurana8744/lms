import { z } from 'zod';
import { PERMISSIONS } from '@edtech/permissions';
import { BadRequestError } from '../errors/appError';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'objectId';
type TriggerDefinition = { source: string; resourceType: string; fields: Record<string, FieldType>; branch: 'OPTIONAL' | 'REQUIRED' };
export const AUTOMATION_TRIGGERS: Record<string, TriggerDefinition> = {
  'lead.created': { source: 'CRM', resourceType: 'Lead', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.name': 'string', 'payload.source': 'string', 'payload.stage': 'string', 'payload.courseId': 'objectId', 'branchId': 'objectId' } },
  'admission.confirmed': { source: 'CRM', resourceType: 'Admission', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.studentId': 'objectId', 'payload.courseId': 'objectId', 'branchId': 'objectId' } },
  'payment.success': { source: 'FINANCE', resourceType: 'Payment', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.amountMinor': 'number', 'payload.studentId': 'objectId', 'branchId': 'objectId' } },
  'attendance.session_finalized': { source: 'ATTENDANCE', resourceType: 'AttendanceSession', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'payload.classId': 'objectId', 'branchId': 'objectId' } },
  'certificate.issued': { source: 'CERTIFICATE', resourceType: 'Certificate', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.studentId': 'objectId', 'branchId': 'objectId' } },
  'certificate.revoked': { source: 'CERTIFICATE', resourceType: 'Certificate', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.studentId': 'objectId', 'branchId': 'objectId' } },
  'class.created': { source: 'ACADEMIC', resourceType: 'Class', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'payload.startAt': 'date', 'payload.batchId': 'objectId', 'branchId': 'objectId' } },
  'class.rescheduled': { source: 'ACADEMIC', resourceType: 'Class', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'payload.startAt': 'date', 'branchId': 'objectId' } },
  'class.cancelled': { source: 'ACADEMIC', resourceType: 'Class', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'branchId': 'objectId' } },
  'student.activated': { source: 'LIFECYCLE', resourceType: 'StudentLifecycle', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'payload.studentId': 'objectId', 'branchId': 'objectId' } },
  'student.batch_transferred': { source: 'LIFECYCLE', resourceType: 'StudentLifecycle', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.recipientUserId': 'objectId', 'payload.batchName': 'string', 'branchId': 'objectId' } },
  'student.branch_transferred': { source: 'LIFECYCLE', resourceType: 'StudentLifecycle', branch: 'REQUIRED', fields: { 'resourceId': 'objectId', 'payload.fromBranchId': 'objectId', 'payload.toBranchId': 'objectId', 'branchId': 'objectId' } },
  'announcement.published': { source: 'COMMUNICATION', resourceType: 'CommunicationAnnouncement', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.priority': 'string', 'branchId': 'objectId' } },
  'integration.connection_failed': { source: 'INTEGRATION', resourceType: 'IntegrationConnection', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.provider': 'string', 'branchId': 'objectId' } },
  'integration.reauth_required': { source: 'INTEGRATION', resourceType: 'IntegrationConnection', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.provider': 'string', 'branchId': 'objectId' } },
  'class.external_meeting_ready': { source: 'ACADEMIC', resourceType: 'Class', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.provider': 'string', 'branchId': 'objectId' } },
  'class.external_meeting_sync_failed': { source: 'ACADEMIC', resourceType: 'Class', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.provider': 'string', 'branchId': 'objectId' } },
  'class.recording_available': { source: 'ACADEMIC', resourceType: 'Class', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.recordingId': 'string', 'branchId': 'objectId' } },
  'class.transcript_available': { source: 'ACADEMIC', resourceType: 'Class', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.transcriptId': 'string', 'branchId': 'objectId' } },
  'classroom.sync_completed': { source: 'ACADEMIC', resourceType: 'ExternalAcademicResource', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.status': 'string', 'branchId': 'objectId' } },
  'classroom.sync_failed': { source: 'ACADEMIC', resourceType: 'ExternalAcademicResource', branch: 'OPTIONAL', fields: { 'resourceId': 'objectId', 'payload.error': 'string', 'branchId': 'objectId' } }
};

if (process.env.NODE_ENV === 'test') {
  AUTOMATION_TRIGGERS['integration.cycle_a'] = { source: 'INTEGRATION', resourceType: 'Fixture', branch: 'OPTIONAL', fields: {} };
  AUTOMATION_TRIGGERS['integration.cycle_b'] = { source: 'INTEGRATION', resourceType: 'Fixture', branch: 'OPTIONAL', fields: {} };
}

export const AUTOMATION_ACTIONS: Record<string, any> = {
  AI_CLASSIFY_LEAD: {
    description: 'Generate a typed Phase 22 CRM lead classification', requiredPermission: PERMISSIONS.AI_CRM_GENERATE,
    supportedSources: ['CRM'], idempotency: 'AIExecution automationExecutionId + stepId', retryClassification: 'Committed AI result is reused after worker recovery',
    inputExample: { leadId: '${resourceId}', maxOutputTokens: 1000 }, schema: z.object({ leadId: z.string().regex(/^\$\{(?:resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i), maxOutputTokens: z.number().int().min(100).max(4096).default(1000) }).strict()
  },
  CRM_CREATE_FOLLOWUP: {
    description: 'Create a canonical CRM follow-up', requiredPermission: PERMISSIONS.FOLLOW_UP_MANAGE,
    supportedSources: ['CRM'], idempotency: 'executionId + stepId',
    inputExample: { leadId:'${resourceId}',type:'CALL',dueInSeconds:3600,note:'Automated follow-up' }, schema: z.object({ leadId: z.string().regex(/^\$\{(?:resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i), type: z.enum(['CALL','WHATSAPP','EMAIL','DEMO','COUNSELLING','GENERAL']).default('CALL'), dueInSeconds: z.number().int().min(0).max(31_536_000), note: z.string().max(500).optional(), assignedTo: z.string().regex(/^\$\{(?:actorId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i).optional() }).strict()
  },
  NOTIFICATION_CREATE: {
    description: 'Enqueue a canonical Phase 14 notification intent', requiredPermission: PERMISSIONS.ORGANIZATION_NOTIFICATIONS_UPDATE,
    supportedSources: ['CRM','FINANCE','ACADEMIC','LIFECYCLE','CERTIFICATE','ATTENDANCE','INTEGRATION'], idempotency: 'NotificationIntent.eventId = executionId + stepId', retryClassification: 'INTERNAL transient; validation/domain errors terminal',
    inputExample: { recipientUserId:'${payload.recipientUserId}',notificationType:'payment.success',data:{} }, schema: z.object({ recipientUserId: z.string().regex(/^\$\{(?:actorId|resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i), notificationType: z.enum(['payment.success','admission.confirmed','certificate.issued','certificate.revoked','class.rescheduled','class.cancelled','student.activated','student.batch_transferred']), data: z.record(z.string(), z.union([z.string().max(500),z.number().finite()])).default({}) }).strict()
  },
  COMMUNICATION_SEND_ANNOUNCEMENT: {
    description: 'Create and publish a canonical Phase 20 announcement', requiredPermission: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH,
    supportedSources: ['CRM','FINANCE','ACADEMIC','LIFECYCLE','CERTIFICATE','INTEGRATION'], idempotency: 'CommunicationAnnouncement tenant + executionId + stepId', retryClassification: 'INTERNAL transient; authorization/domain errors terminal',
    inputExample: { title:'Institution update',body:'A new update is available.',priority:'NORMAL',audienceType:'ALL_AUTHORIZED',audienceCriteria:{},channels:['IN_APP'] }, schema: z.object({ title: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000), priority: z.enum(['NORMAL','IMPORTANT','URGENT']).default('NORMAL'), audienceType: z.enum(['ALL_AUTHORIZED','BRANCH','BATCH','COURSE','STUDENTS','INSTRUCTORS','STAFF','SPECIFIC_USERS']), audienceCriteria: z.object({ branchIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).optional(), batchIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).optional(), courseIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).optional(), userIds: z.array(z.string().regex(/^\$\{(?:actorId|resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i)).max(500).optional(), roles: z.array(z.string().max(60)).max(20).optional() }).strict().default({}), branchId: z.string().regex(/^\$\{(?:branchId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i).optional(), channels: z.array(z.enum(['IN_APP','EMAIL'])).min(1).max(2).default(['IN_APP']) }).strict()
  },
  INTEGRATION_RETRY_SYNC: {
    description: 'Retry a failed integration operation or synchronization', requiredPermission: PERMISSIONS.INTEGRATIONS_SYNC,
    supportedSources: ['INTEGRATION', 'ACADEMIC'], idempotency: 'executionId + stepId',
    inputExample: { operationId: '${resourceId}' }, schema: z.object({ operationId: z.string().regex(/^\$\{(?:resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i) }).strict()
  },
  CLASSROOM_SYNC_RESOURCE: {
    description: 'Trigger synchronization for a mapped Google Classroom resource', requiredPermission: PERMISSIONS.INTEGRATIONS_SYNC,
    supportedSources: ['ACADEMIC', 'INTEGRATION'], idempotency: 'executionId + stepId',
    inputExample: { linkId: '${resourceId}' }, schema: z.object({ linkId: z.string().regex(/^\$\{(?:resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i) }).strict()
  },
  LIVE_MEETING_RETRY: {
    description: 'Retry scheduling or synchronization of a live meeting', requiredPermission: PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    supportedSources: ['ACADEMIC', 'INTEGRATION'], idempotency: 'executionId + stepId',
    inputExample: { classId: '${resourceId}' }, schema: z.object({ classId: z.string().regex(/^\$\{(?:resourceId|payload\.[a-zA-Z0-9_]+)\}$|^[a-f\d]{24}$/i) }).strict()
  }
};

if (process.env.NODE_ENV === 'test') {
  AUTOMATION_ACTIONS.INTEGRATION_EMIT_EVENT = {
    description: 'Emit a durable integration-only automation event', requiredPermission: PERMISSIONS.SUPERADMIN_ALL,
    supportedSources: ['INTEGRATION'], idempotency: 'AutomationEvent.eventId = executionId + stepId + event',
    inputExample: { eventType: 'integration.cycle_b' }, schema: z.object({ eventType: z.enum(['integration.cycle_a', 'integration.cycle_b']) }).strict()
  };
}

const ordered = new Set(['GREATER_THAN','GREATER_THAN_OR_EQUAL','LESS_THAN','LESS_THAN_OR_EQUAL']);
export function validateAutomationDefinition(input: any, permissions: string[]) {
  const trigger = AUTOMATION_TRIGGERS[input.triggerType];
  if (!trigger) throw new BadRequestError('Unknown automation trigger');
  const ids = new Set<string>();
  if (input.triggerType === 'announcement.published' && input.steps.some((step:any)=>step.actionType === 'COMMUNICATION_SEND_ANNOUNCEMENT')) throw new BadRequestError('Communication announcement automations cannot directly self-trigger');
  for (const condition of input.conditions?.items || []) {
    const type = trigger.fields[condition.field];
    if (!type) throw new BadRequestError(`Condition field is not registered: ${condition.field}`);
    if (ordered.has(condition.operator) && !['number','date'].includes(type)) throw new BadRequestError(`Operator ${condition.operator} is invalid for ${type}`);
    if (['IN','NOT_IN'].includes(condition.operator) && !Array.isArray(condition.value)) throw new BadRequestError(`${condition.operator} requires an array`);
  }
  for (const step of input.steps) {
    if (ids.has(step.stepId)) throw new BadRequestError('Step identifiers must be unique'); ids.add(step.stepId);
    if (step.type === 'ACTION') {
      const action = (AUTOMATION_ACTIONS as any)[step.actionType];
      if (!action) throw new BadRequestError(`Unknown automation action: ${step.actionType}`);
      if (!action.supportedSources.includes(trigger.source)) throw new BadRequestError(`${step.actionType} does not support ${trigger.source} triggers`);
      if (!permissions.includes(action.requiredPermission) && !permissions.includes(PERMISSIONS.SUPERADMIN_ALL)) throw new BadRequestError(`Missing action capability: ${action.requiredPermission}`);
      action.schema.parse(step.inputs);
    }
  }
}

export function registryResponse(permissions: string[] = []) {
  return {
    triggers: Object.entries(AUTOMATION_TRIGGERS).map(([type, d]) => ({ type, ...d })),
    operators: ['EQUALS','NOT_EQUALS','IN','NOT_IN','GREATER_THAN','GREATER_THAN_OR_EQUAL','LESS_THAN','LESS_THAN_OR_EQUAL','EXISTS','NOT_EXISTS'],
    actions: Object.entries(AUTOMATION_ACTIONS).filter(([,d])=>permissions.includes(d.requiredPermission)||permissions.includes(PERMISSIONS.SUPERADMIN_ALL)).map(([type, d]) => ({ type, description: d.description, requiredPermission: d.requiredPermission, supportedSources: d.supportedSources, inputExample:d.inputExample, idempotency: d.idempotency, retryClassification: (d as any).retryClassification || 'Domain errors terminal; infrastructure failures retryable' }))
  };
}
