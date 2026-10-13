import {
  EnrollmentModel,
  CourseModel,
  LessonModel,
  CourseModuleModel,
  LessonProgressModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  ClassModel,
  StudentLifecycleModel,
  AuditLogModel
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import {
  IStudentDashboardSummary,
  IStudentCourseResumeInfo,
  IStudentCourseDetailDTO,
  IStudentCurriculumModuleDTO,
  IStudentCurriculumLessonDTO,
  IStudentPendingAssessmentDTO,
  IStudentUpcomingClassDTO,
  IStudentRecentSubmissionDTO,
  IStudentLessonPlayerDTO
} from '@edtech/types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/appError';
import { Types } from 'mongoose';

export class StudentLearningService {
  /**
   * Get Student Dashboard Overview:
   * - Continue learning active course
   * - Summary stats (active, completed, total hours/lessons)
   * - Upcoming live classes for enrolled student
   * - Pending actionable quizzes & assignments
   * - Recent graded/auto-graded submission results
   */
  static async getDashboardOverview(studentId: string): Promise<IStudentDashboardSummary> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    // 1. Fetch active/completed enrollments
    const enrollments = await EnrollmentModel.find({
      tenantId,
      studentId,
      status: { $ne: 'CANCELLED' }
    })
      .populate('courseId', 'title slug shortDescription thumbnailUrl level durationMinutes status')
      .sort({ updatedAt: -1 })
      .lean();

    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED');

    const totalEnrolled = enrollments.length;
    const completedCoursesCount = completedEnrollments.length;
    const inProgressCoursesCount = activeEnrollments.length;

    let totalLessonsCount = 0;
    let completedLessonsCount = 0;
    enrollments.forEach((e) => {
      totalLessonsCount += e.totalLessons || 0;
      completedLessonsCount += e.completedLessons || 0;
    });

    const overallProgressPercent = totalLessonsCount > 0
      ? Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100))
      : 0;

    // 2. Resolve Continue Learning for the most recently active enrollment
    let continueLearning: IStudentCourseResumeInfo | null = null;
    const primaryEnrollment = enrollments[0];

    if (primaryEnrollment && primaryEnrollment.courseId) {
      const courseIdStr = (primaryEnrollment.courseId as any)._id.toString();
      continueLearning = await this.resolveCourseResume(studentId, courseIdStr);
    }

    // 3. Upcoming Live Classes
    // Find classes where student is enrolled
    const upcomingClassesRaw = await ClassModel.find({
      tenantId,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      'enrolledStudents.studentId': new Types.ObjectId(studentId),
      'enrolledStudents.status': 'ENROLLED'
    })
      .populate('courseId', 'title slug')
      .populate('batchId', 'name batchCode')
      .sort({ startDate: 1 })
      .limit(5)
      .lean();

    const upcomingClasses: IStudentUpcomingClassDTO[] = upcomingClassesRaw.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      classCode: c.classCode,
      courseTitle: c.courseId?.title || 'Cohort Masterclass',
      batchName: c.batchId?.name,
      mode: c.mode,
      status: c.status,
      startDate: c.startDate,
      timing: c.timing,
      meetingUrl: c.zoomDetails?.meetingUrl,
      venueAddress: c.classroomDetails?.venueAddress,
      branch: c.classroomDetails?.branch
    }));

    // 4. Pending Actionable Assessments
    // Find published quizzes/assignments in this tenant
    // Either independent or linked to enrolled courses
    const enrolledCourseIds = enrollments.map((e) => (e.courseId as any)?._id).filter(Boolean);
    const assessments = await AssessmentModel.find({
      tenantId,
      status: 'PUBLISHED',
      $or: [
        { scope: 'INDEPENDENT' },
        { courseId: { $in: enrolledCourseIds } }
      ]
    })
      .populate('courseId', 'title slug')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Check user's previous submissions for these assessments
    const assessmentIds = assessments.map((a) => a._id);
    const userSubmissions = await AssessmentSubmissionModel.find({
      tenantId,
      userId: studentId,
      assessmentId: { $in: assessmentIds }
    }).lean();

    const submissionsByAssessment = new Map<string, any[]>();
    userSubmissions.forEach((sub) => {
      const aId = sub.assessmentId.toString();
      if (!submissionsByAssessment.has(aId)) submissionsByAssessment.set(aId, []);
      submissionsByAssessment.get(aId)!.push(sub);
    });

    const pendingAssessments: IStudentPendingAssessmentDTO[] = [];
    for (const a of assessments) {
      const aId = a._id.toString();
      const subs = submissionsByAssessment.get(aId) || [];
      const attemptCount = subs.length;
      const latestSub = subs.sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime())[0];
      const maxAttempts = a.maxAttempts || 3;
      const isPassed = latestSub?.passed || false;

      // Pending if not passed and has attempts remaining
      if (!isPassed && attemptCount < maxAttempts) {
        pendingAssessments.push({
          id: aId,
          title: a.title,
          slug: a.slug,
          type: a.type,
          courseTitle: (a.courseId as any)?.title,
          durationMinutes: a.durationMinutes,
          passingScorePercent: a.passingScorePercent,
          attemptCount,
          maxAttempts,
          latestScore: latestSub?.scorePercentage,
          dueDate: a.assignmentDetails?.dueDate
        });
      }
    }

    // 5. Recent Submissions & Graded Results
    const recentSubmissionsRaw = await AssessmentSubmissionModel.find({
      tenantId,
      userId: studentId
    })
      .populate('assessmentId', 'title type passingScorePercent')
      .sort({ submittedAt: -1 })
      .limit(5)
      .lean();

    const recentResults: IStudentRecentSubmissionDTO[] = recentSubmissionsRaw.map((sub: any) => ({
      id: sub._id.toString(),
      assessmentId: sub.assessmentId?._id?.toString() || '',
      assessmentTitle: sub.assessmentId?.title || 'Assessment',
      type: sub.type,
      attemptNumber: sub.attemptNumber,
      score: sub.score,
      maxScore: sub.maxScore,
      scorePercentage: sub.scorePercentage,
      passed: sub.passed,
      status: sub.status,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt
    }));

    return {
      stats: {
        totalEnrolledCourses: totalEnrolled,
        inProgressCourses: inProgressCoursesCount,
        completedCourses: completedCoursesCount,
        completedLessons: completedLessonsCount,
        totalLessons: totalLessonsCount,
        overallProgressPercent
      },
      continueLearning,
      upcomingClasses,
      pendingAssessments: pendingAssessments.slice(0, 5),
      recentResults
    };
  }

  /**
   * Deterministic Resume Logic:
   * 1. Last accessed incomplete lesson
   * 2. First incomplete accessible lesson in curriculum order
   * 3. First accessible lesson for a new enrollment
   * 4. For completed course, returns first lesson or last lesson
   */
  static async resolveCourseResume(studentId: string, courseId: string): Promise<IStudentCourseResumeInfo | null> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    // 1. Verify enrollment
    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId,
      status: { $ne: 'CANCELLED' }
    })
      .populate('courseId', 'title slug shortDescription thumbnailUrl durationMinutes status')
      .lean();

    if (!enrollment || !enrollment.courseId) return null;
    const course = enrollment.courseId as any;

    // 2. Fetch all modules & active lessons in curriculum order
    const modules = await CourseModuleModel.find({
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    const moduleIds = modules.map((m) => m._id);
    const lessons = await LessonModel.find({
      tenantId,
      courseId,
      moduleId: { $in: moduleIds },
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    if (lessons.length === 0) {
      return {
        courseId,
        courseTitle: course.title,
        courseSlug: course.slug,
        thumbnailUrl: course.thumbnailUrl,
        progressPercent: enrollment.progressPercent || 0,
        completedLessons: enrollment.completedLessons || 0,
        totalLessons: 0,
        resumableLesson: null,
        isCompleted: enrollment.status === 'COMPLETED'
      };
    }

    // 3. Fetch lesson progress records
    const lessonProgresses = await LessonProgressModel.find({
      tenantId,
      studentId,
      courseId
    }).lean();

    const progressMap = new Map<string, any>();
    lessonProgresses.forEach((lp) => progressMap.set(lp.lessonId.toString(), lp));

    // Determine resumable lesson
    let targetLesson: any = null;

    // Check if lastLessonId exists and is incomplete
    if (enrollment.lastLessonId) {
      const lastLp = progressMap.get(enrollment.lastLessonId.toString());
      if (lastLp && lastLp.status !== 'COMPLETED') {
        targetLesson = lessons.find((l) => l._id.toString() === enrollment.lastLessonId!.toString());
      }
    }

    // If not found, pick first incomplete lesson in curriculum order
    if (!targetLesson) {
      for (const l of lessons) {
        const lp = progressMap.get(l._id.toString());
        if (!lp || lp.status !== 'COMPLETED') {
          targetLesson = l;
          break;
        }
      }
    }

    // If all lessons completed, target the first lesson for review or last lesson
    if (!targetLesson) {
      targetLesson = lessons[0];
    }

    const targetModule = modules.find((m) => m._id.toString() === targetLesson.moduleId.toString());
    const targetLp = progressMap.get(targetLesson._id.toString());

    return {
      courseId,
      courseTitle: course.title,
      courseSlug: course.slug,
      thumbnailUrl: course.thumbnailUrl,
      progressPercent: enrollment.progressPercent || 0,
      completedLessons: enrollment.completedLessons || 0,
      totalLessons: lessons.length,
      isCompleted: enrollment.status === 'COMPLETED',
      resumableLesson: {
        id: targetLesson._id.toString(),
        title: targetLesson.title,
        type: targetLesson.type,
        moduleId: targetLesson.moduleId.toString(),
        moduleTitle: targetModule?.title || 'Course Module',
        estimatedDurationMinutes: targetLesson.estimatedDurationMinutes || 0,
        lastPositionSeconds: targetLp?.lastPositionSeconds || 0,
        status: targetLp?.status || 'NOT_STARTED'
      }
    };
  }

  /**
   * Get Student-Safe Course Overview with Progress & Module Hierarchy
   */
  static async getStudentCourseOverview(studentId: string, courseId: string): Promise<IStudentCourseDetailDTO> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    // 1. Verify enrollment
    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (!enrollment) {
      throw new NotFoundError('Course enrollment not found');
    }

    // 2. Fetch course (must be published or enrolled)
    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId
    }).lean();

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // 3. Fetch modules & lessons in canonical order
    const modules = await CourseModuleModel.find({
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    const moduleIds = modules.map((m) => m._id);
    const lessons = await LessonModel.find({
      tenantId,
      courseId,
      moduleId: { $in: moduleIds },
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    // 4. Fetch student lesson progress
    const progressRecords = await LessonProgressModel.find({
      tenantId,
      studentId,
      courseId
    }).lean();

    const progressMap = new Map<string, any>();
    progressRecords.forEach((lp) => progressMap.set(lp.lessonId.toString(), lp));

    // Construct curriculum DTOs
    const curriculumModules: IStudentCurriculumModuleDTO[] = modules.map((m, mIdx) => {
      const moduleLessons = lessons.filter((l) => l.moduleId.toString() === m._id.toString());
      const lessonDTOs: IStudentCurriculumLessonDTO[] = moduleLessons.map((l, lIdx) => {
        const lp = progressMap.get(l._id.toString());
        return {
          id: l._id.toString(),
          title: l.title,
          description: l.description || '',
          type: l.type,
          order: l.order || lIdx + 1,
          estimatedDurationMinutes: l.estimatedDurationMinutes || 0,
          isPreview: l.isPreview || false,
          status: lp?.status || 'NOT_STARTED',
          isCompleted: lp?.status === 'COMPLETED',
          lastPositionSeconds: lp?.lastPositionSeconds || 0
        };
      });

      return {
        id: m._id.toString(),
        title: m.title,
        description: m.description || '',
        order: m.order || mIdx + 1,
        lessons: lessonDTOs
      };
    });

    // 5. Linked Assessments
    const linkedAssessments = await AssessmentModel.find({
      tenantId,
      courseId,
      status: 'PUBLISHED'
    })
      .select('title slug type durationMinutes passingScorePercent maxAttempts')
      .sort({ createdAt: 1 })
      .lean();

    return {
      course: {
        id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        shortDescription: course.shortDescription || '',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl,
        level: course.level,
        language: course.language,
        durationMinutes: course.durationMinutes || 0,
        status: course.status
      },
      enrollment: {
        id: enrollment._id.toString(),
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        lastAccessedAt: enrollment.lastAccessedAt,
        lastLessonId: enrollment.lastLessonId?.toString() || null,
        progressPercent: enrollment.progressPercent || 0,
        completedLessons: enrollment.completedLessons || 0,
        totalLessons: lessons.length
      },
      modules: curriculumModules,
      assessments: linkedAssessments.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        slug: a.slug,
        type: a.type,
        durationMinutes: a.durationMinutes,
        passingScorePercent: a.passingScorePercent,
        maxAttempts: a.maxAttempts
      }))
    };
  }

  /**
   * Get Student-Safe Player Payload for a single Lesson:
   * - Validates enrollment & active status
   * - Resolves previous and next lesson IDs in curriculum order
   * - Returns sanitized content without exposing internal administrative metadata
   */
  static async getStudentLessonPlayer(
    studentId: string,
    courseId: string,
    lessonId: string
  ): Promise<IStudentLessonPlayerDTO> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    // 1. Verify enrollment
    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (!enrollment) {
      throw new NotFoundError('Active enrollment required to access course player');
    }

    const lifecycle = await StudentLifecycleModel.findOne({
      tenantId,
      studentUserId: studentId,
      currentEnrollmentId: enrollment._id
    }).lean();

    if (lifecycle && ['PENDING_ACTIVATION', 'WITHDRAWN', 'DROPPED'].includes(lifecycle.currentStatus)) {
      throw new ForbiddenError(`Active academic standing required to access learning player (Current standing: ${lifecycle.currentStatus})`);
    }

    // 2. Fetch all modules & active lessons in canonical order for navigation
    const modules = await CourseModuleModel.find({
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    const moduleIds = modules.map((m) => m._id);
    const allLessons = await LessonModel.find({
      tenantId,
      courseId,
      moduleId: { $in: moduleIds },
      status: 'ACTIVE'
    }).sort({ order: 1 }).lean();

    const activeLessonIndex = allLessons.findIndex((l) => l._id.toString() === lessonId);
    if (activeLessonIndex === -1) {
      throw new NotFoundError('Lesson not found or inactive in this course');
    }

    const currentLesson = allLessons[activeLessonIndex];
    const prevLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
    const nextLesson = activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

    // 3. Fetch progress for current lesson and all lessons
    const progressRecords = await LessonProgressModel.find({
      tenantId,
      studentId,
      courseId
    }).lean();

    const progressMap = new Map<string, any>();
    progressRecords.forEach((lp) => progressMap.set(lp.lessonId.toString(), lp));
    const currentLp = progressMap.get(lessonId);

    // 4. Build curriculum sidebar navigation
    const curriculumModules: IStudentCurriculumModuleDTO[] = modules.map((m, mIdx) => {
      const moduleLessons = allLessons.filter((l) => l.moduleId.toString() === m._id.toString());
      return {
        id: m._id.toString(),
        title: m.title,
        description: m.description || '',
        order: m.order || mIdx + 1,
        lessons: moduleLessons.map((l, lIdx) => {
          const lp = progressMap.get(l._id.toString());
          return {
            id: l._id.toString(),
            title: l.title,
            description: l.description || '',
            type: l.type,
            order: l.order || lIdx + 1,
            estimatedDurationMinutes: l.estimatedDurationMinutes || 0,
            isPreview: l.isPreview || false,
            status: lp?.status || 'NOT_STARTED',
            isCompleted: lp?.status === 'COMPLETED',
            lastPositionSeconds: lp?.lastPositionSeconds || 0
          };
        })
      };
    });

    // 5. Update lastAccessedAt and lastLessonId on Enrollment
    await EnrollmentModel.findByIdAndUpdate(enrollment._id, {
      $set: {
        lastAccessedAt: new Date(),
        lastLessonId: lessonId
      }
    });

    return {
      course: {
        id: courseId,
        title: (enrollment as any).courseTitle || 'Masterclass',
        progressPercent: enrollment.progressPercent || 0,
        completedLessons: enrollment.completedLessons || 0,
        totalLessons: allLessons.length
      },
      lesson: {
        id: currentLesson._id.toString(),
        moduleId: currentLesson.moduleId.toString(),
        title: currentLesson.title,
        description: currentLesson.description || '',
        type: currentLesson.type,
        content: currentLesson.content || {},
        estimatedDurationMinutes: currentLesson.estimatedDurationMinutes || 0,
        isPreview: currentLesson.isPreview || false,
        status: currentLp?.status || 'NOT_STARTED',
        isCompleted: currentLp?.status === 'COMPLETED',
        lastPositionSeconds: currentLp?.lastPositionSeconds || 0
      },
      navigation: {
        prevLessonId: prevLesson ? prevLesson._id.toString() : null,
        nextLessonId: nextLesson ? nextLesson._id.toString() : null,
        hasPrev: Boolean(prevLesson),
        hasNext: Boolean(nextLesson)
      },
      curriculum: curriculumModules
    };
  }
}
