import { Types } from 'mongoose';
import {
  BatchModel,
  IBatchDocument,
  CourseModel,
  UserModel
} from '@edtech/database';
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  BatchQuerySchema
} from '@edtech/validation';
import {
  IBatch,
  BatchMode,
  BatchStatus
} from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError, ConflictError } from '../errors/appError';
import { BranchAccessService, BranchActor } from './branchAccess.service';

export class BatchService {
  /**
   * Safe tenant context resolver.
   */
  private static getTenantId(): string {
    const { currentTenantId } = getWorkspaceContext();
    if (!currentTenantId || !Types.ObjectId.isValid(currentTenantId)) {
      throw new Error('Valid tenant context required');
    }
    return currentTenantId;
  }

  /**
   * Helper to format Mongoose document to clean IBatch DTO.
   */
  public static formatBatch(doc: any): IBatch {
    const courseDoc = doc.courseId && typeof doc.courseId === 'object' ? doc.courseId : null;
    const instructorDoc = doc.instructorId && typeof doc.instructorId === 'object' ? doc.instructorId : null;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId ? doc.branchId.toString() : undefined,
      name: doc.name,
      batchCode: doc.batchCode,
      courseId: courseDoc ? courseDoc._id.toString() : doc.courseId ? doc.courseId.toString() : undefined,
      course: courseDoc
        ? {
            id: courseDoc._id.toString(),
            title: courseDoc.title || 'Course',
            slug: courseDoc.slug,
            thumbnailUrl: courseDoc.thumbnailUrl
          }
        : undefined,
      instructorId: instructorDoc ? instructorDoc._id.toString() : doc.instructorId ? doc.instructorId.toString() : undefined,
      instructor: instructorDoc
        ? {
            id: instructorDoc._id.toString(),
            name: instructorDoc.name || 'Trainer',
            email: instructorDoc.email || '',
            avatarUrl: instructorDoc.avatarUrl
          }
        : undefined,
      mode: doc.mode as BatchMode,
      status: doc.status as BatchStatus,
      startDate: doc.startDate,
      endDate: doc.endDate,
      timing: {
        startTime: doc.timing?.startTime || '10:00 AM',
        endTime: doc.timing?.endTime || '01:00 PM',
        timezone: doc.timing?.timezone || 'Asia/Kolkata'
      },
      daysOfWeek: doc.daysOfWeek || [],
      maxSeats: doc.maxSeats || 30,
      enrolledCount: doc.enrolledCount || 0,
      showOnWebsite: doc.showOnWebsite ?? true,
      classroomDetails: doc.classroomDetails || undefined,
      zoomDetails: doc.zoomDetails || undefined,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * List batches with filters, search, pagination, and summary statistics.
   */
  public static async listBatches(queryPayload: unknown) {
    const tenantId = this.getTenantId();
    const query = BatchQuerySchema.parse(queryPayload);

    const filter: any = { tenantId };

    if (query.mode && query.mode !== 'ALL') {
      filter.mode = query.mode;
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    if (query.courseId && Types.ObjectId.isValid(query.courseId)) {
      filter.courseId = new Types.ObjectId(query.courseId);
    }

    if (typeof query.showOnWebsite === 'boolean') {
      filter.showOnWebsite = query.showOnWebsite;
    }

    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { batchCode: searchRegex },
        { 'classroomDetails.branch': searchRegex },
        { 'classroomDetails.venueAddress': searchRegex }
      ];
    }

    const total = await BatchModel.countDocuments(filter);
    const totalPages = Math.ceil(total / query.limit) || 1;
    const skip = (query.page - 1) * query.limit;

    const sortOptions: any = {};
    sortOptions[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;

    const docs = await BatchModel.find(filter)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('instructorId', 'name email avatarUrl')
      .sort(sortOptions)
      .skip(skip)
      .limit(query.limit)
      .lean();

    const [onlineCount, offlineCount, upcomingCount, ongoingCount] = await Promise.all([
      BatchModel.countDocuments({ tenantId, mode: { $in: ['ONLINE', 'HYBRID'] } }),
      BatchModel.countDocuments({ tenantId, mode: { $in: ['OFFLINE', 'HYBRID'] } }),
      BatchModel.countDocuments({ tenantId, status: 'UPCOMING' }),
      BatchModel.countDocuments({ tenantId, status: 'ONGOING' })
    ]);

    return {
      data: docs.map((doc) => this.formatBatch(doc)),
      stats: {
        totalBatches: total,
        onlineCount,
        offlineCount,
        upcomingCount,
        ongoingCount
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get single batch by ID.
   */
  public static async getBatchById(batchId: string): Promise<IBatch> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(batchId)) {
      throw new NotFoundError('Batch not found');
    }

    const doc = await BatchModel.findOne({ _id: batchId, tenantId })
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('instructorId', 'name email avatarUrl');

    if (!doc) {
      throw new NotFoundError('Batch not found');
    }

    return this.formatBatch(doc);
  }

  /**
   * Create a new class batch.
   */
  public static async createBatch(actorId: string, payload: unknown, actor: BranchActor = { userId: actorId }): Promise<IBatch> {
    const tenantId = this.getTenantId();
    const validated = CreateBatchSchema.parse(payload);
    const branch = await BranchAccessService.assertBranchAccess(tenantId, actor, validated.branchId, { requireActive: true });
    if (validated.instructorId) await BranchAccessService.assertBranchAccess(tenantId, { userId: validated.instructorId }, branch._id.toString(), { requireActive: true });

    // Auto-generate batch code if empty
    let batchCode = validated.batchCode?.trim().toUpperCase();
    if (!batchCode) {
      const count = await BatchModel.countDocuments({ tenantId });
      const prefix = validated.mode === 'ONLINE' ? 'ONL' : 'CLS';
      batchCode = `DIDM-${prefix}-${(count + 1).toString().padStart(3, '0')}`;
    }

    // Uniqueness check
    const existing = await BatchModel.findOne({ tenantId, batchCode });
    if (existing) {
      throw new ConflictError(`Batch with code ${batchCode} already exists in this organization`);
    }

    // Verify course if provided
    if (validated.courseId && Types.ObjectId.isValid(validated.courseId)) {
      const course = await CourseModel.findOne({ _id: validated.courseId, tenantId });
      if (!course) {
        throw new NotFoundError('Associated course not found in this organization');
      }
    }

    const doc = await BatchModel.create({
      tenantId: new Types.ObjectId(tenantId),
      name: validated.name,
      batchCode,
      courseId: validated.courseId ? new Types.ObjectId(validated.courseId) : undefined,
      instructorId: validated.instructorId ? new Types.ObjectId(validated.instructorId) : undefined,
      branchId: branch._id,
      mode: validated.mode,
      status: validated.status || 'UPCOMING',
      startDate: validated.startDate,
      endDate: validated.endDate,
      timing: validated.timing,
      daysOfWeek: validated.daysOfWeek,
      maxSeats: validated.maxSeats || 30,
      enrolledCount: 0,
      showOnWebsite: validated.showOnWebsite ?? true,
      classroomDetails: validated.classroomDetails,
      zoomDetails: validated.zoomDetails,
      notes: validated.notes
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'batch.created',
      resource: 'Batch',
      resourceId: doc._id.toString(),
      metadata: {
        batchId: doc._id.toString(),
        name: doc.name,
        batchCode: doc.batchCode,
        mode: doc.mode
      }
    });

    const populated = await BatchModel.findById(doc._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('instructorId', 'name email avatarUrl');

    return this.formatBatch(populated);
  }

  /**
   * Update existing batch.
   */
  public static async updateBatch(actorId: string, batchId: string, payload: unknown, actor: BranchActor = { userId: actorId }): Promise<IBatch> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(batchId)) {
      throw new NotFoundError('Batch not found');
    }

    const validated = UpdateBatchSchema.parse(payload);

    const batch = await BatchModel.findOne({ _id: batchId, tenantId });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }
    const targetBranchId = validated.branchId || batch.branchId?.toString();
    if (targetBranchId) {
      const branch = await BranchAccessService.assertBranchAccess(tenantId, actor, targetBranchId, { requireActive: true });
      batch.branchId = branch._id;
      const instructorId = validated.instructorId || batch.instructorId?.toString();
      if (instructorId) await BranchAccessService.assertBranchAccess(tenantId, { userId: instructorId }, targetBranchId, { requireActive: true });
    }

    if (validated.batchCode && validated.batchCode.toUpperCase() !== batch.batchCode) {
      const existing = await BatchModel.findOne({
        tenantId,
        batchCode: validated.batchCode.toUpperCase(),
        _id: { $ne: batch._id }
      });
      if (existing) {
        throw new ConflictError(`Batch with code ${validated.batchCode} already exists`);
      }
      batch.batchCode = validated.batchCode.toUpperCase();
    }

    if (validated.name) batch.name = validated.name;
    if (validated.courseId !== undefined) {
      batch.courseId = validated.courseId ? new Types.ObjectId(validated.courseId) : undefined;
    }
    if (validated.instructorId !== undefined) {
      batch.instructorId = validated.instructorId ? new Types.ObjectId(validated.instructorId) : undefined;
    }
    if (validated.mode) batch.mode = validated.mode;
    if (validated.status) batch.status = validated.status;
    if (validated.startDate) batch.startDate = validated.startDate;
    if (validated.endDate !== undefined) batch.endDate = validated.endDate;
    if (validated.timing) batch.timing = validated.timing;
    if (validated.daysOfWeek) batch.daysOfWeek = validated.daysOfWeek;
    if (validated.maxSeats !== undefined) batch.maxSeats = validated.maxSeats;
    if (validated.showOnWebsite !== undefined) batch.showOnWebsite = validated.showOnWebsite;
    if (validated.classroomDetails) batch.classroomDetails = validated.classroomDetails;
    if (validated.zoomDetails) batch.zoomDetails = validated.zoomDetails;
    if (validated.notes !== undefined) batch.notes = validated.notes;

    await batch.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'batch.updated',
      resource: 'Batch',
      resourceId: batch._id.toString(),
      metadata: {
        batchId: batch._id.toString(),
        name: batch.name,
        status: batch.status
      }
    });

    const populated = await BatchModel.findById(batch._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('instructorId', 'name email avatarUrl');

    return this.formatBatch(populated);
  }

  /**
   * Delete or remove a batch.
   */
  public static async deleteBatch(actorId: string, batchId: string): Promise<{ success: boolean; message: string }> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(batchId)) {
      throw new NotFoundError('Batch not found');
    }

    const batch = await BatchModel.findOneAndDelete({ _id: batchId, tenantId });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'batch.deleted',
      resource: 'Batch',
      resourceId: batch._id.toString(),
      metadata: {
        batchId: batch._id.toString(),
        name: batch.name
      }
    });

    return {
      success: true,
      message: 'Batch removed successfully'
    };
  }

  /**
   * Public Batches API for public visitors and landing/course pages.
   */
  public static async listPublicBatches(
    tenantId: string,
    options: { courseSlug?: string; courseId?: string; mode?: string } = {}
  ): Promise<IBatch[]> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      showOnWebsite: true,
      status: { $in: ['UPCOMING', 'ONGOING'] }
    };

    if (options.mode && options.mode !== 'ALL') {
      filter.mode = options.mode;
    }

    if (options.courseId && Types.ObjectId.isValid(options.courseId)) {
      filter.courseId = new Types.ObjectId(options.courseId);
    } else if (options.courseSlug) {
      const course = await CourseModel.findOne({ tenantId, slug: options.courseSlug }).select('_id');
      if (course) {
        filter.courseId = course._id;
      }
    }

    const docs = await BatchModel.find(filter)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .sort({ startDate: 1 })
      .limit(50)
      .lean();

    return docs.map((doc) => {
      const formatted = this.formatBatch(doc);
      // For public unauthenticated visitors, do not expose internal host URLs or passcodes
      if (formatted.zoomDetails) {
        formatted.zoomDetails = {
          meetingUrl: formatted.zoomDetails.meetingUrl ? 'Available upon registration' : undefined,
          meetingId: formatted.zoomDetails.meetingId,
          instructions: formatted.zoomDetails.instructions
        };
      }
      return formatted;
    });
  }
}
