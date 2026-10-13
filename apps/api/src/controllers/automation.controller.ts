import { NextFunction, Request, Response } from 'express';
import { AutomationExecutionQuerySchema, AutomationListQuerySchema, CreateAutomationSchema, UpdateAutomationSchema } from '@edtech/validation';
import { AutomationService } from '../services/automation.service';
import { registryResponse } from '../services/automationRegistry.service';

const actor = (req: Request) => { const u:any=(req as any).user; return { userId:u.userId||u.id||u._id,isSuperAdmin:Boolean(u.isSuperAdmin),permissions:u.permissions||[] }; };
export class AutomationController {
  static async registry(req:Request,res:Response){res.json({success:true,data:registryResponse(actor(req).permissions)});}
  static async create(req:Request,res:Response,next:NextFunction){try{res.status(201).json({success:true,data:await AutomationService.create(CreateAutomationSchema.parse(req.body),actor(req))});}catch(e){next(e);}}
  static async list(req:Request,res:Response,next:NextFunction){try{const r=await AutomationService.list(AutomationListQuerySchema.parse(req.query),actor(req));res.json({success:true,...r});}catch(e){next(e);}}
  static async get(req:Request,res:Response,next:NextFunction){try{res.json({success:true,data:await AutomationService.get(String(req.params.id),actor(req))});}catch(e){next(e);}}
  static async update(req:Request,res:Response,next:NextFunction){try{res.json({success:true,data:await AutomationService.update(String(req.params.id),UpdateAutomationSchema.parse(req.body),actor(req))});}catch(e){next(e);}}
  static transition(action:'activate'|'pause'|'archive'){return async(req:Request,res:Response,next:NextFunction)=>{try{res.json({success:true,data:await AutomationService.transition(String(req.params.id),action,actor(req))});}catch(e){next(e);}};}
  static async executions(req:Request,res:Response,next:NextFunction){try{const r=await AutomationService.listExecutions(String(req.params.id),AutomationExecutionQuerySchema.parse(req.query),actor(req));res.json({success:true,...r});}catch(e){next(e);}}
  static async execution(req:Request,res:Response,next:NextFunction){try{res.json({success:true,data:await AutomationService.getExecution(String(req.params.executionId),actor(req))});}catch(e){next(e);}}
  static executionAction(action:'retry'|'cancel'|'replay'){return async(req:Request,res:Response,next:NextFunction)=>{try{const result=await (AutomationService as any)[action](String(req.params.executionId),actor(req));res.json({success:true,data:await AutomationService.getExecution(String(result._id),actor(req))});}catch(e){next(e);}};}
}
