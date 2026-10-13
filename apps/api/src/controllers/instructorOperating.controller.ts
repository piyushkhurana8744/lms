import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { InstructorOperatingService as Service } from '../services/instructorOperating.service';
const actor=(request:Request)=>{const user=(request as AuthenticatedRequest).user!;return{userId:user.userId,roles:user.roles,isSuperAdmin:user.isSuperAdmin};};
const handle=(operation:Promise<unknown>,response:Response,next:NextFunction)=>operation.then(data=>response.json({success:true,data,error:null})).catch(next);
export class InstructorOperatingController{
 static dashboard(r:Request,s:Response,n:NextFunction){return handle(Service.dashboard(actor(r)),s,n);}
 static workload(r:Request,s:Response,n:NextFunction){return handle(Service.workload(actor(r)),s,n);}
 static agenda(r:Request,s:Response,n:NextFunction){return handle(Service.agenda(r.query,actor(r)),s,n);}
 static batches(r:Request,s:Response,n:NextFunction){return handle(Service.batches(r.query,actor(r)),s,n);}
 static batch(r:Request,s:Response,n:NextFunction){return handle(Service.batch(String(r.params.id),r.query,actor(r)),s,n);}
 static workspace(r:Request,s:Response,n:NextFunction){return handle(Service.classWorkspace(String(r.params.id),actor(r)),s,n);}
 static students(r:Request,s:Response,n:NextFunction){return handle(Service.students(r.query,actor(r)),s,n);}
 static student(r:Request,s:Response,n:NextFunction){return handle(Service.student(String(r.params.id),actor(r)),s,n);}
 static grading(r:Request,s:Response,n:NextFunction){return handle(Service.grading(r.query,actor(r)),s,n);}
 static gradingItem(r:Request,s:Response,n:NextFunction){return handle(Service.gradingItem(String(r.params.id),actor(r)),s,n);}
 static grade(r:Request,s:Response,n:NextFunction){return handle(Service.grade(String(r.params.id),r.body,actor(r)),s,n);}
 static availability(r:Request,s:Response,n:NextFunction){return handle(Service.availability(actor(r)),s,n);}
 static updateAvailability(r:Request,s:Response,n:NextFunction){return handle(Service.updateAvailability(r.body,actor(r)),s,n);}
}
