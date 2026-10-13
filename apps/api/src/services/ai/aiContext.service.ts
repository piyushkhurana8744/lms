import {CRMService} from '../crm.service';
import {BadRequestError} from '../../errors/appError';
export type AIActor={userId:string;isSuperAdmin?:boolean;permissions:string[]};
const clean=(s:unknown,n:number)=>typeof s==='string'?s.slice(0,n):s;
export class AIContextService{
 static async crmLead(leadId:string,actor:AIActor){const detail:any=await CRMService.getLeadById(leadId,actor);const l=detail.lead;return{resourceType:'Lead',resourceId:l.id,branchId:l.branchId?.toString(),lead:{leadCode:l.leadCode,fullName:clean(l.fullName,200),city:clean(l.city,100),source:l.source,stage:l.stage,preferredMode:l.preferredMode,courseInterest:l.courseInterest?.title,batchInterest:l.batchInterest?.name},activities:(detail.activities||[]).slice(0,20).map((a:any)=>({type:a.type,title:clean(a.title,200),note:clean(a.note,1000),createdAt:a.createdAt})),followUps:(detail.followUps||[]).slice(0,10).map((f:any)=>({type:f.type,status:f.status,dueAt:f.dueAt,note:clean(f.note,500)}))};}
 static communication(input:any){if(!input?.purpose)throw new BadRequestError('Draft purpose is required');return{purpose:clean(input.purpose,1000),audience:clean(input.audience,300),tone:clean(input.tone,50)||'PROFESSIONAL',facts:Array.isArray(input.facts)?input.facts.slice(0,20).map((x:any)=>clean(x,500)):[]};}
}
