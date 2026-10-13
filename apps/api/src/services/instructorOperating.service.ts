import { Types } from 'mongoose';
import { AssessmentModel, AssessmentSubmissionModel, AttendanceSessionModel, BatchModel, ClassModel, CourseModel, EnrollmentModel, InstructorAvailabilityModel, LessonProgressModel, OrganizationMemberModel, OrganizationSettingsModel, SchedulingMutexModel, StudentLifecycleModel, UserModel, runInTransaction } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/appError';
import { AttendanceService } from './attendance.service';
import { AssessmentService } from './assessment.service';
import { AcademicTimezoneService } from './academicTimezone.service';

type Actor = { userId: string; roles: string[]; isSuperAdmin?: boolean };
export class InstructorOperatingService {
  private static tenant() { const id=getWorkspaceContext().currentTenantId; if(!id) throw new BadRequestError('Tenant context required'); return id; }
  private static async instructor(actor:Actor){ const tenantId=this.tenant(); const [user,member]=await Promise.all([UserModel.findOne({_id:actor.userId,tenantId,status:'ACTIVE'}).lean(),OrganizationMemberModel.findOne({tenantId,userId:actor.userId,role:'INSTRUCTOR',status:'ACTIVE'}).lean()]); if(!user||!member)throw new ForbiddenError('Active instructor membership required'); return {tenantId,user,member}; }
  private static async ownedClass(id:string,actor:Actor){const {tenantId}=await this.instructor(actor);const cls=await ClassModel.findOne({_id:id,tenantId,instructorId:actor.userId}).lean();if(!cls)throw new NotFoundError('Teaching class not found');return cls;}
  private static async ownedBatch(id:string,actor:Actor){const {tenantId}=await this.instructor(actor);const direct=await BatchModel.findOne({_id:id,tenantId,instructorId:actor.userId}).lean();if(direct)return direct;const occurrence=await ClassModel.exists({tenantId,batchId:id,instructorId:actor.userId});if(!occurrence)throw new NotFoundError('Teaching batch not found');const batch=await BatchModel.findOne({_id:id,tenantId}).lean();if(!batch)throw new NotFoundError('Teaching batch not found');return batch;}
  private static async timezone(tenantId:string){const settings=await OrganizationSettingsModel.findOne({tenantId}).select('profile.timezone').lean();return AcademicTimezoneService.validate(settings?.profile?.timezone||'UTC');}
  private static async metrics(actor:Actor){const {tenantId}=await this.instructor(actor),now=new Date(),timezone=await this.timezone(tenantId),day=AcademicTimezoneService.dayRange(now,timezone),week=AcademicTimezoneService.weekRange(now,timezone),base={tenantId,instructorId:actor.userId,status:{$ne:'CANCELLED'}};const [today,weekClasses,nextClass,batchIds]=await Promise.all([ClassModel.find({...base,scheduledStartAt:{$gte:day.start,$lt:day.end}}).sort({scheduledStartAt:1}).populate('batchId','name batchCode').lean(),ClassModel.find({...base,scheduledStartAt:{$gte:week.start,$lt:week.end}}).select('scheduledStartAt scheduledEndAt').lean(),ClassModel.findOne({...base,scheduledStartAt:{$gte:now}}).sort({scheduledStartAt:1}).populate('batchId','name batchCode').lean(),BatchModel.distinct('_id',{tenantId,instructorId:actor.userId,status:{$in:['UPCOMING','ONGOING']}})]);const pastIds=today.filter((c:any)=>c.scheduledStartAt<=now).map((c:any)=>c._id),finalized=new Set((await AttendanceSessionModel.find({tenantId,classId:{$in:pastIds},status:'FINALIZED'}).select('classId').lean()).map((s:any)=>s.classId.toString())),courseIds=await BatchModel.distinct('courseId',{tenantId,_id:{$in:batchIds}}),assessmentIds=await AssessmentModel.distinct('_id',{tenantId,type:'ASSIGNMENT',$or:[{batchId:{$in:batchIds}},{courseId:{$in:courseIds}}]}),pendingGrading=await AssessmentSubmissionModel.countDocuments({tenantId,assessmentId:{$in:assessmentIds},type:'ASSIGNMENT',status:{$in:['SUBMITTED','IN_REVIEW']}});return{now,timezone,classesToday:today.length,classesThisWeek:weekClasses.length,scheduledTeachingMinutesThisWeek:weekClasses.reduce((sum:number,c:any)=>sum+Math.max(0,(c.scheduledEndAt.getTime()-c.scheduledStartAt.getTime())/60000),0),assignedActiveBatches:batchIds.length,pendingAttendance:pastIds.filter((id:any)=>!finalized.has(id.toString())).length,pendingGrading,nextClass,todaysClasses:today};}
  static async dashboard(actor:Actor){const m=await this.metrics(actor),tenantId=this.tenant();const upcomingClasses=await ClassModel.find({tenantId,instructorId:actor.userId,status:{$ne:'CANCELLED'},scheduledStartAt:{$gte:m.now}}).sort({scheduledStartAt:1}).limit(8).populate('batchId','name batchCode').select('name batchId scheduledStartAt scheduledEndAt timezone mode status isRescheduled').lean();return{...m,assignedBatches:m.assignedActiveBatches,upcomingClasses};}
  static workload(actor:Actor){return this.metrics(actor);}
  static async agenda(raw:any,actor:Actor){const {tenantId}=await this.instructor(actor);const from=new Date(String(raw.from||new Date(Date.now()-86400000).toISOString())),to=new Date(String(raw.to||new Date(Date.now()+7*86400000).toISOString()));if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||to<=from||to.getTime()-from.getTime()>366*86400000)throw new BadRequestError('Invalid or unbounded agenda range');return ClassModel.find({tenantId,instructorId:actor.userId,scheduledStartAt:{$lt:to},scheduledEndAt:{$gt:from}}).sort({scheduledStartAt:1}).populate('batchId','name batchCode').populate('courseId','title slug').populate('roomId','name code branch').select('name classCode batchId courseId scheduledStartAt scheduledEndAt timezone mode roomId zoomDetails.meetingUrl status isRescheduled source scheduleRevision').lean();}
  static async batches(raw:any,actor:Actor){const {tenantId}=await this.instructor(actor);const page=Math.max(1,Number(raw.page)||1),limit=Math.min(50,Math.max(1,Number(raw.limit)||20));const ids=await ClassModel.distinct('batchId',{tenantId,instructorId:actor.userId});const filter={$or:[{instructorId:new Types.ObjectId(actor.userId)},{_id:{$in:ids}}]};const [data,total]=await Promise.all([BatchModel.find({tenantId,...filter}).sort({startDate:-1}).skip((page-1)*limit).limit(limit).populate('courseId','title slug').select('name batchCode courseId mode status startDate endDate timing').lean(),BatchModel.countDocuments({tenantId,...filter})]);return{data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};}
  static async batch(id:string,raw:any,actor:Actor){const batch=await this.ownedBatch(id,actor),tenantId=this.tenant(),page=Math.max(1,Number(raw.page)||1),limit=Math.min(50,Math.max(1,Number(raw.limit)||20));const filter={tenantId,currentBatchId:batch._id,currentStatus:'ACTIVE'};const [lifecycles,total,classes,course]=await Promise.all([StudentLifecycleModel.find(filter).skip((page-1)*limit).limit(limit).populate('studentUserId','name avatarUrl').select('studentUserId studentNumber currentStatus currentEnrollmentId').lean(),StudentLifecycleModel.countDocuments(filter),ClassModel.find({tenantId,batchId:batch._id,instructorId:actor.userId,scheduledStartAt:{$gte:new Date()}}).sort({scheduledStartAt:1}).limit(10).select('name scheduledStartAt scheduledEndAt status mode isRescheduled').lean(),batch.courseId?CourseModel.findById(batch.courseId).select('title slug').lean():null]);return{batch:{id:batch._id,name:batch.name,batchCode:batch.batchCode,mode:batch.mode,status:batch.status,timing:batch.timing},course,students:lifecycles.map((l:any)=>({studentUserId:l.studentUserId?._id,displayName:l.studentUserId?.name,avatarUrl:l.studentUserId?.avatarUrl,studentNumber:l.studentNumber,academicStatus:l.currentStatus})),upcomingClasses:classes,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};}
  static async classWorkspace(id:string,actor:Actor){const cls:any=await this.ownedClass(id,actor);const [batch,course,attendance]=await Promise.all([cls.batchId?BatchModel.findById(cls.batchId).select('name batchCode').lean():null,cls.courseId?CourseModel.findById(cls.courseId).select('title slug').lean():null,AttendanceService.getByClass(id,actor)]);return{class:{id:cls._id,name:cls.name,classCode:cls.classCode,scheduledStartAt:cls.scheduledStartAt,scheduledEndAt:cls.scheduledEndAt,timezone:cls.timezone,mode:cls.mode,status:cls.status,isRescheduled:cls.isRescheduled,roomId:cls.roomId,meetingUrl:cls.status==='CANCELLED'?undefined:cls.zoomDetails?.meetingUrl,scheduleRevision:cls.scheduleRevision},batch,course,attendance};}
  static async students(raw: any, actor: Actor) {
    const { tenantId } = await this.instructor(actor);
    const page = Math.max(1, Number(raw.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(raw.limit) || 20));

    const directBatchIds = await BatchModel.distinct('_id', { tenantId, instructorId: actor.userId });
    const classBatchIds = await ClassModel.distinct('batchId', { tenantId, instructorId: actor.userId });
    const authorizedBatchIds = [...new Set([...directBatchIds.map(String), ...classBatchIds.filter(Boolean).map(String)])];

    let targetBatchIds = authorizedBatchIds;
    if (raw.batchId) {
      if (!authorizedBatchIds.includes(String(raw.batchId))) {
        throw new ForbiddenError('Access to batch roster unauthorized');
      }
      targetBatchIds = [String(raw.batchId)];
    } else if (authorizedBatchIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const filter: any = {
      tenantId,
      currentBatchId: { $in: targetBatchIds.map((id) => new Types.ObjectId(id)) }
    };

    if (raw.status) {
      filter.currentStatus = String(raw.status);
    }

    if (raw.search && typeof raw.search === 'string' && raw.search.trim()) {
      const sRegex = new RegExp(raw.search.trim(), 'i');
      const matchingUsers = await UserModel.find({
        tenantId,
        $or: [{ name: sRegex }, { email: sRegex }]
      }).select('_id').lean();
      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { studentUserId: { $in: userIds } },
        { studentNumber: sRegex }
      ];
    }

    const [lifecycles, total] = await Promise.all([
      StudentLifecycleModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('studentUserId', 'name email avatarUrl status')
        .populate('currentBatchId', 'name batchCode mode status courseId')
        .select('studentUserId studentNumber currentStatus currentEnrollmentId currentBatchId createdAt')
        .lean(),
      StudentLifecycleModel.countDocuments(filter)
    ]);

    const enrollmentIds = lifecycles.map((l: any) => l.currentEnrollmentId).filter(Boolean);
    const enrollments = await EnrollmentModel.find({
      tenantId,
      _id: { $in: enrollmentIds }
    }).select('progressPercent status completedLessons totalLessons courseId').populate('courseId', 'title slug').lean();

    const enrollmentMap = new Map(enrollments.map((e: any) => [String(e._id), e]));

    const data = lifecycles.map((l: any) => {
      const enrollment: any = l.currentEnrollmentId ? enrollmentMap.get(String(l.currentEnrollmentId)) : null;
      return {
        studentUserId: l.studentUserId?._id,
        displayName: l.studentUserId?.name || 'Unknown Student',
        email: l.studentUserId?.email,
        avatarUrl: l.studentUserId?.avatarUrl,
        studentNumber: l.studentNumber,
        academicStatus: l.currentStatus,
        batch: l.currentBatchId ? {
          id: l.currentBatchId._id,
          name: l.currentBatchId.name,
          batchCode: l.currentBatchId.batchCode,
          mode: l.currentBatchId.mode,
          status: l.currentBatchId.status
        } : null,
        course: enrollment?.courseId ? {
          id: enrollment.courseId._id,
          title: enrollment.courseId.title,
          slug: enrollment.courseId.slug
        } : null,
        progressPercent: enrollment?.progressPercent ?? 0,
        completedLessons: enrollment?.completedLessons ?? 0,
        totalLessons: enrollment?.totalLessons ?? 0,
        enrollmentStatus: enrollment?.status
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async student(id:string,actor:Actor){const {tenantId}=await this.instructor(actor);const relation=await ClassModel.exists({tenantId,instructorId:actor.userId,'enrolledStudents.studentId':id});const current=await StudentLifecycleModel.findOne({tenantId,studentUserId:id,currentBatchId:{$in:await ClassModel.distinct('batchId',{tenantId,instructorId:actor.userId})}}).lean();if(!relation&&!current)throw new NotFoundError('Student academic relationship not found');const [user,enrollments,progress]=await Promise.all([UserModel.findOne({_id:id,tenantId}).select('name avatarUrl').lean(),EnrollmentModel.find({tenantId,studentId:id}).select('courseId status progressPercent completedLessons totalLessons').lean(),LessonProgressModel.find({tenantId,studentId:id}).select('lessonId courseId status lastPositionSeconds completedAt').limit(100).lean()]);if(!user)throw new NotFoundError('Student not found');return{identity:{id:user._id,name:user.name,avatarUrl:user.avatarUrl},lifecycle:current?{status:current.currentStatus,studentNumber:current.studentNumber}:null,enrollments,lessonProgress:progress};}
  static async grading(raw:any,actor:Actor){const {tenantId}=await this.instructor(actor);const page=Math.max(1,Number(raw.page)||1),limit=Math.min(50,Math.max(1,Number(raw.limit)||20));const batchIds=await BatchModel.distinct('_id',{tenantId,instructorId:actor.userId});const assessmentIds=await AssessmentModel.distinct('_id',{tenantId,type:'ASSIGNMENT',$or:[{batchId:{$in:batchIds}},{courseId:{$in:await BatchModel.distinct('courseId',{tenantId,_id:{$in:batchIds}})}}]});const filter:any={tenantId,assessmentId:{$in:assessmentIds},type:'ASSIGNMENT'};if(raw.status)filter.status=raw.status;const [data,total]=await Promise.all([AssessmentSubmissionModel.find(filter).sort({submittedAt:1}).skip((page-1)*limit).limit(limit).populate('userId','name avatarUrl').populate('assessmentId','title assignmentDetails').select('userId assessmentId status score maxScore submittedAt gradedAt feedback revision').lean(),AssessmentSubmissionModel.countDocuments(filter)]);return{data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};}
  static async gradingItem(id:string,actor:Actor){const {tenantId}=await this.instructor(actor),item:any=await AssessmentSubmissionModel.findOne({_id:id,tenantId,type:'ASSIGNMENT'}).populate('userId','name avatarUrl').populate('assessmentId','title instructions assignmentDetails').select('userId assessmentId batchId courseId assignmentSubmission status score maxScore submittedAt gradedAt feedback revision gradingHistory').lean();if(!item)throw new NotFoundError('Gradable submission not found');const related=item.batchId?await BatchModel.exists({_id:item.batchId,tenantId,instructorId:actor.userId}):item.courseId?await BatchModel.exists({tenantId,courseId:item.courseId,instructorId:actor.userId}):null;if(!related)throw new NotFoundError('Gradable submission not found');return item;}
  static async grade(id:string,raw:any,actor:Actor){await this.instructor(actor);const item=await AssessmentSubmissionModel.findOne({_id:id,tenantId:this.tenant()}).lean();if(!item||item.type!=='ASSIGNMENT')throw new NotFoundError('Gradable submission not found');const batch= item.batchId?await BatchModel.exists({_id:item.batchId,tenantId:this.tenant(),instructorId:actor.userId}):null;const course=batch||!item.courseId?null:await BatchModel.exists({tenantId:this.tenant(),courseId:item.courseId,instructorId:actor.userId});if(!batch&&!course)throw new NotFoundError('Gradable submission not found');return AssessmentService.gradeSubmission({tenantId:this.tenant(),submissionId:id,score:Number(raw.score),feedback:raw.feedback,graderId:actor.userId,expectedRevision:raw.expectedRevision});}
  static async availability(actor:Actor){const {tenantId}=await this.instructor(actor);return InstructorAvailabilityModel.findOne({tenantId,instructorId:actor.userId}).lean();}
  static async updateAvailability(raw:any,actor:Actor){const {tenantId}=await this.instructor(actor),timezone=AcademicTimezoneService.validate(String(raw.timezone||'')),windows=Array.isArray(raw.weeklyWindows)?raw.weeklyWindows:[];for(const w of windows){if(!Number.isInteger(w.dayOfWeek)||w.dayOfWeek<1||w.dayOfWeek>7||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(w.startTime)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(w.endTime)||w.endTime<=w.startTime)throw new BadRequestError('Invalid availability window');}for(const day of new Set(windows.map((w:any)=>w.dayOfWeek))){const rows=windows.filter((w:any)=>w.dayOfWeek===day).sort((a:any,b:any)=>a.startTime.localeCompare(b.startTime));for(let i=1;i<rows.length;i++)if(rows[i].startTime<rows[i-1].endTime)throw new BadRequestError('Availability windows overlap');}const exceptions=Array.isArray(raw.exceptions)?raw.exceptions:[];for(const e of exceptions)if(!/^\d{4}-\d{2}-\d{2}$/.test(e.localDate)||typeof e.available!=='boolean')throw new BadRequestError('Invalid availability exception');const expected=Number(raw.expectedRevision??0);return runInTransaction(async session=>{await SchedulingMutexModel.updateOne({tenantId,key:'academic-scheduling'},{$inc:{revision:1},$setOnInsert:{tenantId,key:'academic-scheduling'}},{upsert:true,session});const current=await InstructorAvailabilityModel.findOne({tenantId,instructorId:actor.userId}).session(session);if((current?.revision||0)!==expected)throw new ConflictError('Availability revision conflict');const future=await ClassModel.find({tenantId,instructorId:actor.userId,status:{$ne:'CANCELLED'},scheduledStartAt:{$gte:new Date()}}).select('scheduledStartAt scheduledEndAt').session(session).lean();for(const cls of future){const start=AcademicTimezoneService.localParts(cls.scheduledStartAt!,timezone),end=AcademicTimezoneService.localParts(cls.scheduledEndAt!,timezone),exception=exceptions.find((e:any)=>e.localDate===start.localDate),allowed=exception?.available===false?false:start.localDate===end.localDate&&windows.some((w:any)=>w.dayOfWeek===AcademicTimezoneService.isoDay(start.localDate)&&w.startTime<=start.time&&w.endTime>=end.time);if(!allowed)throw new ConflictError('Availability conflicts with an existing scheduled class');}const updated=await InstructorAvailabilityModel.findOneAndUpdate({tenantId,instructorId:actor.userId,...(current?{revision:expected}:{})},{$set:{timezone,weeklyWindows:windows,exceptions,updatedBy:actor.userId},$inc:{revision:1}},{upsert:!current,new:true,setDefaultsOnInsert:true,session});if(!updated)throw new ConflictError('Availability revision conflict');return updated;});}
}
