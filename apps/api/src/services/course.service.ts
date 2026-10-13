import { CourseModel, ICourseDocument } from '@edtech/database';
import { getWorkspaceContext, slugify } from '@edtech/utils';
import { NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { ICourseFilterQuery } from '@edtech/types';
import { Types } from 'mongoose';

export class CourseService {
  /**
   * Deterministic Tenant-Scoped Slug Generator
   * Ensures slug uniqueness ONLY within the specified tenantId context.
   */
  private static async generateTenantSlug(tenantId: string, title: string, currentCourseId?: string): Promise<string> {
    const baseSlug = slugify(title) || 'course';
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const query: any = { tenantId, slug };
      if (currentCourseId) {
        query._id = { $ne: currentCourseId };
      }
      const existing = await CourseModel.findOne(query).select('_id').lean();
      if (!existing) {
        return slug;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }

  /**
   * Create Course
   * Enforces status = 'DRAFT', publishedAt = null, and derives tenantId/createdBy from WorkspaceContext.
   */
  public static async createCourse(data: {
    title: string;
    shortDescription?: string;
    description?: string;
    thumbnailUrl?: string;
    categoryId?: string;
    level?: string;
    language?: string;
    durationMinutes?: number;
    visibility?: string;
  }): Promise<ICourseDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    const slug = await CourseService.generateTenantSlug(currentTenantId, data.title);

    let course: ICourseDocument;
    try {
      course = await CourseModel.create({
        tenantId: new Types.ObjectId(currentTenantId),
        title: data.title,
        slug,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        categoryId: data.categoryId,
        level: data.level || 'BEGINNER',
        language: data.language || 'English',
        durationMinutes: data.durationMinutes || 0,
        status: 'DRAFT',
        visibility: data.visibility || 'PUBLIC',
        createdBy: new Types.ObjectId(currentUserId),
        updatedBy: new Types.ObjectId(currentUserId),
        publishedAt: null
      });
    } catch (err: any) {
      // Race condition safety: retry once with fallback suffix if duplicate key error occurred
      if (err.code === 11000) {
        const fallbackSlug = `${slug}-${Date.now().toString().slice(-4)}`;
        course = await CourseModel.create({
          tenantId: new Types.ObjectId(currentTenantId),
          title: data.title,
          slug: fallbackSlug,
          shortDescription: data.shortDescription,
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          categoryId: data.categoryId,
          level: data.level || 'BEGINNER',
          language: data.language || 'English',
          durationMinutes: data.durationMinutes || 0,
          status: 'DRAFT',
          visibility: data.visibility || 'PUBLIC',
          createdBy: new Types.ObjectId(currentUserId),
          updatedBy: new Types.ObjectId(currentUserId),
          publishedAt: null
        });
      } else {
        throw err;
      }
    }

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_CREATED',
      resource: 'Course',
      resourceId: course._id.toString(),
      metadata: { title: course.title, slug: course.slug }
    });

    return course;
  }

  /**
   * Get Course By ID (Tenant Isolated)
   */
  public static async getCourseById(courseId: string): Promise<ICourseDocument> {
    const { currentTenantId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    const query: any = { _id: courseId };
    if (currentTenantId && Types.ObjectId.isValid(currentTenantId)) {
      query.tenantId = currentTenantId;
    }

    const course = await CourseModel.findOne(query);

    if (!course) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    return course;
  }

  /**
   * List Courses (Tenant Isolated with Filtering & Pagination)
   */
  public static async listCourses(queryFilter: ICourseFilterQuery) {
    const { currentTenantId } = getWorkspaceContext();

    const page = Math.max(1, queryFilter.page || 1);
    const limit = Math.min(100, Math.max(1, queryFilter.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (currentTenantId && Types.ObjectId.isValid(currentTenantId)) {
      filter.tenantId = currentTenantId;
    }

    if (queryFilter.search) {
      filter.title = { $regex: queryFilter.search, $options: 'i' };
    }
    if (queryFilter.status) {
      filter.status = queryFilter.status;
    }
    if (queryFilter.visibility) {
      filter.visibility = queryFilter.visibility;
    }
    if (queryFilter.level) {
      filter.level = queryFilter.level;
    }
    if (queryFilter.categoryId) {
      filter.categoryId = queryFilter.categoryId;
    }

    const sortField = queryFilter.sortBy || 'createdAt';
    const sortOrder = queryFilter.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    const [courses, total] = await Promise.all([
      CourseModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      CourseModel.countDocuments(filter)
    ]);

    return {
      courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update Course (Tenant Isolated)
   * Client status and publishedAt modifications are stripped/ignored.
   */
  public static async updateCourse(
    courseId: string,
    updates: {
      title?: string;
      shortDescription?: string;
      description?: string;
      thumbnailUrl?: string;
      categoryId?: string;
      level?: any;
      language?: string;
      durationMinutes?: number;
      visibility?: any;
    }
  ): Promise<ICourseDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    if (updates.title && updates.title !== course.title) {
      course.title = updates.title;
      course.slug = await CourseService.generateTenantSlug(currentTenantId, updates.title, course._id.toString());
    }

    if (updates.shortDescription !== undefined) course.shortDescription = updates.shortDescription;
    if (updates.description !== undefined) course.description = updates.description;
    if (updates.thumbnailUrl !== undefined) course.thumbnailUrl = updates.thumbnailUrl;
    if (updates.categoryId !== undefined) course.categoryId = updates.categoryId;
    if (updates.level !== undefined) course.level = updates.level;
    if (updates.language !== undefined) course.language = updates.language;
    if (updates.durationMinutes !== undefined) course.durationMinutes = updates.durationMinutes;
    if (updates.visibility !== undefined) course.visibility = updates.visibility;

    course.updatedBy = new Types.ObjectId(currentUserId);
    await course.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_UPDATED',
      resource: 'Course',
      resourceId: course._id.toString(),
      metadata: { title: course.title, slug: course.slug }
    });

    return course;
  }

  /**
   * Archive Course (Soft-Delete)
   * Sets status = 'ARCHIVED' and audits the event.
   */
  public static async deleteCourse(courseId: string): Promise<{ archived: boolean; courseId: string }> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId: currentTenantId
    });

    if (!course) {
      throw new NotFoundError(`Course '${courseId}' not found`);
    }

    course.status = 'ARCHIVED';
    course.updatedBy = new Types.ObjectId(currentUserId);
    await course.save();

    await AuditService.logEvent({
      actorId: currentUserId,
      tenantId: currentTenantId,
      action: 'COURSE_ARCHIVED',
      resource: 'Course',
      resourceId: course._id.toString()
    });

    return { archived: true, courseId: course._id.toString() };
  }
}
