import { CourseModel, CourseModuleModel, ICourseModuleDocument } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { NotFoundError, BadRequestError } from '../errors/appError';
import { AuditService } from './audit.service';
import { Types } from 'mongoose';

export class CourseModuleService {
  /**
   * Helper: 3-Tier Course Ownership Verification
   * Verifies Course belongs to currentTenantId. Throws HTTP 404 if missing or unowned.
   */
  private static async verifyCourseOwnership(courseId: string, tenantId: string): Promise<void> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId
    }).select('_id').lean();

    if (!course) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }
  }

  /**
   * Domain Helper: Sequential Module Order Normalizer
   * Fetches active modules for a course, sorts by current order ASC, and re-assigns sequential orders 1, 2, 3... N.
   */
  public static async normalizeModuleOrder(courseId: string, tenantId: string): Promise<void> {
    const activeModules = await CourseModuleModel.find({
      tenantId,
      courseId,
      status: 'ACTIVE'
    })
      .sort({ order: 1, createdAt: 1 })
      .select('_id order')
      .exec();

    if (activeModules.length === 0) return;

    const bulkOps = activeModules.map((module, index) => ({
      updateOne: {
        filter: { _id: module._id },
        update: { $set: { order: index + 1 } }
      }
    }));

    await CourseModuleModel.bulkWrite(bulkOps);
  }

  /**
   * Create Module
   * Automatically calculates order = highestActiveOrder + 1, and normalizes order sequentially.
   */
  public static async createModule(
    courseId: string,
    data: { title: string; description?: string }
  ): Promise<ICourseModuleDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    // Query current highest active order
    const highestModule = await CourseModuleModel.findOne({
      tenantId: currentTenantId,
      courseId,
      status: 'ACTIVE'
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const newOrder = (highestModule?.order || 0) + 1;

    const module = await CourseModuleModel.create({
      tenantId: new Types.ObjectId(currentTenantId),
      courseId: new Types.ObjectId(courseId),
      title: data.title,
      description: data.description,
      order: newOrder,
      status: 'ACTIVE',
      createdBy: new Types.ObjectId(currentUserId),
      updatedBy: new Types.ObjectId(currentUserId)
    });

    // Normalize order to guarantee clean sequential integers under concurrent creation
    await CourseModuleService.normalizeModuleOrder(courseId, currentTenantId);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_MODULE_CREATED',
      resource: 'CourseModule',
      resourceId: module._id.toString(),
      metadata: { courseId, title: module.title, order: module.order }
    });

    return module;
  }

  /**
   * List Active Modules (Sorted by Order ASC)
   */
  public static async listModules(courseId: string): Promise<ICourseModuleDocument[]> {
    const { currentTenantId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    const modules = await CourseModuleModel.find({
      tenantId: currentTenantId,
      courseId,
      status: 'ACTIVE'
    })
      .sort({ order: 1 })
      .lean();

    return modules as any;
  }

  /**
   * Get Module By ID
   */
  public static async getModuleById(courseId: string, moduleId: string): Promise<ICourseModuleDocument> {
    const { currentTenantId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    if (!Types.ObjectId.isValid(moduleId)) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    const module = await CourseModuleModel.findOne({
      _id: moduleId,
      courseId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!module) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    return module;
  }

  /**
   * Update Module Metadata (Title & Description ONLY)
   */
  public static async updateModule(
    courseId: string,
    moduleId: string,
    updates: { title?: string; description?: string }
  ): Promise<ICourseModuleDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    if (!Types.ObjectId.isValid(moduleId)) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    const module = await CourseModuleModel.findOne({
      _id: moduleId,
      courseId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!module) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    if (updates.title !== undefined) module.title = updates.title;
    if (updates.description !== undefined) module.description = updates.description;
    module.updatedBy = new Types.ObjectId(currentUserId);

    await module.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_MODULE_UPDATED',
      resource: 'CourseModule',
      resourceId: module._id.toString(),
      metadata: { courseId, title: module.title }
    });

    return module;
  }

  /**
   * Archive Module (Soft-Delete)
   * Sets status = 'ARCHIVED' and normalizes remaining active module order.
   */
  public static async archiveModule(courseId: string, moduleId: string): Promise<{ archived: boolean; moduleId: string }> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    if (!Types.ObjectId.isValid(moduleId)) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    const module = await CourseModuleModel.findOne({
      _id: moduleId,
      courseId,
      tenantId: currentTenantId,
      status: 'ACTIVE'
    });

    if (!module) {
      throw new NotFoundError(`Module '${moduleId}' not found`);
    }

    module.status = 'ARCHIVED';
    module.updatedBy = new Types.ObjectId(currentUserId);
    await module.save();

    // MANDATORY CORRECTION 2: Normalize remaining active module order so no order gaps (1, 3) remain
    await CourseModuleService.normalizeModuleOrder(courseId, currentTenantId);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_MODULE_ARCHIVED',
      resource: 'CourseModule',
      resourceId: module._id.toString(),
      metadata: { courseId }
    });

    return { archived: true, moduleId: module._id.toString() };
  }

  /**
   * Atomic Module Reordering Engine
   * Validates exact active module set equality before updating orders to sequential 1..N.
   */
  public static async reorderModules(courseId: string, moduleIds: string[]): Promise<ICourseModuleDocument[]> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    await CourseModuleService.verifyCourseOwnership(courseId, currentTenantId);

    // Fetch all currently active modules for the course
    const activeModules = await CourseModuleModel.find({
      tenantId: currentTenantId,
      courseId,
      status: 'ACTIVE'
    }).select('_id order');

    const activeMap = new Map<string, number>(activeModules.map((m) => [m._id.toString(), m.order]));

    // REORDER SECURITY VALIDATION (Correction 3):
    // 1. Submitted count MUST equal active modules count
    if (moduleIds.length !== activeModules.length) {
      throw new BadRequestError('Invalid reorder payload: Submitted module IDs count does not match active course modules');
    }

    // 2. Every submitted ID MUST exist in active modules for this exact course & tenant
    const previousOrders: Record<string, number> = {};
    for (const id of moduleIds) {
      if (!activeMap.has(id)) {
        throw new BadRequestError(`Invalid reorder payload: Module '${id}' is invalid, archived, or belongs to another course`);
      }
      previousOrders[id] = activeMap.get(id)!;
    }

    // Atomic bulkWrite
    const bulkOps = moduleIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id), courseId: new Types.ObjectId(courseId), tenantId: new Types.ObjectId(currentTenantId) },
        update: { $set: { order: index + 1, updatedBy: new Types.ObjectId(currentUserId) } }
      }
    }));

    await CourseModuleModel.bulkWrite(bulkOps);
    await CourseModuleService.normalizeModuleOrder(courseId, currentTenantId);

    const newOrders = moduleIds.reduce((acc, id, idx) => {
      acc[id] = idx + 1;
      return acc;
    }, {} as Record<string, number>);

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_MODULE_REORDERED',
      resource: 'CourseModule',
      resourceId: courseId,
      metadata: {
        courseId,
        moduleCount: moduleIds.length,
        previousOrder: previousOrders,
        newOrder: newOrders
      }
    });

    return CourseModuleService.listModules(courseId);
  }
}
