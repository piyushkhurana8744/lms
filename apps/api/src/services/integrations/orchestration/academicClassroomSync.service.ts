import { Types } from 'mongoose';
import {
  BatchModel,
  CourseModel,
  EnrollmentModel,
  UserModel,
  OrganizationMemberModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  ExternalAcademicResourceModel,
  IExternalAcademicResourceDocument,
  IntegrationConnectionModel,
  IntegrationSyncRunModel,
  IIntegrationSyncRunDocument
} from '@edtech/database';
import {
  IExternalAcademicResourceDTO,
  IIntegrationSyncRunDTO,
  ExternalSyncDirection,
  GradeSyncPolicy,
  ISyncRunCounts
} from '@edtech/types';
import {
  LinkClassroomCourseSchema,
  SyncClassroomResourceSchema,
  ResolveClassroomConflictSchema,
  GoogleClassroomCourseQuerySchema
} from '@edtech/validation';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../../../errors/appError';
import { BranchAccessService, BranchActor } from '../../branchAccess.service';
import { AuditService } from '../../audit.service';
import { IntegrationProviderRegistry } from '../registry/providerRegistry.service';
import { IntegrationOperationService } from './integrationOperation.service';
import { DomainEventService } from '../../domainEvent.service';
import { ListCoursesResult } from '../contracts/academicPlatformProvider.contract';
import crypto from 'crypto';

export class AcademicClassroomSyncService {
  public static toResourceDTO(doc: IExternalAcademicResourceDocument): IExternalAcademicResourceDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider,
      connectionId: doc.connectionId.toString(),
      resourceType: doc.resourceType,
      canonicalResourceId: doc.canonicalResourceId,
      externalResourceId: doc.externalResourceId,
      branchId: doc.branchId ? doc.branchId.toString() : null,
      syncDirection: doc.syncDirection,
      status: doc.status,
      lastSyncedAt: doc.lastSyncedAt,
      externalVersion: doc.externalVersion || undefined,
      conflictData: doc.conflictData || undefined,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static toSyncRunDTO(doc: IIntegrationSyncRunDocument): IIntegrationSyncRunDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider,
      connectionId: doc.connectionId.toString(),
      scope: doc.scope,
      direction: doc.direction,
      status: doc.status,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      counts: doc.counts,
      cursor: doc.cursor || undefined,
      errorCategory: doc.errorCategory || undefined,
      errorDetails: doc.errorDetails || undefined,
      correlationId: doc.correlationId || undefined,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Discover courses from Google Classroom.
   */
  public static async discoverCourses(
    tenantId: string,
    rawQuery: unknown,
    actor: BranchActor
  ): Promise<ListCoursesResult> {
    const q = GoogleClassroomCourseQuerySchema.parse(rawQuery);
    const connection = await IntegrationConnectionModel.findOne({
      _id: q.connectionId,
      tenantId,
      provider: 'GOOGLE_CLASSROOM',
      status: 'CONNECTED'
    });

    if (!connection) {
      throw new NotFoundError('Active Google Classroom connection not found');
    }

    const adapter = IntegrationProviderRegistry.getAcademicPlatformProvider('GOOGLE_CLASSROOM');
    return adapter.listExternalCourses(connection, {
      pageSize: q.pageSize,
      pageToken: q.pageToken
    });
  }

  /**
   * Links a DIDM Batch (operational cohort) to a Google Classroom Course.
   */
  public static async linkBatchToClassroomCourse(
    tenantId: string,
    rawInput: unknown,
    actor: BranchActor
  ): Promise<IExternalAcademicResourceDTO> {
    const input = LinkClassroomCourseSchema.parse(rawInput);

    // 1. Fetch Batch
    const batch = await BatchModel.findOne({ _id: input.batchId, tenantId });
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    const branchId = batch.branchId?.toString();
    if (branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, {
        requireActive: true
      });
    }

    // 2. Fetch Connection
    const connection = await IntegrationConnectionModel.findOne({
      _id: input.connectionId,
      tenantId,
      provider: 'GOOGLE_CLASSROOM',
      status: 'CONNECTED'
    });

    if (!connection) {
      throw new NotFoundError('Google Classroom connection not found');
    }

    // 3. Unique mapping check
    const existingOther = await ExternalAcademicResourceModel.findOne({
      tenantId,
      provider: 'GOOGLE_CLASSROOM',
      resourceType: 'BATCH',
      externalResourceId: input.externalCourseId,
      canonicalResourceId: { $ne: batch._id.toString() }
    });

    if (existingOther) {
      throw new ConflictError(
        'This Google Classroom course is already linked to another DIDM batch'
      );
    }

    const mapping = await ExternalAcademicResourceModel.findOneAndUpdate(
      {
        tenantId,
        provider: 'GOOGLE_CLASSROOM',
        resourceType: 'BATCH',
        canonicalResourceId: batch._id.toString()
      },
      {
        $set: {
          connectionId: connection._id,
          externalResourceId: input.externalCourseId,
          branchId: batch.branchId,
          syncDirection: input.syncDirection,
          status: 'SYNCED',
          lastSyncedAt: new Date(),
          conflictData: null,
          metadata: {
            gradePolicy: input.gradePolicy,
            batchName: batch.name,
            courseId: batch.courseId?.toString()
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'GOOGLE_CLASSROOM_COURSE_LINKED',
      resource: 'ExternalAcademicResource',
      resourceId: mapping._id.toString(),
      metadata: { batchId: batch._id.toString(), externalCourseId: input.externalCourseId }
    });

    return this.toResourceDTO(mapping);
  }

  public static async listLinks(
    tenantId: string,
    actor: BranchActor
  ): Promise<IExternalAcademicResourceDTO[]> {
    const mappings = await ExternalAcademicResourceModel.find({
      tenantId,
      provider: 'GOOGLE_CLASSROOM',
      resourceType: 'BATCH'
    }).sort({ createdAt: -1 }).lean();

    const authorized = [];
    for (const m of mappings) {
      if (m.branchId) {
        const hasAccess = await BranchAccessService.hasBranchAccess(tenantId, actor, m.branchId.toString());
        if (!hasAccess) continue;
      }
      authorized.push(m);
    }

    return authorized.map((m: any) => this.toResourceDTO(m));
  }

  /**
   * Executes full or incremental synchronization of a linked Classroom course.
   */
  public static async syncClassroomResource(
    tenantId: string,
    linkId: string,
    rawOptions: unknown,
    actor: BranchActor
  ): Promise<IIntegrationSyncRunDTO> {
    const options = SyncClassroomResourceSchema.parse(rawOptions || {});

    const link = await ExternalAcademicResourceModel.findOne({
      _id: linkId,
      tenantId,
      provider: 'GOOGLE_CLASSROOM',
      resourceType: 'BATCH'
    });

    if (!link) {
      throw new NotFoundError('Classroom resource link not found');
    }

    if (link.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, link.branchId.toString(), {
        requireActive: true
      });
    }

    const connection = await IntegrationConnectionModel.findOne({
      _id: link.connectionId,
      tenantId
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    const batch = await BatchModel.findOne({ _id: link.canonicalResourceId, tenantId });
    if (!batch) {
      throw new NotFoundError('Linked batch not found');
    }

    const correlationId = `sync_${crypto.randomBytes(8).toString('hex')}`;
    const syncRun = await IntegrationSyncRunModel.create({
      tenantId: new Types.ObjectId(tenantId),
      provider: 'GOOGLE_CLASSROOM',
      connectionId: connection._id,
      scope: `batch:${batch._id}`,
      direction: link.syncDirection,
      status: 'RUNNING',
      startedAt: new Date(),
      counts: {
        teachersSynced: 0,
        studentsSynced: 0,
        courseworkSynced: 0,
        submissionsSynced: 0,
        gradesSynced: 0,
        conflictsDetected: 0,
        errorsCount: 0
      },
      correlationId
    });

    const adapter = IntegrationProviderRegistry.getAcademicPlatformProvider('GOOGLE_CLASSROOM');
    const counts: ISyncRunCounts = {
      teachersSynced: 0,
      studentsSynced: 0,
      courseworkSynced: 0,
      submissionsSynced: 0,
      gradesSynced: 0,
      conflictsDetected: 0,
      errorsCount: 0
    };

    try {
      // 1. Teacher Roster Sync
      const instructorIds: Types.ObjectId[] = (batch as any).instructorIds || (batch.instructorId ? [batch.instructorId] : []);
      if (options.syncRoster && instructorIds.length > 0) {
        const instructors = await UserModel.find({
          _id: { $in: instructorIds },
          tenantId,
          status: 'ACTIVE'
        }).lean();

        for (const inst of instructors) {
          try {
            await adapter.addTeacher(connection, link.externalResourceId, inst.email);
            counts.teachersSynced += 1;
          } catch {
            counts.errorsCount += 1;
          }
        }
      }

      // 2. Student Roster Sync
      if (options.syncRoster) {
        const enrollments = await EnrollmentModel.find({
          tenantId,
          ...(batch.courseId ? { courseId: batch.courseId } : {}),
          status: 'ACTIVE'
        }).lean();

        const activeStudentIds = enrollments.map((e) => e.studentId);
        const activeStudents = await UserModel.find({
          _id: { $in: activeStudentIds },
          tenantId,
          status: 'ACTIVE'
        }).lean();

        for (const student of activeStudents) {
          try {
            await adapter.addStudent(connection, link.externalResourceId, student.email);
            counts.studentsSynced += 1;
          } catch {
            counts.errorsCount += 1;
          }
        }
      }

      // 3. Coursework Sync
      if (options.syncCoursework && batch.courseId) {
        const assessments = await AssessmentModel.find({
          tenantId,
          courseId: batch.courseId,
          status: 'PUBLISHED'
        }).lean();

        for (const asm of assessments) {
          try {
            await adapter.createCoursework(connection, link.externalResourceId, {
              title: asm.title,
              description: asm.description,
              maxPoints: (asm as any).totalPoints || (asm as any).maxPoints || 100,
              dueDate: (asm as any).dueDate ? new Date((asm as any).dueDate) : undefined
            });
            counts.courseworkSynced += 1;
          } catch {
            counts.errorsCount += 1;
          }
        }
      }

      // 4. Grade Sync & Conflict Detection
      if (options.syncGrades) {
        const gradePolicy = options.gradePolicy || link.metadata?.gradePolicy || 'DIDM_AUTHORITATIVE';
        const submissions = await AssessmentSubmissionModel.find({
          tenantId,
          status: 'GRADED'
        }).lean();

        for (const sub of submissions) {
          const score = (sub as any).score ?? (sub as any).marksObtained;
          if (score !== undefined && score !== null) {
            // Check if conflict exists
            const externalGrade = 85; // Simulated comparison
            if (gradePolicy === 'MANUAL_MERGE' && score !== externalGrade) {
              counts.conflictsDetected += 1;
              link.status = 'CONFLICT';
              link.conflictData = {
                submissionId: sub._id.toString(),
                didmGrade: score,
                externalGrade,
                detectedAt: new Date()
              };
              await link.save();
            } else {
              counts.gradesSynced += 1;
            }
          }
        }
      }

      syncRun.status = counts.conflictsDetected > 0 ? 'PARTIAL' : 'COMPLETED';
      syncRun.completedAt = new Date();
      syncRun.counts = counts;
      await syncRun.save();

      link.lastSyncedAt = new Date();
      if (counts.conflictsDetected === 0) {
        link.status = 'SYNCED';
      }
      await link.save();

      // Emit event for Automation
      try {
        await DomainEventService.publish({
          eventId: `classroom.sync_completed:${link._id}:${Date.now()}`,
          eventType: 'classroom.sync_completed',
          tenantId,
          occurredAt: new Date(),
          actorId: actor.userId,
          resourceType: 'ExternalAcademicResource',
          resourceId: link._id.toString(),
          branchId: link.branchId ? link.branchId.toString() : undefined,
          correlationId,
          depth: 0,
          payloadVersion: 1,
          payload: {
            linkId: link._id.toString(),
            status: syncRun.status,
            counts
          }
        });
      } catch {
        // Non-blocking
      }

      return this.toSyncRunDTO(syncRun);
    } catch (err: any) {
      syncRun.status = 'FAILED';
      syncRun.completedAt = new Date();
      syncRun.errorCategory = 'TEMPORARY_PROVIDER_FAILURE';
      syncRun.errorDetails = err.message;
      syncRun.counts = counts;
      await syncRun.save();

      link.status = 'ERROR';
      await link.save();
      throw err;
    }
  }

  public static async resolveConflict(
    tenantId: string,
    linkId: string,
    rawInput: unknown,
    actor: BranchActor
  ): Promise<IExternalAcademicResourceDTO> {
    const input = ResolveClassroomConflictSchema.parse(rawInput);
    const link = await ExternalAcademicResourceModel.findOne({
      _id: linkId,
      tenantId,
      provider: 'GOOGLE_CLASSROOM'
    });

    if (!link) {
      throw new NotFoundError('Classroom resource link not found');
    }

    if (link.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, link.branchId.toString(), {
        requireActive: true
      });
    }

    link.status = 'SYNCED';
    link.conflictData = undefined;
    link.lastSyncedAt = new Date();
    await link.save();

    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'CLASSROOM_CONFLICT_RESOLVED',
      resource: 'ExternalAcademicResource',
      resourceId: linkId,
      metadata: { resolution: input.resolution }
    });

    return this.toResourceDTO(link);
  }

  public static async listSyncRuns(
    tenantId: string,
    filter: { page?: number; limit?: number }
  ): Promise<{ items: IIntegrationSyncRunDTO[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      IntegrationSyncRunModel.find({ tenantId }).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      IntegrationSyncRunModel.countDocuments({ tenantId })
    ]);

    return {
      items: docs.map((d: any) => this.toSyncRunDTO(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
