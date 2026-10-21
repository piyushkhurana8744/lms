import { Types } from 'mongoose';
import {
  ClassModel,
  IClassDocument,
  UserModel,
  CourseModel,
  AuditLogModel,
  IntegrationConnectionModel
} from '@edtech/database';
import { LiveClassOrchestratorService } from './integrations/orchestration/liveClassOrchestrator.service';
import {
  CreateClassSchema,
  UpdateClassSchema,
  EnrollStudentInClassSchema,
  ClassQuerySchema
} from '@edtech/validation';
import {
  IClass,
  CreateClassPayload,
  UpdateClassPayload,
  ClassQueryFilter
} from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, NotFoundError, ConflictError } from '../errors/appError';

export class ClassService {
  /**
   * Helper to resolve current tenantId
   */
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) {
      throw new BadRequestError('Tenant workspace context missing');
    }
    return ctx.currentTenantId;
  }

  /**
   * Generate next sequential class code for tenant (e.g. CLS-ONL-001 or CLS-OFF-001)
   */
  public static async generateClassCode(tenantId: string, mode: string): Promise<string> {
    const prefix = mode === 'ONLINE' ? 'CLS-ONL' : mode === 'OFFLINE' ? 'CLS-OFF' : 'CLS-HYB';
    const count = await ClassModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      mode
    });
    const seq = String(count + 1).padStart(3, '0');
    let code = `${prefix}-${seq}`;
    let exists = await ClassModel.exists({ tenantId: new Types.ObjectId(tenantId), classCode: code });
    let counter = count + 1;
    while (exists) {
      counter++;
      code = `${prefix}-${String(counter).padStart(3, '0')}`;
      exists = await ClassModel.exists({ tenantId: new Types.ObjectId(tenantId), classCode: code });
    }
    return code;
  }

  /**
   * Format Mongo Document to shared IClass contract
   */
  private static formatClass(doc: any): IClass {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      classCode: doc.classCode,
      courseId: doc.courseId?._id ? doc.courseId._id.toString() : doc.courseId?.toString(),
      course: doc.courseId?._id
        ? {
            id: doc.courseId._id.toString(),
            title: doc.courseId.title,
            slug: doc.courseId.slug,
            thumbnailUrl: doc.courseId.thumbnailUrl
          }
        : undefined,
      batchId: doc.batchId?._id ? doc.batchId._id.toString() : doc.batchId?.toString(),
      batch: doc.batchId?._id
        ? {
            id: doc.batchId._id.toString(),
            name: doc.batchId.name,
            batchCode: doc.batchId.batchCode
          }
        : undefined,
      mode: doc.mode,
      capacity: doc.capacity,
      enrolledCount: doc.enrolledCount || 0,
      enrolledStudents: (doc.enrolledStudents || []).map((s: any) => ({
        studentId: s.studentId?._id ? s.studentId._id.toString() : s.studentId?.toString(),
        studentName: s.studentName || s.studentId?.name,
        studentEmail: s.studentEmail || s.studentId?.email,
        enrolledAt: s.enrolledAt,
        status: s.status
      })),
      status: doc.status,
      startDate: doc.startDate,
      endDate: doc.endDate,
      timing: doc.timing,
      daysOfWeek: doc.daysOfWeek || [],
      showOnWebsite: doc.showOnWebsite ?? true,
      // Host start URLs and raw meeting passcodes are intentionally never part
      // of the generic class DTO. Hosts obtain startUrl through the authorized
      // integration join endpoint; students use the provider join URL.
      zoomDetails: doc.zoomDetails ? {
        meetingUrl: doc.zoomDetails.meetingUrl,
        meetingId: doc.zoomDetails.meetingId,
        instructions: doc.zoomDetails.instructions,
        autoRecord: Boolean(doc.zoomDetails.autoRecord)
      } : undefined,
      classroomDetails: doc.classroomDetails,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Create a new Class with strict capacity & Zoom/Classroom parameters
   */
  public static async createClass(rawPayload: unknown): Promise<IClass> {
    const tenantId = this.getTenantId();
    const payload = CreateClassSchema.parse(rawPayload);
    const shouldProvisionZoom =
      (payload.mode === 'ONLINE' || payload.mode === 'HYBRID') &&
      !payload.zoomDetails?.meetingUrl;

    let provisioningActor: { userId: string; roles: string[]; isSuperAdmin: boolean } | undefined;
    if (shouldProvisionZoom) {
      const ctx = getWorkspaceContext();
      if (!ctx?.currentUserId) {
        throw new BadRequestError('Authenticated user context is required to provision a Zoom meeting');
      }
      provisioningActor = { userId: ctx.currentUserId, roles: ['ADMIN'], isSuperAdmin: true };
      const connectedZoom = await IntegrationConnectionModel.exists({
        tenantId: new Types.ObjectId(tenantId),
        provider: 'ZOOM',
        status: 'CONNECTED',
        $or: [
          { scopeType: 'TENANT' },
          { scopeType: 'USER', userId: new Types.ObjectId(ctx.currentUserId) }
        ]
      });
      if (!connectedZoom) {
        throw new BadRequestError(
          'Zoom is not connected. Connect a Zoom account in Admin Settings → Integrations, then save the class again.'
        );
      }
    }

    // Auto-generate code if absent
    let classCode = payload.classCode?.trim().toUpperCase();
    if (!classCode) {
      classCode = await this.generateClassCode(tenantId, payload.mode);
    } else {
      const codeExists = await ClassModel.exists({
        tenantId: new Types.ObjectId(tenantId),
        classCode
      });
      if (codeExists) {
        throw new ConflictError(`Class code "${classCode}" is already in use`);
      }
    }

    const doc = await ClassModel.create({
      tenantId: new Types.ObjectId(tenantId),
      name: payload.name.trim(),
      classCode,
      courseId: payload.courseId && Types.ObjectId.isValid(payload.courseId) ? new Types.ObjectId(payload.courseId) : undefined,
      batchId: payload.batchId && Types.ObjectId.isValid(payload.batchId) ? new Types.ObjectId(payload.batchId) : undefined,
      mode: payload.mode,
      capacity: payload.capacity,
      enrolledCount: 0,
      enrolledStudents: [],
      status: payload.status || 'SCHEDULED',
      startDate: new Date(payload.startDate),
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      timing: payload.timing,
      daysOfWeek: payload.daysOfWeek,
      showOnWebsite: payload.showOnWebsite ?? true,
      zoomDetails: payload.mode === 'ONLINE' || payload.mode === 'HYBRID' ? payload.zoomDetails : undefined,
      classroomDetails: payload.mode === 'OFFLINE' || payload.mode === 'HYBRID' ? payload.classroomDetails : undefined,
      notes: payload.notes?.trim()
    });

    if (shouldProvisionZoom && provisioningActor) {
      await LiveClassOrchestratorService.createMeetingForClass(
        tenantId,
        doc._id.toString(),
        {
          provider: 'ZOOM',
          topic: doc.name,
          autoRecord: payload.zoomDetails?.autoRecord || false
        },
        provisioningActor
      );
    }

    try {
      await AuditLogModel.create({
        tenantId: new Types.ObjectId(tenantId),
        action: 'class.created',
        targetType: 'Class',
        targetId: doc._id,
        metadata: {
          classCode: doc.classCode,
          mode: doc.mode,
          capacity: doc.capacity
        }
      });
    } catch (e) {}

    const populated = await ClassModel.findById(doc._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .lean();

    return this.formatClass(populated);
  }

  /**
   * List Classes for Admin with filters, pagination, and seat utilization metrics
   */
  public static async listClasses(rawQuery: unknown): Promise<{
    data: IClass[];
    stats: {
      totalClasses: number;
      onlineClasses: number;
      offlineClasses: number;
      totalSeats: number;
      enrolledSeats: number;
      availableSeats: number;
      fullClassesCount: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const tenantId = this.getTenantId();
    const query = ClassQuerySchema.parse(rawQuery || {});
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (query.mode && query.mode !== 'ALL') {
      filter.mode = query.mode;
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    if (query.courseId && Types.ObjectId.isValid(query.courseId)) {
      filter.courseId = new Types.ObjectId(query.courseId);
    }

    if (query.batchId && Types.ObjectId.isValid(query.batchId)) {
      filter.batchId = new Types.ObjectId(query.batchId);
    }

    if (query.isFull === true) {
      filter.$expr = { $gte: ['$enrolledCount', '$capacity'] };
    } else if (query.isFull === false) {
      filter.$expr = { $lt: ['$enrolledCount', '$capacity'] };
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { classCode: { $regex: q, $options: 'i' } },
        { 'classroomDetails.branch': { $regex: q, $options: 'i' } },
        { 'classroomDetails.roomNumber': { $regex: q, $options: 'i' } }
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [docs, total, allTenantClasses] = await Promise.all([
      ClassModel.find(filter)
        .populate('courseId', 'title slug thumbnailUrl')
        .sort({ startDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClassModel.countDocuments(filter),
      ClassModel.find({ tenantId: new Types.ObjectId(tenantId) })
        .select('mode capacity enrolledCount status')
        .lean()
    ]);

    // Calculate aggregated capacity metrics
    let totalSeats = 0;
    let enrolledSeats = 0;
    let onlineClasses = 0;
    let offlineClasses = 0;
    let fullClassesCount = 0;

    for (const c of allTenantClasses) {
      totalSeats += c.capacity || 0;
      enrolledSeats += c.enrolledCount || 0;
      if (c.mode === 'ONLINE') onlineClasses++;
      if (c.mode === 'OFFLINE') offlineClasses++;
      if ((c.enrolledCount || 0) >= (c.capacity || 0) || c.status === 'FULL') {
        fullClassesCount++;
      }
    }

    return {
      data: docs.map((d) => this.formatClass(d)),
      stats: {
        totalClasses: allTenantClasses.length,
        onlineClasses,
        offlineClasses,
        totalSeats,
        enrolledSeats,
        availableSeats: Math.max(0, totalSeats - enrolledSeats),
        fullClassesCount
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Get single Class details by ID
   */
  public static async getClassById(id: string): Promise<IClass> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid class ID format');
    }

    const doc = await ClassModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    })
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('enrolledStudents.studentId', 'name email avatarUrl')
      .lean();

    if (!doc) {
      throw new NotFoundError('Class not found');
    }

    return this.formatClass(doc);
  }

  /**
   * Update Class
   */
  public static async updateClass(id: string, rawPayload: unknown): Promise<IClass> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid class ID format');
    }

    const payload = UpdateClassSchema.parse(rawPayload);

    const existing = await ClassModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!existing) {
      throw new NotFoundError('Class not found');
    }

    // If capacity is reduced, verify it doesn't violate existing enrolled students
    if (payload.capacity !== undefined) {
      if (payload.capacity < existing.enrolledCount) {
        throw new BadRequestError(
          `Cannot reduce capacity to ${payload.capacity}. There are already ${existing.enrolledCount} students enrolled.`
        );
      }
      existing.capacity = payload.capacity;
      if (existing.capacity === existing.enrolledCount) {
        existing.status = 'FULL';
      } else if (existing.status === 'FULL' && existing.capacity > existing.enrolledCount) {
        existing.status = 'ACTIVE';
      }
    }

    if (payload.name) existing.name = payload.name.trim();
    if (payload.mode) existing.mode = payload.mode;
    if (payload.status) existing.status = payload.status;
    if (payload.startDate) existing.startDate = new Date(payload.startDate);
    if (payload.endDate !== undefined) existing.endDate = payload.endDate ? new Date(payload.endDate) : undefined;
    if (payload.timing) existing.timing = payload.timing;
    if (payload.daysOfWeek) existing.daysOfWeek = payload.daysOfWeek;
    if (payload.showOnWebsite !== undefined) existing.showOnWebsite = payload.showOnWebsite;
    if (payload.notes !== undefined) existing.notes = payload.notes?.trim();

    if (payload.courseId !== undefined) {
      existing.courseId = payload.courseId && Types.ObjectId.isValid(payload.courseId)
        ? new Types.ObjectId(payload.courseId)
        : undefined;
    }

    if (payload.batchId !== undefined) {
      existing.batchId = payload.batchId && Types.ObjectId.isValid(payload.batchId)
        ? new Types.ObjectId(payload.batchId)
        : undefined;
    }

    if (payload.zoomDetails !== undefined) {
      existing.zoomDetails = payload.zoomDetails;
    }

    if (payload.classroomDetails !== undefined) {
      existing.classroomDetails = payload.classroomDetails;
    }

    await existing.save();

    const shouldProvisionZoom =
      (existing.mode === 'ONLINE' || existing.mode === 'HYBRID') &&
      payload.zoomDetails !== undefined &&
      !payload.zoomDetails.meetingUrl;

    if (shouldProvisionZoom) {
      const ctx = getWorkspaceContext();
      if (!ctx?.currentUserId) {
        throw new BadRequestError('Authenticated user context is required to provision a Zoom meeting');
      }
      await LiveClassOrchestratorService.createMeetingForClass(
        tenantId,
        existing._id.toString(),
        {
          provider: 'ZOOM',
          topic: existing.name,
          autoRecord: payload.zoomDetails?.autoRecord || false
        },
        { userId: ctx.currentUserId, roles: ['ADMIN'], isSuperAdmin: true }
      );
    }

    const updated = await ClassModel.findById(existing._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .lean();

    return this.formatClass(updated);
  }

  /**
   * Enroll a student into a Class with strict seat capacity enforcement
   * Atomic check: only allows enrollment if enrolledCount < capacity
   */
  public static async enrollStudent(classId: string, rawPayload: unknown): Promise<IClass> {
    const tenantId = this.getTenantId();
    const { studentId } = EnrollStudentInClassSchema.parse(rawPayload);

    if (!Types.ObjectId.isValid(classId) || !Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid class or student ID format');
    }

    // Verify student exists in tenant
    const studentUser = await UserModel.findById(studentId).lean();
    if (!studentUser) {
      throw new NotFoundError('Student user not found');
    }

    // Find class
    const classDoc = await ClassModel.findOne({
      _id: new Types.ObjectId(classId),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!classDoc) {
      throw new NotFoundError('Class not found');
    }

    // Check if student is already enrolled
    const alreadyEnrolled = classDoc.enrolledStudents.some(
      (s) => s.studentId.toString() === studentId && s.status === 'ENROLLED'
    );
    if (alreadyEnrolled) {
      throw new ConflictError('Student is already enrolled in this class');
    }

    // STRICT CAPACITY CHECK
    if (classDoc.enrolledCount >= classDoc.capacity) {
      throw new BadRequestError(
        `CLASS_SEATS_FULL: This class has reached its maximum seat capacity of ${classDoc.capacity} students. No more seats are available.`
      );
    }

    // Atomic update to avoid race conditions
    const updated = await ClassModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(classId),
        tenantId: new Types.ObjectId(tenantId),
        enrolledCount: { $lt: classDoc.capacity },
        'enrolledStudents.studentId': { $ne: new Types.ObjectId(studentId) }
      },
      {
        $inc: { enrolledCount: 1 },
        $push: {
          enrolledStudents: {
            studentId: new Types.ObjectId(studentId),
            studentName: studentUser.name,
            studentEmail: studentUser.email,
            enrolledAt: new Date(),
            status: 'ENROLLED'
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      throw new BadRequestError(
        `CLASS_SEATS_FULL: Enrollment failed. This class has reached its maximum seat capacity of ${classDoc.capacity} students.`
      );
    }

    // If seats filled, update status to FULL
    if (updated.enrolledCount >= updated.capacity && updated.status !== 'FULL') {
      updated.status = 'FULL';
      await updated.save();
    }

    try {
      await AuditLogModel.create({
        tenantId: new Types.ObjectId(tenantId),
        action: 'class.student_enrolled',
        targetType: 'Class',
        targetId: updated._id,
        metadata: {
          studentId,
          enrolledCount: updated.enrolledCount,
          capacity: updated.capacity
        }
      });
    } catch (e) {}

    const populated = await ClassModel.findById(updated._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('enrolledStudents.studentId', 'name email avatarUrl')
      .lean();

    return this.formatClass(populated);
  }

  /**
   * Unenroll / Remove student from class, freeing up a seat
   */
  public static async unenrollStudent(classId: string, studentId: string): Promise<IClass> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(classId) || !Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid class or student ID format');
    }

    const classDoc = await ClassModel.findOne({
      _id: new Types.ObjectId(classId),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!classDoc) {
      throw new NotFoundError('Class not found');
    }

    const studentIdx = classDoc.enrolledStudents.findIndex(
      (s) => s.studentId.toString() === studentId && s.status === 'ENROLLED'
    );

    if (studentIdx === -1) {
      throw new NotFoundError('Student is not actively enrolled in this class');
    }

    // Remove student from roster and decrement count
    classDoc.enrolledStudents.splice(studentIdx, 1);
    classDoc.enrolledCount = Math.max(0, classDoc.enrolledCount - 1);

    // If status was FULL, revert to ACTIVE
    if (classDoc.status === 'FULL' && classDoc.enrolledCount < classDoc.capacity) {
      classDoc.status = 'ACTIVE';
    }

    await classDoc.save();

    const populated = await ClassModel.findById(classDoc._id)
      .populate('courseId', 'title slug thumbnailUrl')
      .populate('enrolledStudents.studentId', 'name email avatarUrl')
      .lean();

    return this.formatClass(populated);
  }

  /**
   * Delete Class
   */
  public static async deleteClass(id: string): Promise<void> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid class ID format');
    }

    const doc = await ClassModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!doc) {
      throw new NotFoundError('Class not found');
    }

    if (doc.enrolledCount > 0) {
      throw new BadRequestError(
        `Cannot delete class with ${doc.enrolledCount} active students. Please unenroll students first.`
      );
    }

    await ClassModel.deleteOne({ _id: doc._id });
  }

  /**
   * Public Classes listing for website & course pages
   */
  public static async listPublicClasses(
    tenantId: string,
    options: { courseSlug?: string; courseId?: string; mode?: string } = {}
  ): Promise<IClass[]> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      showOnWebsite: true,
      status: { $in: ['SCHEDULED', 'ACTIVE', 'FULL'] }
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

    const docs = await ClassModel.find(filter)
      .populate('courseId', 'title slug thumbnailUrl')
      .sort({ startDate: 1 })
      .limit(50)
      .lean();

    return docs.map((doc) => {
      const formatted = this.formatClass(doc);
      // Strip passcodes and host URLs for unauthenticated visitors
      if (formatted.zoomDetails) {
        formatted.zoomDetails = {
          meetingUrl: formatted.zoomDetails.meetingUrl ? 'Available upon student enrollment' : '',
          meetingId: formatted.zoomDetails.meetingId,
          instructions: formatted.zoomDetails.instructions
        };
      }
      // Do not leak student names/emails publicly
      delete (formatted as any).enrolledStudents;
      return formatted;
    });
  }
}
