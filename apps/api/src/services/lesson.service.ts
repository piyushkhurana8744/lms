import { CourseModel, CourseModuleModel, LessonModel, MediaModel, ILessonDocument } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { validateLessonContent } from '@edtech/validation';
import { NotFoundError, BadRequestError } from '../errors/appError';
import { AuditService } from './audit.service';
import { Types } from 'mongoose';

export class LessonService {
  /**
   * Helper: Verify Media ownership within active tenant scope and validate media type compatibility
   */
  private static async verifyMediaOwnership(mediaId: string, tenantId: string, lessonType?: string): Promise<void> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new NotFoundError('Media resource not found');
    }

    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId,
      status: 'READY'
    }).lean();

    if (!media) {
      // Security Rule: Return 404 Not Found to prevent cross-tenant enumeration
      throw new NotFoundError('Media resource not found');
    }

    // Enforce Media Type Compatibility
    if (lessonType) {
      if (lessonType === 'VIDEO' && media.mediaType !== 'VIDEO') {
        throw new BadRequestError(`Lesson type 'VIDEO' requires a VIDEO media asset, but received '${media.mediaType}'`);
      }
      if (lessonType === 'PDF' && media.mediaType !== 'PDF') {
        throw new BadRequestError(`Lesson type 'PDF' requires a PDF media asset, but received '${media.mediaType}'`);
      }
      if (lessonType === 'AUDIO' && media.mediaType !== 'AUDIO') {
        throw new BadRequestError(`Lesson type 'AUDIO' requires an AUDIO media asset, but received '${media.mediaType}'`);
      }
    }
  }

  /**
   * Helper: 4-Tier Hierarchy Verification
   * Validates Tenant -> Course -> Module chain. Throws HTTP 404 for unowned/missing resources.
   */
  private static async verifyModuleOwnership(courseId: string, moduleId: string, tenantId: string): Promise<void> {
    if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(moduleId)) {
      throw new NotFoundError('Module or Course not found');
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId
    }).select('_id').lean();

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const module = await CourseModuleModel.findOne({
      _id: moduleId,
      courseId,
      tenantId,
      status: 'ACTIVE'
    }).select('_id').lean();

    if (!module) {
      throw new NotFoundError('Module not found');
    }
  }

  /**
   * Domain Helper: Sequential Lesson Order Normalizer
   * Fetches active lessons for a module, sorts by current order ASC, and re-assigns sequential orders 1, 2, 3... N.
   */
  public static async normalizeLessonOrder(moduleId: string, tenantId: string): Promise<void> {
    const activeLessons = await LessonModel.find({
      tenantId,
      moduleId,
      status: 'ACTIVE'
    })
      .sort({ order: 1, createdAt: 1 })
      .select('_id order')
      .exec();

    if (activeLessons.length === 0) return;

    const bulkOps = activeLessons.map((lesson, index) => ({
      updateOne: {
        filter: { _id: lesson._id },
        update: { $set: { order: index + 1 } }
      }
    }));

    await LessonModel.bulkWrite(bulkOps);
  }

  /**
   * Create Lesson
   * Automatically calculates order = highestActiveOrder + 1, and normalizes order sequentially.
   */
  public static async createLesson(
    courseId: string,
    moduleId: string,
    data: {
      title: string;
      description?: string;
      type?: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
      content?: Record<string, any>;
      isPreview?: boolean;
      estimatedDurationMinutes?: number;
    }
  ): Promise<ILessonDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    const type = data.type || 'TEXT';
    const validatedContent = validateLessonContent(type, data.content);

    if (validatedContent?.mediaId) {
      await LessonService.verifyMediaOwnership(validatedContent.mediaId, currentTenantId, type);
    }

    // Query current highest active order
    const highestLesson = await LessonModel.findOne({
      tenantId: currentTenantId,
      courseId,
      moduleId,
      status: 'ACTIVE'
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const newOrder = (highestLesson?.order || 0) + 1;

    const lesson = await LessonModel.create({
      tenantId: new Types.ObjectId(currentTenantId),
      courseId: new Types.ObjectId(courseId),
      moduleId: new Types.ObjectId(moduleId),
      title: data.title,
      description: data.description,
      type,
      content: validatedContent,
      order: newOrder,
      status: 'ACTIVE',
      isPreview: data.isPreview ?? false,
      estimatedDurationMinutes: data.estimatedDurationMinutes ?? 0,
      createdBy: new Types.ObjectId(currentUserId),
      updatedBy: new Types.ObjectId(currentUserId)
    });

    // Normalize order to guarantee clean sequential integers under concurrent creation
    await LessonService.normalizeLessonOrder(moduleId, currentTenantId);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_LESSON_CREATED',
      resource: 'Lesson',
      resourceId: lesson._id.toString(),
      metadata: { courseId, moduleId, title: lesson.title, order: lesson.order, type: lesson.type }
    });

    return lesson;
  }

  /**
   * List Active Lessons (Sorted by Order ASC)
   */
  public static async listLessons(courseId: string, moduleId: string): Promise<ILessonDocument[]> {
    const { currentTenantId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    const lessons = await LessonModel.find({
      tenantId: currentTenantId,
      courseId,
      moduleId,
      status: 'ACTIVE'
    })
      .sort({ order: 1 })
      .lean();

    return lessons as any;
  }

  /**
   * Get Lesson By ID
   */
  public static async getLessonById(courseId: string, moduleId: string, lessonId: string): Promise<ILessonDocument> {
    const { currentTenantId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    const lesson = await LessonModel.findOne({
      _id: lessonId,
      courseId,
      moduleId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    return lesson;
  }

  /**
   * Update Lesson Metadata & Content
   */
  public static async updateLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    updates: {
      title?: string;
      description?: string;
      type?: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
      content?: Record<string, any>;
      isPreview?: boolean;
      estimatedDurationMinutes?: number;
    }
  ): Promise<ILessonDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    const lesson = await LessonModel.findOne({
      _id: lessonId,
      courseId,
      moduleId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    const targetType = updates.type || lesson.type;
    let contentChanged = false;

    if (updates.content !== undefined || updates.type !== undefined) {
      const contentToValidate = updates.content !== undefined ? updates.content : lesson.content;
      const validatedContent = validateLessonContent(targetType, contentToValidate);

      if (validatedContent?.mediaId) {
        await LessonService.verifyMediaOwnership(validatedContent.mediaId, currentTenantId, targetType);
      }

      lesson.content = validatedContent;
      contentChanged = true;
    }

    if (updates.title !== undefined) lesson.title = updates.title;
    if (updates.description !== undefined) lesson.description = updates.description;
    if (updates.type !== undefined) lesson.type = updates.type;
    if (updates.isPreview !== undefined) lesson.isPreview = updates.isPreview;
    if (updates.estimatedDurationMinutes !== undefined) lesson.estimatedDurationMinutes = updates.estimatedDurationMinutes;
    lesson.updatedBy = new Types.ObjectId(currentUserId);

    await lesson.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: contentChanged ? 'lesson.content.updated' : 'COURSE_LESSON_UPDATED',
      resource: 'Lesson',
      resourceId: lesson._id.toString(),
      metadata: { courseId, moduleId, title: lesson.title, type: lesson.type }
    });

    return lesson;
  }

  /**
   * Archive Lesson (Soft-Delete)
   * Sets status = 'INACTIVE' and normalizes remaining active lesson order.
   */
  public static async archiveLesson(courseId: string, moduleId: string, lessonId: string): Promise<{ archived: boolean; lessonId: string }> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    const lesson = await LessonModel.findOne({
      _id: lessonId,
      courseId,
      moduleId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    lesson.status = 'INACTIVE';
    lesson.updatedBy = new Types.ObjectId(currentUserId);
    await lesson.save();

    // Normalize remaining active lesson order so no order gaps (1, 3) remain
    await LessonService.normalizeLessonOrder(moduleId, currentTenantId);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_LESSON_ARCHIVED',
      resource: 'Lesson',
      resourceId: lesson._id.toString(),
      metadata: { courseId, moduleId }
    });

    return { archived: true, lessonId: lesson._id.toString() };
  }

  /**
   * Atomic Lesson Reordering Engine
   * Validates exact active lesson set equality before updating orders to sequential 1..N.
   */
  public static async reorderLessons(courseId: string, moduleId: string, lessonIds: string[]): Promise<ILessonDocument[]> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await LessonService.verifyModuleOwnership(courseId, moduleId, currentTenantId);

    // Fetch all currently active lessons for the module
    const activeLessons = await LessonModel.find({
      tenantId: currentTenantId,
      courseId,
      moduleId,
      status: 'ACTIVE'
    }).select('_id order');

    const activeMap = new Map<string, number>(activeLessons.map((l) => [l._id.toString(), l.order]));

    // REORDER SECURITY VALIDATION:
    // 1. Submitted count MUST equal active lessons count
    if (lessonIds.length !== activeLessons.length) {
      throw new BadRequestError('Invalid reorder payload: Submitted lesson IDs count does not match active module lessons');
    }

    // 2. Every submitted ID MUST exist in active lessons for this exact module & tenant
    const previousOrders: Record<string, number> = {};
    for (const id of lessonIds) {
      if (!activeMap.has(id)) {
        throw new BadRequestError(`Invalid reorder payload: Lesson '${id}' is invalid, archived, or belongs to another module`);
      }
      previousOrders[id] = activeMap.get(id)!;
    }

    // Atomic bulkWrite
    const bulkOps = lessonIds.map((id, index) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          courseId: new Types.ObjectId(courseId),
          moduleId: new Types.ObjectId(moduleId),
          tenantId: new Types.ObjectId(currentTenantId)
        },
        update: { $set: { order: index + 1, updatedBy: new Types.ObjectId(currentUserId) } }
      }
    }));

    await LessonModel.bulkWrite(bulkOps);
    await LessonService.normalizeLessonOrder(moduleId, currentTenantId);

    const newOrders = lessonIds.reduce((acc, id, idx) => {
      acc[id] = idx + 1;
      return acc;
    }, {} as Record<string, number>);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_LESSON_REORDERED',
      resource: 'Lesson',
      resourceId: moduleId,
      metadata: {
        courseId,
        moduleId,
        lessonCount: lessonIds.length,
        previousOrder: previousOrders,
        newOrder: newOrders
      }
    });

    return LessonService.listLessons(courseId, moduleId);
  }
}
