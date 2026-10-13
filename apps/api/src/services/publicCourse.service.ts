import { Types } from 'mongoose';
import { CourseModel, CourseModuleModel, LessonModel } from '@edtech/database';
import { PublicCourseQueryPayload } from '@edtech/validation';
import { sanitizeHtml, parseExternalResource } from '@edtech/utils';
import { PublicTenantContext } from '../middleware/publicTenant.middleware';
import { NotFoundError } from '../errors/appError';


export interface PublicCourseDTO {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  level: string;
  language: string;
  durationMinutes: number;
  category: string | null;
  publishedAt: string | null;
}

export interface PublicCourseDetailDTO extends PublicCourseDTO {
  description: string;
  curriculumSummary: {
    moduleCount: number;
    lessonCount: number;
    previewLessonCount: number;
  };
}

export interface PublicCurriculumLessonDTO {
  id: string;
  title: string;
  description: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
  estimatedDurationMinutes: number;
  isPreview: boolean;
  order: number;
}

export interface PublicCurriculumModuleDTO {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: PublicCurriculumLessonDTO[];
}

export interface PublicCurriculumResponseDTO {
  course: {
    id: string;
    slug: string;
    title: string;
  };
  modules: PublicCurriculumModuleDTO[];
}

export interface PublicLessonPreviewDTO {
  lesson: {
    id: string;
    title: string;
    description: string;
    type: string;
    estimatedDurationMinutes: number;
    isPreview: boolean;
    content: any;
  };
}

export interface PublicCourseListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PublicCourseListResult {
  courses: PublicCourseDTO[];
  meta: PublicCourseListMeta;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class PublicCourseService {
  /**
   * Lists published, public courses for the resolved tenant context.
   * Enforces strict tenant isolation and strips private/internal fields.
   */
  public static async listPublicCourses(
    context: PublicTenantContext,
    queryParams: PublicCourseQueryPayload
  ): Promise<PublicCourseListResult> {
    const tenantIdStr = context.tenantId.toString();

    // Mandatory tenant isolation & visibility filters
    const query: any = {
      tenantId: tenantIdStr,
      status: 'PUBLISHED',
      visibility: 'PUBLIC'
    };

    // Filter: Search string over title, shortDescription, description
    if (queryParams.search && queryParams.search.trim().length > 0) {
      const escaped = escapeRegex(queryParams.search.trim());
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { shortDescription: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    // Filter: Category ObjectId
    if (queryParams.category) {
      query.categoryId = queryParams.category;
    }

    // Filter: Level
    if (queryParams.level) {
      query.level = queryParams.level;
    }

    // Filter: Language
    if (queryParams.language && queryParams.language.trim().length > 0) {
      const escapedLang = escapeRegex(queryParams.language.trim());
      query.language = { $regex: escapedLang, $options: 'i' };
    }

    // Sort Mapping
    let sortOptions: Record<string, 1 | -1> = { publishedAt: -1, createdAt: -1 };
    switch (queryParams.sort) {
      case 'oldest':
        sortOptions = { publishedAt: 1, createdAt: 1 };
        break;
      case 'title_asc':
        sortOptions = { title: 1 };
        break;
      case 'title_desc':
        sortOptions = { title: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { publishedAt: -1, createdAt: -1 };
        break;
    }

    // Pagination
    const page = Math.max(1, queryParams.page || 1);
    const limit = Math.min(Math.max(1, queryParams.limit || 12), 50);
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      CourseModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Serialize to PublicCourseDTO (strip tenantId, createdBy, updatedBy, secrets)
    const sanitizedCourses: PublicCourseDTO[] = courses.map((c) => ({
      id: c._id.toString(),
      slug: c.slug,
      title: c.title,
      shortDescription: c.shortDescription || '',
      thumbnail: c.thumbnailUrl || null,
      level: c.level,
      language: c.language || 'English',
      durationMinutes: c.durationMinutes || 0,
      category: c.categoryId || null,
      publishedAt: c.publishedAt ? new Date(c.publishedAt).toISOString() : null
    }));

    return {
      courses: sanitizedCourses,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    };
  }

  /**
   * Fetches a public course by slug for the resolved tenant context.
   * Allows PUBLIC or UNLISTED published courses via direct slug.
   * Includes curriculum summary.
   */
  public static async getPublicCourseBySlug(
    context: PublicTenantContext,
    slug: string
  ): Promise<PublicCourseDetailDTO> {
    const tenantIdStr = context.tenantId.toString();

    const course = await CourseModel.findOne({
      tenantId: tenantIdStr,
      slug: slug.toLowerCase().trim(),
      status: 'PUBLISHED',
      visibility: { $in: ['PUBLIC', 'UNLISTED'] }
    }).lean();

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const activeModules = await CourseModuleModel.find({
      tenantId: tenantIdStr,
      courseId: course._id,
      status: 'ACTIVE'
    }).lean();

    const activeModuleIds = activeModules.map((m) => m._id);

    const activeLessons = await LessonModel.find({
      tenantId: tenantIdStr,
      courseId: course._id,
      moduleId: { $in: activeModuleIds },
      status: 'ACTIVE'
    }).lean();

    const previewLessonCount = activeLessons.filter((l) => l.isPreview).length;

    return {
      id: course._id.toString(),
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription || '',
      description: course.description || '',
      thumbnail: course.thumbnailUrl || null,
      level: course.level,
      language: course.language || 'English',
      durationMinutes: course.durationMinutes || 0,
      category: course.categoryId || null,
      publishedAt: course.publishedAt ? new Date(course.publishedAt).toISOString() : null,
      curriculumSummary: {
        moduleCount: activeModules.length,
        lessonCount: activeLessons.length,
        previewLessonCount
      }
    };
  }

  /**
   * Fetches active curriculum hierarchy for a public course by slug.
   * Exposes only safe lesson metadata (no full content).
   */
  public static async getPublicCurriculumBySlug(
    context: PublicTenantContext,
    slug: string
  ): Promise<PublicCurriculumResponseDTO> {
    const tenantIdStr = context.tenantId.toString();

    const course = await CourseModel.findOne({
      tenantId: tenantIdStr,
      slug: slug.toLowerCase().trim(),
      status: 'PUBLISHED',
      visibility: { $in: ['PUBLIC', 'UNLISTED'] }
    }).lean();

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const modules = await CourseModuleModel.find({
      tenantId: tenantIdStr,
      courseId: course._id,
      status: 'ACTIVE'
    })
      .sort({ order: 1 })
      .lean();

    const moduleIds = modules.map((m) => m._id);

    const lessons = await LessonModel.find({
      tenantId: tenantIdStr,
      courseId: course._id,
      moduleId: { $in: moduleIds },
      status: 'ACTIVE'
    })
      .sort({ order: 1 })
      .lean();

    const lessonsByModule = new Map<string, PublicCurriculumLessonDTO[]>();
    for (const lesson of lessons) {
      const mId = lesson.moduleId.toString();
      if (!lessonsByModule.has(mId)) {
        lessonsByModule.set(mId, []);
      }
      lessonsByModule.get(mId)!.push({
        id: lesson._id.toString(),
        title: lesson.title,
        description: lesson.description || '',
        type: lesson.type,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes || 0,
        isPreview: lesson.isPreview || false,
        order: lesson.order
      });
    }

    const curriculumModules: PublicCurriculumModuleDTO[] = modules.map((m) => ({
      id: m._id.toString(),
      title: m.title,
      description: m.description || '',
      order: m.order,
      lessons: lessonsByModule.get(m._id.toString()) || []
    }));

    return {
      course: {
        id: course._id.toString(),
        slug: course.slug,
        title: course.title
      },
      modules: curriculumModules
    };
  }

  /**
   * Fetches preview content for a single preview lesson in a public course.
   * Strict validation: course is published/public, module is active, lesson is active and isPreview === true.
   * Returns 404 if lesson is not preview or invalid.
   */
  public static async getPublicLessonPreview(
    context: PublicTenantContext,
    slug: string,
    lessonId: string
  ): Promise<PublicLessonPreviewDTO> {
    const tenantIdStr = context.tenantId.toString();

    // Verify course
    const course = await CourseModel.findOne({
      tenantId: tenantIdStr,
      slug: slug.toLowerCase().trim(),
      status: 'PUBLISHED',
      visibility: { $in: ['PUBLIC', 'UNLISTED'] }
    }).lean();

    if (!course) {
      throw new NotFoundError('Lesson not found');
    }

    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NotFoundError('Lesson not found');
    }

    // Verify lesson
    const lesson = await LessonModel.findOne({
      _id: lessonId,
      tenantId: tenantIdStr,
      courseId: course._id,
      status: 'ACTIVE'
    }).lean();

    if (!lesson || !lesson.isPreview) {
      throw new NotFoundError('Lesson not found');
    }

    // Verify parent module is active
    const parentModule = await CourseModuleModel.findOne({
      _id: lesson.moduleId,
      tenantId: tenantIdStr,
      courseId: course._id,
      status: 'ACTIVE'
    }).lean();

    if (!parentModule) {
      throw new NotFoundError('Lesson not found');
    }

    // Build sanitized preview content based on lesson type
    let processedContent: any = {};
    const rawContent = lesson.content || {};

    switch (lesson.type) {
      case 'TEXT': {
        processedContent = {
          bodyHtml: rawContent.bodyHtml ? sanitizeHtml(rawContent.bodyHtml) : ''
        };
        break;
      }
      case 'VIDEO': {
        processedContent = {
          videoUrl: rawContent.videoUrl || rawContent.publicUrl || rawContent.url || null
        };
        break;
      }
      case 'PDF': {
        processedContent = {
          pdfUrl: rawContent.pdfUrl || rawContent.publicUrl || rawContent.url || null
        };
        break;
      }
      case 'AUDIO': {
        processedContent = {
          audioUrl: rawContent.audioUrl || rawContent.publicUrl || rawContent.url || null
        };
        break;
      }
      case 'EXTERNAL_RESOURCE': {
        const rawUrl = (rawContent.url || '').trim();
        let validUrl: string | null = null;
        if (/^https?:\/\//i.test(rawUrl)) {
          validUrl = rawUrl;
        }

        const parsed = validUrl ? parseExternalResource(validUrl) : parseExternalResource('');


        processedContent = {
          url: validUrl,
          provider: rawContent.provider || parsed.provider || 'WEBSITE',
          title: rawContent.title || parsed.title || null,
          description: rawContent.description || parsed.description || null,
          thumbnailUrl: rawContent.thumbnailUrl || parsed.thumbnailUrl || null,
          embedUrl: parsed.embedUrl || rawContent.embedUrl || null,
          videoId: parsed.videoId || rawContent.videoId || null,
          openInNewTab: Boolean(rawContent.openInNewTab ?? true)
        };
        break;
      }

      case 'LIVE': {
        processedContent = {
          provider: rawContent.provider || 'Live Session',
          startAt: rawContent.startAt || null,
          endAt: rawContent.endAt || null
        };
        break;
      }
      default: {
        processedContent = {};
        break;
      }
    }

    return {
      lesson: {
        id: lesson._id.toString(),
        title: lesson.title,
        description: lesson.description || '',
        type: lesson.type,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes || 0,
        isPreview: true,
        content: processedContent
      }
    };
  }
}

