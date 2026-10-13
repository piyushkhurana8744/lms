import { CourseModel, CourseModuleModel, LessonModel, MediaModel, ICourseDocument } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { NotFoundError, BadRequestError } from '../errors/appError';
import { AuditService } from './audit.service';
import { Types } from 'mongoose';

export interface ReadinessError {
  code: string;
  message: string;
  field?: string;
  location?: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  };
}

export interface ReadinessResult {
  ready: boolean;
  errors: ReadinessError[];
  warnings: string[];
}

export class CoursePublishingService {
  /**
   * Comprehensive Course Readiness Validator
   */
  public static async validateCourseReadiness(courseId: string): Promise<ReadinessResult> {
    const { currentTenantId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError('Course not found');
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const errors: ReadinessError[] = [];
    const warnings: string[] = [];

    if (course.status === 'ARCHIVED') {
      errors.push({
        code: 'COURSE_ARCHIVED',
        message: 'Archived courses cannot be validated or published',
        location: { courseId }
      });
      return { ready: false, errors, warnings };
    }

    // 1. Course Metadata Validation
    if (!course.title || course.title.trim() === '') {
      errors.push({
        code: 'COURSE_TITLE_MISSING',
        message: 'Course title is required',
        field: 'title',
        location: { courseId }
      });
    }

    // 2. Curriculum & Modules Validation
    const activeModules = await CourseModuleModel.find({
      courseId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    }).sort({ order: 1 });

    if (activeModules.length === 0) {
      errors.push({
        code: 'COURSE_NO_MODULES',
        message: 'Course must contain at least one active module',
        location: { courseId }
      });
    }

    // 3. Lessons & Content Validation for Each Module
    for (const module of activeModules) {
      const activeLessons = await LessonModel.find({
        courseId,
        moduleId: module._id,
        tenantId: currentTenantId,
        status: 'ACTIVE'
      }).sort({ order: 1 });

      if (activeLessons.length === 0) {
        errors.push({
          code: 'MODULE_NO_LESSONS',
          message: `Module '${module.title}' contains no active lessons`,
          location: { courseId, moduleId: module._id.toString() }
        });
        continue;
      }

      for (const lesson of activeLessons) {
        const lessonLoc = { courseId, moduleId: module._id.toString(), lessonId: lesson._id.toString() };
        const content = (lesson.content as any) || {};

        if (!lesson.title || lesson.title.trim() === '') {
          errors.push({
            code: 'LESSON_TITLE_MISSING',
            message: `Lesson in module '${module.title}' is missing a title`,
            location: lessonLoc
          });
        }

        switch (lesson.type) {
          case 'TEXT':
            if (!content.bodyHtml || typeof content.bodyHtml !== 'string' || content.bodyHtml.trim() === '') {
              errors.push({
                code: 'LESSON_MISSING_TEXT_BODY',
                message: `Text lesson '${lesson.title}' is missing HTML body content`,
                location: lessonLoc
              });
            }
            break;

          case 'EXTERNAL_RESOURCE':
            if (!content.url || typeof content.url !== 'string') {
              errors.push({
                code: 'LESSON_INVALID_EXTERNAL_URL',
                message: `External resource lesson '${lesson.title}' requires a valid URL`,
                location: lessonLoc
              });
            } else {
              try {
                const parsed = new URL(content.url);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                  errors.push({
                    code: 'LESSON_INVALID_EXTERNAL_URL',
                    message: `External resource lesson '${lesson.title}' must use http:// or https:// protocol`,
                    location: lessonLoc
                  });
                }
              } catch {
                errors.push({
                  code: 'LESSON_INVALID_EXTERNAL_URL',
                  message: `External resource lesson '${lesson.title}' has an invalid URL format`,
                  location: lessonLoc
                });
              }
            }
            break;

          case 'VIDEO':
          case 'PDF':
          case 'AUDIO':
            if (content.mediaId) {
              const media = await MediaModel.findOne({
                _id: content.mediaId,
                tenantId: currentTenantId,
                status: { $ne: 'DELETED' }
              });

              if (!media) {
                errors.push({
                  code: 'LESSON_MEDIA_NOT_FOUND',
                  message: `Lesson '${lesson.title}' references a media asset that does not exist in this tenant`,
                  location: lessonLoc
                });
              } else if (media.status !== 'READY') {
                errors.push({
                  code: 'LESSON_MEDIA_NOT_READY',
                  message: `Lesson '${lesson.title}' references a media asset that is not ready (status: ${media.status})`,
                  location: lessonLoc
                });
              }
            }
            break;

          case 'LIVE':
            if (content.startAt && content.endAt) {
              if (new Date(content.startAt) >= new Date(content.endAt)) {
                errors.push({
                  code: 'LESSON_LIVE_INVALID_TIMES',
                  message: `Live session lesson '${lesson.title}' has start time at or after end time`,
                  location: lessonLoc
                });
              }
            }
            break;
        }
      }
    }

    return {
      ready: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Submit Course for Review (DRAFT -> UNDER_REVIEW)
   */
  public static async submitForReview(courseId: string): Promise<ICourseDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError('Course not found');
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.status === 'UNDER_REVIEW') {
      throw new BadRequestError('Course is already under review');
    }
    if (course.status === 'PUBLISHED') {
      throw new BadRequestError('Course is already published');
    }
    if (course.status === 'ARCHIVED') {
      throw new BadRequestError('Archived course cannot be submitted for review');
    }
    if (course.status !== 'DRAFT') {
      throw new BadRequestError(`Invalid status transition from '${course.status}' to 'UNDER_REVIEW'`);
    }

    // Readiness validation
    const readiness = await CoursePublishingService.validateCourseReadiness(courseId);
    if (!readiness.ready) {
      const errorMsg = readiness.errors.map((e) => e.message).join('; ');
      throw new BadRequestError(`Course is not ready for review: ${errorMsg}`);
    }

    const previousStatus = course.status;
    course.status = 'UNDER_REVIEW';
    course.updatedBy = new Types.ObjectId(currentUserId);
    await course.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'course.submitted_for_review',
      resource: 'Course',
      resourceId: course._id.toString(),
      metadata: { previousStatus, newStatus: 'UNDER_REVIEW' }
    });

    return course;
  }

  /**
   * Publish Course (UNDER_REVIEW -> PUBLISHED)
   */
  public static async publishCourse(courseId: string): Promise<ICourseDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError('Course not found');
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.status === 'PUBLISHED') {
      throw new BadRequestError('Course is already published');
    }
    if (course.status === 'ARCHIVED') {
      throw new BadRequestError('Archived course cannot be published');
    }

    // Readiness validation
    const readiness = await CoursePublishingService.validateCourseReadiness(courseId);
    if (!readiness.ready) {
      const errorMsg = readiness.errors.map((e) => e.message).join('; ');
      throw new BadRequestError(`Course is not ready to be published: ${errorMsg}`);
    }

    const previousStatus = course.status;
    const now = new Date();
    course.status = 'PUBLISHED';
    course.publishedAt = now;
    course.updatedBy = new Types.ObjectId(currentUserId);
    await course.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'course.published',
      resource: 'Course',
      resourceId: course._id.toString(),
      metadata: { previousStatus, newStatus: 'PUBLISHED', publishedAt: now }
    });

    return course;
  }

  /**
   * Unpublish Course (PUBLISHED -> DRAFT)
   */
  public static async unpublishCourse(courseId: string): Promise<ICourseDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError('Course not found');
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestError('Course is not currently published');
    }

    const previousStatus = course.status;
    course.status = 'DRAFT';
    course.publishedAt = null;
    course.updatedBy = new Types.ObjectId(currentUserId);
    await course.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'course.unpublished',
      resource: 'Course',
      resourceId: course._id.toString(),
      metadata: { previousStatus, newStatus: 'DRAFT' }
    });

    return course;
  }
}
