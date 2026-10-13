import {
  AssessmentModel,
  AssessmentSubmissionModel,
  CourseModel,
  BatchModel,
  LessonProgressModel,
  AssessmentType,
  AssessmentScope
  ,NotificationIntentModel
  ,runInTransaction
} from '@edtech/database';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { gradingCheckpoint } from './gradingFailureInjection';

export class AssessmentService {
  /**
   * List Assessments with optional filters
   */
  public static async getAssessments(params: {
    tenantId: string;
    type?: AssessmentType;
    scope?: AssessmentScope;
    courseId?: string;
    batchId?: string;
    showOnWebsite?: boolean;
    status?: string;
  }) {
    const query: any = { tenantId: params.tenantId };

    if (params.type) query.type = params.type;
    if (params.scope) query.scope = params.scope;
    if (params.courseId) query.courseId = params.courseId;
    if (params.batchId) query.batchId = params.batchId;
    if (params.showOnWebsite !== undefined) query.showOnWebsite = params.showOnWebsite;
    if (params.status) query.status = params.status;

    return AssessmentModel.find(query)
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Get Single Assessment Details
   */
  public static async getAssessmentById(tenantId: string, id: string, isStudentView = false) {
    const assessment = await AssessmentModel.findOne({ _id: id, tenantId })
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .populate('createdBy', 'name email');

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // Hide isCorrect flags from student test-taking view
    if (isStudentView && assessment.type === 'QUIZ' && assessment.questions) {
      const sanitized = assessment.toObject();
      sanitized.questions = sanitized.questions?.map((q: any) => ({
        ...q,
        options: q.options?.map((opt: any) => ({ text: opt.text }))
      }));
      return sanitized;
    }

    return assessment;
  }

  /**
   * Public Website Assessments
   */
  public static async getPublicAssessments(tenantId: string) {
    return AssessmentModel.find({
      tenantId,
      showOnWebsite: true,
      status: 'PUBLISHED'
    })
      .select('title slug description type durationMinutes passingScorePercent questions.length createdAt')
      .sort({ createdAt: -1 });
  }

  /**
   * Public Assessment by Slug
   */
  public static async getPublicAssessmentBySlug(tenantId: string, slug: string) {
    const assessment = await AssessmentModel.findOne({
      tenantId,
      slug: slug.toLowerCase(),
      showOnWebsite: true,
      status: 'PUBLISHED'
    });

    if (!assessment) {
      throw new NotFoundError('Public assessment not found');
    }

    const sanitized = assessment.toObject();
    if (sanitized.questions) {
      sanitized.questions = sanitized.questions.map((q: any) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options?.map((opt: any) => ({ text: opt.text })),
        points: q.points
      }));
    }

    return sanitized;
  }

  /**
   * Create New Assessment (Quiz or Assignment)
   */
  public static async createAssessment(
    tenantId: string,
    data: {
      type: AssessmentType;
      scope?: AssessmentScope;
      courseId?: string | null;
      moduleId?: string | null;
      batchId?: string | null;
      title: string;
      slug?: string;
      description: string;
      instructions?: string;
      showOnWebsite?: boolean;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      durationMinutes?: number;
      passingScorePercent?: number;
      maxAttempts?: number;
      questions?: any[];
      assignmentDetails?: any;
    },
    actorId: string
  ) {
    const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existing = await AssessmentModel.findOne({ tenantId, slug });
    if (existing) {
      throw new BadRequestError(`An assessment with identifier '${slug}' already exists`);
    }

    const assessment = await AssessmentModel.create({
      tenantId,
      type: data.type,
      scope: data.scope || (data.courseId ? 'COURSE_LINKED' : data.batchId ? 'BATCH_LINKED' : 'INDEPENDENT'),
      courseId: data.courseId || null,
      moduleId: data.moduleId || null,
      batchId: data.batchId || null,
      title: data.title,
      slug,
      description: data.description,
      instructions: data.instructions,
      showOnWebsite: Boolean(data.showOnWebsite),
      status: data.status || 'PUBLISHED',
      durationMinutes: data.durationMinutes || 30,
      passingScorePercent: data.passingScorePercent || 60,
      maxAttempts: data.maxAttempts || 3,
      questions: data.questions || [],
      assignmentDetails: data.assignmentDetails,
      createdBy: actorId
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ASSESSMENT_CREATED',
      resource: 'Assessment',
      resourceId: assessment._id.toString(),
      metadata: { title: assessment.title, type: assessment.type, scope: assessment.scope }
    });

    return assessment;
  }

  /**
   * Update Assessment
   */
  public static async updateAssessment(
    tenantId: string,
    id: string,
    updates: Partial<any>,
    actorId: string
  ) {
    const assessment = await AssessmentModel.findOne({ _id: id, tenantId });
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    if (updates.title) assessment.title = updates.title;
    if (updates.description) assessment.description = updates.description;
    if (updates.instructions !== undefined) assessment.instructions = updates.instructions;
    if (updates.showOnWebsite !== undefined) assessment.showOnWebsite = updates.showOnWebsite;
    if (updates.status) assessment.status = updates.status;
    if (updates.durationMinutes !== undefined) assessment.durationMinutes = updates.durationMinutes;
    if (updates.passingScorePercent !== undefined) assessment.passingScorePercent = updates.passingScorePercent;
    if (updates.maxAttempts !== undefined) assessment.maxAttempts = updates.maxAttempts;
    if (updates.questions) assessment.questions = updates.questions;
    if (updates.assignmentDetails) assessment.assignmentDetails = updates.assignmentDetails;
    if (updates.courseId !== undefined) assessment.courseId = updates.courseId;
    if (updates.batchId !== undefined) assessment.batchId = updates.batchId;
    if (updates.scope) assessment.scope = updates.scope;

    await assessment.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ASSESSMENT_UPDATED',
      resource: 'Assessment',
      resourceId: id,
      metadata: { title: assessment.title }
    });

    return assessment;
  }

  /**
   * Delete Assessment
   */
  public static async deleteAssessment(tenantId: string, id: string, actorId: string) {
    const assessment = await AssessmentModel.findOne({ _id: id, tenantId });
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await AssessmentModel.findByIdAndDelete(id);

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ASSESSMENT_DELETED',
      resource: 'Assessment',
      resourceId: id
    });

    return { deleted: true, id };
  }

  /**
   * Submit Quiz Attempt & Auto-Grade
   */
  public static async submitQuiz(params: {
    tenantId: string;
    assessmentId: string;
    userId: string;
    answers: Array<{ questionIndex: number; selectedOptionIndex: number }>;
    timeSpentSeconds?: number;
  }) {
    const assessment = await AssessmentModel.findOne({ _id: params.assessmentId, tenantId: params.tenantId });
    if (!assessment || assessment.type !== 'QUIZ') {
      throw new NotFoundError('Quiz not found');
    }

    const previousAttempts = await AssessmentSubmissionModel.countDocuments({
      tenantId: params.tenantId,
      assessmentId: params.assessmentId,
      userId: params.userId
    });

    if (assessment.maxAttempts && previousAttempts >= assessment.maxAttempts) {
      throw new BadRequestError(`Maximum quiz attempts (${assessment.maxAttempts}) reached`);
    }

    const questions = assessment.questions || [];
    let totalPoints = 0;
    let earnedPoints = 0;

    const evaluatedAnswers = questions.map((q, idx) => {
      const qPoints = q.points || 1;
      totalPoints += qPoints;

      const userAns = params.answers.find((a) => a.questionIndex === idx);
      const selectedOptionIndex = userAns !== undefined ? userAns.selectedOptionIndex : -1;

      const correctOptionIndex = q.options.findIndex((opt) => opt.isCorrect);
      const isCorrect = selectedOptionIndex === correctOptionIndex && selectedOptionIndex !== -1;

      const pointsForThis = isCorrect ? qPoints : 0;
      earnedPoints += pointsForThis;

      return {
        questionIndex: idx,
        selectedOptionIndex,
        isCorrect,
        earnedPoints: pointsForThis
      };
    });

    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingThreshold = assessment.passingScorePercent || 60;
    const passed = scorePercentage >= passingThreshold;

    const submission = await AssessmentSubmissionModel.create({
      tenantId: params.tenantId,
      assessmentId: assessment._id,
      userId: params.userId,
      batchId: assessment.batchId,
      courseId: assessment.courseId,
      type: 'QUIZ',
      attemptNumber: previousAttempts + 1,
      quizAnswers: evaluatedAnswers,
      score: earnedPoints,
      maxScore: totalPoints,
      scorePercentage,
      passed,
      status: 'GRADED',
      timeSpentSeconds: params.timeSpentSeconds || 0,
      submittedAt: new Date()
    });

    await AuditService.logEvent({
      actorId: params.userId,
      tenantId: params.tenantId,
      action: 'QUIZ_SUBMITTED',
      resource: 'AssessmentSubmission',
      resourceId: submission._id.toString(),
      metadata: {
        assessmentTitle: assessment.title,
        scorePercentage,
        passed,
        attemptNumber: previousAttempts + 1
      }
    });

    return {
      submissionId: submission._id.toString(),
      score: earnedPoints,
      maxScore: totalPoints,
      scorePercentage,
      passed,
      passingScorePercent: passingThreshold,
      answers: evaluatedAnswers,
      feedback: passed
        ? 'Congratulations! You passed the quiz.'
        : 'You did not meet the passing score. You can review and attempt again.'
    };
  }

  /**
   * Submit Assignment (File Upload / Link / Text)
   */
  public static async submitAssignment(params: {
    tenantId: string;
    assessmentId: string;
    userId: string;
    submissionText?: string;
    fileUrl?: string;
    fileName?: string;
    linkUrl?: string;
  }) {
    const assessment = await AssessmentModel.findOne({ _id: params.assessmentId, tenantId: params.tenantId });
    if (!assessment || assessment.type !== 'ASSIGNMENT') {
      throw new NotFoundError('Assignment not found');
    }

    const previousAttempts = await AssessmentSubmissionModel.countDocuments({
      tenantId: params.tenantId,
      assessmentId: params.assessmentId,
      userId: params.userId
    });

    const submission = await AssessmentSubmissionModel.create({
      tenantId: params.tenantId,
      assessmentId: assessment._id,
      userId: params.userId,
      batchId: assessment.batchId,
      courseId: assessment.courseId,
      type: 'ASSIGNMENT',
      attemptNumber: previousAttempts + 1,
      assignmentSubmission: {
        submissionText: params.submissionText,
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        linkUrl: params.linkUrl
      },
      score: 0,
      maxScore: assessment.assignmentDetails?.maxScore || 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      submittedAt: new Date()
    });

    await AuditService.logEvent({
      actorId: params.userId,
      tenantId: params.tenantId,
      action: 'ASSIGNMENT_SUBMITTED',
      resource: 'AssessmentSubmission',
      resourceId: submission._id.toString(),
      metadata: { assessmentTitle: assessment.title }
    });

    return submission;
  }

  /**
   * Trainer Manual Grading for Assignments
   */
  public static async gradeSubmission(params: {
    tenantId: string;
    submissionId: string;
    score: number;
    feedback?: string;
    graderId: string;
    expectedRevision?: number;
  }) {
    let eventId='';
    const result=await runInTransaction(async session=>{
      const submission=await AssessmentSubmissionModel.findOne({_id:params.submissionId,tenantId:params.tenantId}).session(session);
      if(!submission)throw new NotFoundError('Submission record not found');
      if(submission.type!=='ASSIGNMENT')throw new BadRequestError('Auto-graded quiz results cannot be manually overwritten');
      const maxScore=submission.maxScore||100,revision=submission.revision||0;
      if(!Number.isFinite(params.score)||params.score<0||params.score>maxScore)throw new BadRequestError(`Score must be between 0 and ${maxScore}`);
      if(submission.status==='GRADED'&&submission.score===params.score&&submission.feedback===params.feedback)return{submission,eventId:''};
      if(params.expectedRevision!==undefined&&params.expectedRevision!==revision)throw new ConflictError('Submission revision conflict');
      const gradedAt=new Date(),scorePercentage=Math.round((params.score/maxScore)*100);
      const updated=await AssessmentSubmissionModel.findOneAndUpdate({_id:submission._id,tenantId:params.tenantId,...(revision===0?{$or:[{revision:0},{revision:{$exists:false}}]}:{revision})},{$set:{score:params.score,scorePercentage,passed:scorePercentage>=50,feedback:params.feedback,status:'GRADED',gradedBy:params.graderId,gradedAt},$inc:{revision:1},$push:{gradingHistory:{previousScore:submission.score,newScore:params.score,graderId:params.graderId,gradedAt,feedback:params.feedback}}},{new:true,session});
      if(!updated)throw new ConflictError('Submission revision conflict');
      gradingCheckpoint('GRADING_AFTER_SUBMISSION_MUTATION');
      eventId=`assessment.graded:${updated._id}:${updated.revision}:${updated.userId}`;
      await NotificationIntentModel.updateOne({eventId},{$setOnInsert:{tenantId:params.tenantId,eventId,type:'assessment.graded',recipientUserId:updated.userId,sourceType:'AssessmentSubmission',sourceId:updated._id.toString(),occurrenceKey:String(updated.revision),data:{assessmentTitle:'Assignment',score:params.score,maxScore},status:'PENDING',availableAt:new Date(),attemptCount:0}},{upsert:true,session});
      gradingCheckpoint('GRADING_AFTER_INTENT');
      await AuditService.logEvent({actorId:params.graderId,tenantId:params.tenantId,action:'SUBMISSION_GRADED',resource:'AssessmentSubmission',resourceId:updated._id.toString(),metadata:{score:params.score,maxScore,studentId:updated.userId.toString()},session});
      gradingCheckpoint('GRADING_AFTER_AUDIT');
      return{submission:updated,eventId};
    });
    if(result.eventId)await NotificationService.consumeOutboxEvent(result.eventId).catch(()=>undefined);
    return result.submission;
  }

  /**
   * Get Submissions for Grading or Student History
   */
  public static async getSubmissions(params: {
    tenantId: string;
    assessmentId?: string;
    userId?: string;
    status?: string;
  }) {
    const query: any = { tenantId: params.tenantId };
    if (params.assessmentId) query.assessmentId = params.assessmentId;
    if (params.userId) query.userId = params.userId;
    if (params.status) query.status = params.status;

    return AssessmentSubmissionModel.find(query)
      .populate('userId', 'name email')
      .populate('assessmentId', 'title type assignmentDetails durationMinutes')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 });
  }
}
