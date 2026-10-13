import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AutomationEventModel, AutomationExecutionModel, AutomationModel, AutomationStepExecutionModel, TenantModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { AuditService } from './audit.service';
import { BranchAccessService } from './branchAccess.service';
import { CRMService } from './crm.service';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/appError';
import { AUTOMATION_ACTIONS, validateAutomationDefinition } from './automationRegistry.service';
import { NotificationService } from './notification.service';
import { CommunicationAnnouncementService } from './communication/communicationAnnouncement.service';
import { DomainEventService } from './domainEvent.service';
import { AIService } from './ai/ai.service';

const MAX_DEPTH = 8, MAX_ATTEMPTS = 5, LEASE_MS = 60_000;
let crashAfterAction: string | null = null;
export function setAutomationCrashAfterAction(actionType: string | null) { if (process.env.NODE_ENV !== 'test' && actionType) throw new Error('Automation crash injection is test-only'); crashAfterAction=actionType; }
type Actor = { userId: string; isSuperAdmin?: boolean; permissions: string[] };
const ctxTenant = () => { const id = tenantContextStorage.getStore()?.currentTenantId; if (!id) throw new BadRequestError('Tenant context required'); return id; };
const safeError = (e: any) => String(e?.message || 'Automation action failed').slice(0, 500);
const pathValue = (source: any, path: string) => path.split('.').reduce((v, k) => v == null ? undefined : v[k], source);
const resolveInput = (value: unknown, context: any): any => typeof value === 'string' && /^\$\{[^}]+\}$/.test(value) ? pathValue(context, value.slice(2, -1)) : value;

export class AutomationService {
  static async assertScope(actor: Actor, branchMode: string, branchIds: string[]) {
    const tenantId = ctxTenant(), scope = await BranchAccessService.getScope(tenantId, actor);
    if (scope.mode === 'SELECTED' && branchMode === 'ALL') throw new BadRequestError('Branch-scoped actors cannot create tenant-wide automations');
    for (const branchId of branchIds) await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, { requireActive: true });
    if (branchMode === 'SELECTED' && !branchIds.length) throw new BadRequestError('At least one branch is required');
  }
  static async create(input: any, actor: Actor) {
    const tenantId = ctxTenant(), scope=await BranchAccessService.getScope(tenantId,actor);
    if(input.branchMode==='SELECTED'&&!input.branchIds.length&&scope.mode==='SELECTED')input={...input,branchIds:[...scope.branchIds]};
    validateAutomationDefinition(input, actor.permissions); await this.assertScope(actor, input.branchMode, input.branchIds);
    const doc = await AutomationModel.create({ ...input, tenantId, createdBy: actor.userId, updatedBy: actor.userId });
    await AuditService.logEvent({ tenantId, actorId: actor.userId, action: 'AUTOMATION_CREATED', resource: 'Automation', resourceId: doc.id }); return doc;
  }
  static async update(id: string, patch: any, actor: Actor) {
    const tenantId = ctxTenant(), current: any = await AutomationModel.findOne({ _id: id, tenantId }); if (!current) throw new NotFoundError('Automation not found');
    if (current.status === 'ARCHIVED') throw new ConflictError('Archived automation cannot be edited');
    let merged = { ...current.toObject(), ...patch, conditions: patch.conditions || current.conditions, steps: patch.steps || current.steps };
    const scope=await BranchAccessService.getScope(tenantId,actor);if(merged.branchMode==='SELECTED'&&!merged.branchIds.length&&scope.mode==='SELECTED')merged={...merged,branchIds:[...scope.branchIds]};
    validateAutomationDefinition(merged, actor.permissions); await this.assertScope(actor, merged.branchMode, merged.branchIds.map(String));
    if (current.status === 'ACTIVE') current.status = 'DRAFT';
    Object.assign(current, patch, { branchIds:merged.branchIds,updatedBy: actor.userId }); await current.save();
    await AuditService.logEvent({ tenantId, actorId: actor.userId, action: 'AUTOMATION_UPDATED', resource: 'Automation', resourceId: id }); return current;
  }
  static async transition(id: string, action: 'activate'|'pause'|'archive', actor: Actor) {
    const tenantId = ctxTenant(), current: any = await AutomationModel.findOne({ _id: id, tenantId }); if (!current) throw new NotFoundError('Automation not found');
    const allowed: any = { activate: ['DRAFT','PAUSED'], pause: ['ACTIVE'], archive: ['DRAFT','PAUSED','ACTIVE'] };
    if (!allowed[action].includes(current.status)) throw new ConflictError(`Cannot ${action} automation from ${current.status}`);
    if (action === 'activate') { validateAutomationDefinition(current.toObject(), actor.permissions); await this.assertScope(actor, current.branchMode, current.branchIds.map(String)); }
    const set:any={updatedBy:new Types.ObjectId(actor.userId),status:action==='activate'?'ACTIVE':action==='pause'?'PAUSED':'ARCHIVED'};
    if(action==='activate'){set.publishedAt=new Date();set.capabilitySnapshot=actor.permissions;}
    if(action==='archive')set.archivedAt=new Date();
    const update:any={$set:set};if(action==='activate')update.$inc={version:1};
    const transitioned:any=await AutomationModel.findOneAndUpdate({_id:id,tenantId,status:{$in:allowed[action]}},update,{new:true});
    if(!transitioned)throw new ConflictError(`Cannot ${action} automation because its state changed`);
    await AuditService.logEvent({ tenantId, actorId: actor.userId, action: `AUTOMATION_${action.toUpperCase()}`, resource: 'Automation', resourceId: id, metadata: { version: transitioned.version } }); return transitioned;
  }
  static async list(query: any, actor: Actor) {
    const tenantId=ctxTenant(), scope=await BranchAccessService.getScope(tenantId, actor), filter:any={tenantId};
    if(query.status)filter.status=query.status; if(query.search)filter.$text?filter.$text={$search:query.search}:filter.name={$regex:query.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
    if(scope.mode==='SELECTED')filter.$or=[{branchMode:'SELECTED',branchIds:{$in:scope.branchIds.map((x)=>new Types.ObjectId(x))}}];
    const [data,total]=await Promise.all([AutomationModel.find(filter).sort({[query.sort]:query.order==='asc'?1:-1}).skip((query.page-1)*query.limit).limit(query.limit).lean(),AutomationModel.countDocuments(filter)]);
    return {data,pagination:{page:query.page,limit:query.limit,total,pages:Math.ceil(total/query.limit)}};
  }
  static async get(id:string, actor:Actor){ const tenantId=ctxTenant(), doc:any=await AutomationModel.findOne({_id:id,tenantId}).lean(); if(!doc)throw new NotFoundError('Automation not found'); if(doc.branchMode==='SELECTED')for(const b of doc.branchIds)await BranchAccessService.assertBranchAccess(tenantId,actor,String(b)); return doc; }
  static async publishEvent(envelope:any){
    if(envelope.depth>MAX_DEPTH)throw new BadRequestError('Maximum automation chain depth exceeded');
    const json=JSON.stringify(envelope.payload); if(Buffer.byteLength(json)>64*1024)throw new BadRequestError('Automation event payload exceeds 64 KiB');
    return AutomationEventModel.findOneAndUpdate({eventId:envelope.eventId},{$setOnInsert:{...envelope,status:'PENDING',availableAt:new Date(),attemptCount:0}},{upsert:true,new:true});
  }
  static async processNextEvent(now=new Date()){
    const event:any=await AutomationEventModel.findOneAndUpdate({availableAt:{$lte:now},$or:[{status:{$in:['PENDING','FAILED']}},{status:'PROCESSING',leaseUntil:{$lt:now}}]},{$set:{status:'PROCESSING',leaseUntil:new Date(now.getTime()+LEASE_MS)},$inc:{attemptCount:1}},{sort:{createdAt:1},new:true}).setOptions({bypassTenantFilter:true});
    if(!event)return null;
    try { const tenant=await TenantModel.findById(event.tenantId).select('status').lean();if(!tenant||tenant.status!=='ACTIVE')throw new ConflictError('Tenant is suspended or inactive');await tenantContextStorage.run({currentTenantId:String(event.tenantId),currentUserId:'automation-worker',isPlatformContext:false,allowedTenantIds:[String(event.tenantId)]},async()=>{
      const branch:any=event.branchId?{branchMode:'ALL'}:null;
      const autos:any[]=await AutomationModel.find({tenantId:event.tenantId,status:'ACTIVE',triggerType:event.eventType,...(event.branchId?{$or:[{branchMode:'ALL'},{branchMode:'SELECTED',branchIds:event.branchId}]}:{branchMode:'ALL'})});
      for(const automation of autos)await this.createExecution(event,automation);
    }); event.status='PROCESSED';event.processedAt=new Date();event.leaseUntil=undefined;await event.save(); return event;
    } catch(e){event.status='FAILED';event.availableAt=new Date(Date.now()+Math.min(300_000,1000*2**Math.min(event.attemptCount,8)));event.lastError=safeError(e);event.leaseUntil=undefined;await event.save();throw e;}
  }
  static conditionsPass(conditions:any, context:any){const results=(conditions.items||[]).map((c:any)=>{const actual=pathValue(context,c.field);switch(c.operator){case'EQUALS':return actual===c.value;case'NOT_EQUALS':return actual!==c.value;case'IN':return c.value.includes(actual);case'NOT_IN':return!c.value.includes(actual);case'GREATER_THAN':return actual>c.value;case'GREATER_THAN_OR_EQUAL':return actual>=c.value;case'LESS_THAN':return actual<c.value;case'LESS_THAN_OR_EQUAL':return actual<=c.value;case'EXISTS':return actual!==undefined&&actual!==null;case'NOT_EXISTS':return actual===undefined||actual===null;default:return false;}});return conditions.mode==='ANY'?results.some(Boolean):results.every(Boolean);}
  static async createExecution(event:any, automation:any){
    const context={eventId:event.eventId,eventType:event.eventType,resourceId:event.resourceId,resourceType:event.resourceType,branchId:event.branchId?.toString(),actorId:event.actorId?.toString(),payload:event.payload};
    const snapshot={name:automation.name,triggerType:automation.triggerType,conditions:automation.conditions,steps:automation.steps,branchMode:automation.branchMode,branchIds:automation.branchIds,capabilitySnapshot:automation.capabilitySnapshot,activationActorId:automation.updatedBy};
    let execution:any;try{execution=await AutomationExecutionModel.create({tenantId:event.tenantId,automationId:automation._id,automationVersion:automation.version,triggerEventId:event.eventId,triggerType:event.eventType,resourceType:event.resourceType,resourceId:event.resourceId,branchId:event.branchId,status:'PENDING',currentStep:0,snapshot,context,correlationId:event.correlationId,causationId:event.causationId,depth:event.depth});}catch(e:any){if(e.code===11000)return AutomationExecutionModel.findOne({tenantId:event.tenantId,triggerEventId:event.eventId,automationId:automation._id,automationVersion:automation.version});throw e;}
    if(!this.conditionsPass(automation.conditions,context)){execution.status='COMPLETED';execution.completedAt=new Date();execution.context={...context,conditionResult:false};await execution.save();return execution;}
    return this.runExecution(execution._id.toString());
  }
  static async runExecution(id:string, now=new Date()){
    const execution:any=await AutomationExecutionModel.findById(id).setOptions({bypassTenantFilter:true});if(!execution||['COMPLETED','CANCELLED','DEAD_LETTER'].includes(execution.status))return execution;
    const tenant=await TenantModel.findById(execution.tenantId).select('status').lean();if(!tenant||tenant.status!=='ACTIVE'){execution.status='WAITING';execution.nextRunAt=new Date(now.getTime()+60_000);execution.error={category:'AUTHORIZATION',message:'Tenant is suspended or inactive'};await execution.save();return execution;}
    if(execution.depth>=MAX_DEPTH){execution.status='DEAD_LETTER';execution.error={category:'VALIDATION',message:'Maximum automation chain depth exceeded'};await execution.save();return execution;}
    execution.status='RUNNING';execution.startedAt ||= now;await execution.save();
    const steps:any[]=(execution.snapshot as any).steps;
    while(execution.currentStep<steps.length){const step=steps[execution.currentStep],key=`${execution._id}:${step.stepId}`;let sx:any=await AutomationStepExecutionModel.findOneAndUpdate({executionId:execution._id,stepId:step.stepId},{$setOnInsert:{tenantId:execution.tenantId,stepIndex:execution.currentStep,actionType:step.actionType,status:'PENDING',attemptCount:0,idempotencyKey:key}},{upsert:true,new:true}).setOptions({bypassTenantFilter:true});
      if(sx.status==='COMPLETED'){execution.currentStep++;await execution.save();continue;}
      if(step.type==='DELAY'){const wake=sx.nextAttemptAt||new Date(now.getTime()+step.delaySeconds*1000);if(!sx.nextAttemptAt){sx.status='WAITING';sx.nextAttemptAt=wake;await sx.save();execution.status='WAITING';execution.nextRunAt=wake;await execution.save();return execution;}if(wake>now)return execution;sx.status='COMPLETED';sx.completedAt=now;await sx.save();execution.currentStep++;continue;}
      const claimed:any=await AutomationStepExecutionModel.findOneAndUpdate({_id:sx._id,status:{$in:['PENDING','FAILED']},$or:[{nextAttemptAt:{$exists:false}},{nextAttemptAt:{$lte:now}}]},{$set:{status:'RUNNING',startedAt:now},$inc:{attemptCount:1}},{new:true}).setOptions({bypassTenantFilter:true});if(!claimed)return execution;sx=claimed;
      try{const result=await this.executeAction(step,execution.context,key,execution);if(crashAfterAction===step.actionType){crashAfterAction=null;const crash:any=new Error('Injected worker crash after canonical action commit');crash.simulatedCrash=true;throw crash;}sx.status='COMPLETED';sx.completedAt=new Date();sx.result=result;await sx.save();execution.currentStep++;execution.nextRunAt=undefined;await execution.save();}
      catch(e:any){if(e?.simulatedCrash)throw e;const category=e?.statusCode===400?'VALIDATION':e?.statusCode===403?'AUTHORIZATION':e?.statusCode===409?'DOMAIN_CONFLICT':'INTERNAL';sx.error={category,message:safeError(e)};if(category==='INTERNAL'&&sx.attemptCount<MAX_ATTEMPTS){sx.status='FAILED';sx.nextAttemptAt=new Date(Date.now()+Math.min(300_000,1000*2**sx.attemptCount));execution.status='WAITING';execution.nextRunAt=sx.nextAttemptAt;}else{sx.status='FAILED';execution.status=sx.attemptCount>=MAX_ATTEMPTS?'DEAD_LETTER':'FAILED';execution.failedAt=new Date();execution.error=sx.error;}await sx.save();await execution.save();return execution;}
    }
    execution.status='COMPLETED';execution.completedAt=new Date();execution.nextRunAt=undefined;await execution.save();return execution;
  }
  static async executeAction(step:any,context:any,key:string,execution:any){
    const definition:any=(AUTOMATION_ACTIONS as any)[step.actionType];
    const approved:string[]=(execution.snapshot as any).capabilitySnapshot||[];
    if(!definition||(!approved.includes(definition.requiredPermission)&&!approved.includes('superadmin.all')))throw new BadRequestError('Action was not approved in the immutable activation capability snapshot');
    if(step.actionType==='AI_CLASSIFY_LEAD'){const input:any={};for(const[k,v]of Object.entries(step.inputs||{}))input[k]=resolveInput(v,context);const actorId=String((execution.snapshot as any).activationActorId);const ai:any=await AIService.execute({capability:'CRM_LEAD_CLASSIFICATION',leadId:input.leadId,maxOutputTokens:input.maxOutputTokens,automationExecutionId:execution._id.toString(),automationStepId:step.stepId,correlationId:execution.correlationId},{userId:actorId,permissions:approved});return{resourceType:'AIExecution',resourceId:ai._id.toString(),status:ai.status,output:ai.structuredResult,promptVersion:ai.promptVersion,model:ai.model};}
    if(step.actionType==='CRM_CREATE_FOLLOWUP'){const input:any={};for(const[k,v]of Object.entries(step.inputs||{}))input[k]=resolveInput(v,context);const dueAt=new Date(Date.now()+input.dueInSeconds*1000).toISOString();const follow:any=await CRMService.scheduleFollowUp(input.leadId,{type:input.type,dueAt,note:input.note,assignedTo:input.assignedTo,idempotencyKey:key} as any,String(execution.context.actorId||execution.replayedBy||execution.automationId));return{resourceType:'LeadFollowUp',resourceId:follow._id.toString(),status:follow.status};}
    if(step.actionType==='NOTIFICATION_CREATE'){const input:any={...step.inputs,recipientUserId:resolveInput(step.inputs.recipientUserId,context)};const intent:any=await NotificationService.enqueueIntent({tenantId:String(execution.tenantId),recipientUserId:input.recipientUserId,type:input.notificationType,sourceType:execution.resourceType,sourceId:execution.resourceId,occurrenceKey:key,data:input.data||{}},key);return{resourceType:'NotificationIntent',resourceId:intent._id.toString(),status:intent.status};}
    if(step.actionType==='COMMUNICATION_SEND_ANNOUNCEMENT'){const map=(v:any):any=>Array.isArray(v)?v.map(map):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,map(x)])):resolveInput(v,context);const input=map(step.inputs);const actorId=String((execution.snapshot as any).activationActorId);const announcement:any=await CommunicationAnnouncementService.createAndPublishIdempotent(input,{userId:actorId},key);return{resourceType:'CommunicationAnnouncement',resourceId:announcement.id,status:announcement.status};}
    if(step.actionType==='INTEGRATION_EMIT_EVENT'&&process.env.NODE_ENV==='test'){const event:any=await DomainEventService.publish({tenantId:String(execution.tenantId),eventId:`${key}:event`,eventType:step.inputs.eventType,occurredAt:new Date(),actorId:execution.context.actorId,resourceType:'Fixture',resourceId:execution.resourceId,correlationId:execution.correlationId,causationId:execution.triggerEventId,depth:execution.depth+1,payloadVersion:1,payload:{}});return{resourceType:'AutomationEvent',resourceId:event.eventId,status:event.status};}
    throw new BadRequestError('Unsupported action');
  }
  static async recoverDue(now=new Date(),limit=50){const stale=new Date(now.getTime()-LEASE_MS);await AutomationStepExecutionModel.updateMany({status:'RUNNING',updatedAt:{$lt:stale}},{$set:{status:'FAILED',nextAttemptAt:now,error:{category:'INTERNAL',message:'Recovered abandoned worker lease'}}}).setOptions({bypassTenantFilter:true});const due:any[]=await AutomationExecutionModel.find({status:{$in:['WAITING','RUNNING']},$or:[{nextRunAt:{$lte:now}},{updatedAt:{$lt:stale}}]}).setOptions({bypassTenantFilter:true}).limit(limit).select('_id');for(const e of due)await this.runExecution(e._id.toString(),now);return due.length;}
  static async assertExecutionScope(execution:any,actor:Actor){const tenantId=ctxTenant(),scope=await BranchAccessService.getScope(tenantId,actor);if(scope.mode==='SELECTED'&&(!execution.branchId||!scope.branchIds.includes(String(execution.branchId))))throw new NotFoundError('Execution not found');}
  static async listExecutions(automationId:string,q:any,actor:Actor){await this.get(automationId,actor);const tenantId=ctxTenant(),filter:any={tenantId,automationId};const scope=await BranchAccessService.getScope(tenantId,actor);if(scope.mode==='SELECTED')filter.branchId={$in:scope.branchIds.map(x=>new Types.ObjectId(x))};if(q.status)filter.status=q.status;const[data,total]=await Promise.all([AutomationExecutionModel.find(filter).sort({createdAt:-1}).skip((q.page-1)*q.limit).limit(q.limit).select('-context.payload -snapshot.capabilitySnapshot').lean(),AutomationExecutionModel.countDocuments(filter)]);return{data,pagination:{page:q.page,limit:q.limit,total,pages:Math.ceil(total/q.limit)}};}
  static async getExecution(id:string,actor:Actor):Promise<any>{const tenantId=ctxTenant(),execution:any=await AutomationExecutionModel.findOne({_id:id,tenantId}).lean();if(!execution)throw new NotFoundError('Execution not found');await this.assertExecutionScope(execution,actor);const steps:any[]=await AutomationStepExecutionModel.find({executionId:id,tenantId}).sort({stepIndex:1}).lean();const safeContext={eventId:execution.context?.eventId,eventType:execution.context?.eventType,resourceType:execution.context?.resourceType,resourceId:execution.context?.resourceId,branchId:execution.context?.branchId,conditionResult:execution.context?.conditionResult};delete execution.snapshot?.capabilitySnapshot;return{...execution,context:safeContext,steps};}
  static async cancel(id:string,actor:Actor){const tenantId=ctxTenant(),candidate:any=await AutomationExecutionModel.findOne({_id:id,tenantId});if(!candidate)throw new NotFoundError('Execution not found');await this.assertExecutionScope(candidate,actor);const execution:any=await AutomationExecutionModel.findOneAndUpdate({_id:id,tenantId,status:{$in:['PENDING','WAITING','RUNNING']}},{$set:{status:'CANCELLED'}},{new:true});if(!execution)throw new ConflictError('Execution is not cancellable');await AutomationStepExecutionModel.updateMany({executionId:id,status:{$in:['PENDING','WAITING']}},{$set:{status:'CANCELLED'}});await AuditService.logEvent({tenantId,actorId:actor.userId,action:'AUTOMATION_EXECUTION_CANCELLED',resource:'AutomationExecution',resourceId:id});return execution;}
  static async retry(id:string,actor:Actor){const tenantId=ctxTenant(),candidate:any=await AutomationExecutionModel.findOne({_id:id,tenantId});if(!candidate)throw new NotFoundError('Execution not found');await this.assertExecutionScope(candidate,actor);const execution:any=await AutomationExecutionModel.findOneAndUpdate({_id:id,tenantId,status:{$in:['FAILED','DEAD_LETTER']}},{$set:{status:'PENDING'},$unset:{failedAt:1,error:1,nextRunAt:1}},{new:true});if(!execution)throw new ConflictError('Execution is not retryable');await AutomationStepExecutionModel.updateMany({executionId:id,status:'FAILED'},{$set:{status:'PENDING'},$unset:{nextAttemptAt:1,error:1}});await AuditService.logEvent({tenantId,actorId:actor.userId,action:'AUTOMATION_EXECUTION_RETRIED',resource:'AutomationExecution',resourceId:id});return this.runExecution(id);}
  static async replay(id:string,actor:Actor){const tenantId=ctxTenant(),original:any=await AutomationExecutionModel.findOne({_id:id,tenantId});if(!original)throw new NotFoundError('Execution not found');await this.assertExecutionScope(original,actor);const copy=await AutomationExecutionModel.create({...original.toObject(),_id:undefined,triggerEventId:`${original.triggerEventId}:replay:${randomUUID()}`,status:'PENDING',currentStep:0,replayOfExecutionId:original._id,replayedBy:actor.userId,startedAt:undefined,completedAt:undefined,failedAt:undefined,error:undefined});await AuditService.logEvent({tenantId,actorId:actor.userId,action:'AUTOMATION_EXECUTION_REPLAYED',resource:'AutomationExecution',resourceId:copy.id,metadata:{originalExecutionId:id}});return this.runExecution(copy.id);}
}
