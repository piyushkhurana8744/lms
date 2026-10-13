import { Types } from 'mongoose';
import crypto from 'node:crypto';
import {
  CommunicationAnnouncementModel,
  ICommunicationAnnouncementDocument,
  NotificationIntentModel,
  NotificationModel,
  NotificationDeliveryModel,
  UserModel,
  OrganizationMemberModel,
  AuditLogModel
} from '@edtech/database';
import {
  ICommunicationAnnouncement,
  ICommunicationAudiencePreview,
  ICommunicationDeliverySummary,
  CreateAnnouncementInput,
  UpdateAnnouncementInput
} from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/appError';
import { CommunicationAudienceService, AudienceActor } from './communicationAudience.service';
import { BranchAccessService } from '../branchAccess.service';

export class CommunicationAnnouncementService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  private static toDTO(doc: ICommunicationAnnouncementDocument, deliverySummary?: ICommunicationDeliverySummary): ICommunicationAnnouncement {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId ? doc.branchId.toString() : undefined,
      senderUserId: doc.senderUserId.toString(),
      senderName: doc.senderName,
      senderMemberId: doc.senderMemberId ? doc.senderMemberId.toString() : undefined,
      senderRole: doc.senderRole,
      title: doc.title,
      body: doc.body,
      priority: doc.priority,
      status: doc.status,
      audienceType: doc.audienceType,
      audienceCriteria: doc.audienceCriteria ? {
        branchIds: doc.audienceCriteria.branchIds?.map((id: any) => id.toString()),
        batchIds: doc.audienceCriteria.batchIds?.map((id: any) => id.toString()),
        courseIds: doc.audienceCriteria.courseIds?.map((id: any) => id.toString()),
        userIds: doc.audienceCriteria.userIds?.map((id: any) => id.toString()),
        roles: doc.audienceCriteria.roles
      } : undefined,
      audienceSnapshot: doc.audienceSnapshot ? {
        recipientUserIds: doc.audienceSnapshot.recipientUserIds.map((id: any) => id.toString()),
        recipientCount: doc.audienceSnapshot.recipientCount,
        resolvedAt: doc.audienceSnapshot.resolvedAt
      } : undefined,
      channels: doc.channels || ['IN_APP'],
      attachments: doc.attachments || [],
      scheduledAt: doc.scheduledAt || undefined,
      publishedAt: doc.publishedAt || undefined,
      cancelledAt: doc.cancelledAt || undefined,
      archivedAt: doc.archivedAt || undefined,
      deliverySummary: deliverySummary || doc.deliverySummary,
      revision: doc.revision || 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static async createAnnouncement(
    input: any,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);
    if (input.idempotencyKey) {
      const existing = await CommunicationAnnouncementModel.findOne({ tenantId: tId, idempotencyKey: input.idempotencyKey });
      if (existing) return this.toDTO(existing);
    }

    // Verify actor member info
    const [user, member] = await Promise.all([
      UserModel.findOne({ _id: uId, tenantId: tId }).lean(),
      OrganizationMemberModel.findOne({ userId: uId, tenantId: tId, status: 'ACTIVE' }).lean()
    ]);

    if (!user) throw new NotFoundError('Sender user not found');

    // Branch scoping
    let branchObjectId: Types.ObjectId | null = null;
    const userScope = await BranchAccessService.getScope(tenantId, actor);
    if (input.branchId) {
      if (!Types.ObjectId.isValid(input.branchId)) throw new NotFoundError('Branch not found');
      if (userScope.mode !== 'ALL' && !userScope.branchIds.includes(input.branchId)) {
        throw new ForbiddenError('Access denied: branch outside actor scope');
      }
      branchObjectId = new Types.ObjectId(input.branchId);
    }

    const audienceType = input.audienceType || input.audience?.selector || 'ALL_AUTHORIZED';
    const rawCriteria = input.audienceCriteria || input.audience || {};
    const targetBranchIds = rawCriteria.branchIds || (rawCriteria.branchId ? [rawCriteria.branchId] : []);

    if (targetBranchIds.length > 0) {
      if (userScope.mode !== 'ALL') {
        for (const bId of targetBranchIds) {
          if (!userScope.branchIds.includes(bId)) {
            throw new ForbiddenError('Access denied: target branch outside actor scope');
          }
        }
      }
    }

    const doc = await CommunicationAnnouncementModel.create({
      tenantId: tId,
      branchId: branchObjectId,
      senderUserId: uId,
      senderName: user.name,
      senderMemberId: member ? member._id : null,
      senderRole: member ? member.role : 'USER',
      title: input.title,
      body: input.body,
      priority: input.priority || 'NORMAL',
      status: 'DRAFT',
      audienceType,
      audienceCriteria: {
        branchIds: targetBranchIds.map((id: string) => new Types.ObjectId(id)),
        batchIds: (rawCriteria.batchIds || []).map((id: string) => new Types.ObjectId(id)),
        courseIds: (rawCriteria.courseIds || []).map((id: string) => new Types.ObjectId(id)),
        userIds: (rawCriteria.userIds || rawCriteria.specificUserIds || []).map((id: string) => new Types.ObjectId(id)),
        roles: rawCriteria.roles
      },
      channels: input.channels || ['IN_APP'],
      attachments: input.attachments || [],
      revision: 0
      ,idempotencyKey: input.idempotencyKey
    });

    await AuditLogModel.create({
      tenantId: tId,
      actorId: uId,
      action: 'COMMUNICATION_ANNOUNCEMENT_CREATED',
      resource: 'CommunicationAnnouncement',
      resourceId: doc._id.toString(),
      metadata: { title: doc.title, audienceType: doc.audienceType }
    });

    return this.toDTO(doc);
  }

  public static async createAndPublishIdempotent(input: any, actor: AudienceActor, idempotencyKey: string) {
    let announcement: any;
    try { announcement = await this.createAnnouncement({ ...input, idempotencyKey }, actor); }
    catch (error: any) {
      if (error?.code !== 11000) throw error;
      const existing = await CommunicationAnnouncementModel.findOne({ tenantId: this.getTenantId(), idempotencyKey });
      if (!existing) throw error;
      announcement = this.toDTO(existing);
    }
    return this.publishAnnouncement(announcement.id, actor);
  }

  public static async updateAnnouncement(
    id: string,
    input: any,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcement = await CommunicationAnnouncementModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!announcement) throw new NotFoundError('Announcement not found');
    if (announcement.status !== 'DRAFT') {
      throw new BadRequestError('Only draft announcements can be edited');
    }

    if (input.title !== undefined) announcement.title = input.title;
    if (input.body !== undefined) announcement.body = input.body;
    if (input.priority !== undefined) announcement.priority = input.priority;
    if (input.audienceType !== undefined) announcement.audienceType = input.audienceType;
    if (input.audienceCriteria !== undefined) {
      announcement.audienceCriteria = {
        branchIds: input.audienceCriteria.branchIds?.map((id: string) => new Types.ObjectId(id)),
        batchIds: input.audienceCriteria.batchIds?.map((id: string) => new Types.ObjectId(id)),
        courseIds: input.audienceCriteria.courseIds?.map((id: string) => new Types.ObjectId(id)),
        userIds: input.audienceCriteria.userIds?.map((id: string) => new Types.ObjectId(id)),
        roles: input.audienceCriteria.roles
      };
    }
    if (input.channels !== undefined) announcement.channels = input.channels;
    if (input.attachments !== undefined) announcement.attachments = input.attachments;
    if (input.branchId !== undefined) {
      announcement.branchId = input.branchId ? new Types.ObjectId(input.branchId) : null;
    }

    announcement.revision = (announcement.revision || 0) + 1;
    await announcement.save();

    return this.toDTO(announcement);
  }

  public static async previewAudience(
    input: any,
    actor: AudienceActor
  ): Promise<ICommunicationAudiencePreview> {
    const tenantId = this.getTenantId();
    const { recipientCount } = await CommunicationAudienceService.resolveAudienceRecipients(
      tenantId,
      actor,
      input.audienceType,
      input.audienceCriteria,
      input.branchId
    );

    return {
      recipientCount,
      audienceType: input.audienceType,
      description: `Targeting approximately ${recipientCount} active recipient${recipientCount === 1 ? '' : 's'}.`
    };
  }

  public static async publishAnnouncement(
    id: string,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcementId = new Types.ObjectId(id);
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);

    const existing = await CommunicationAnnouncementModel.findOne({
      _id: announcementId,
      tenantId: tId
    });

    if (!existing) throw new NotFoundError('Announcement not found');
    if (existing.status === 'PUBLISHED') {
      return this.toDTO(existing); // Idempotent return
    }
    if (existing.status === 'CANCELLED' || existing.status === 'ARCHIVED') {
      throw new BadRequestError(`Cannot publish ${existing.status.toLowerCase()} announcement`);
    }

    // 1. Resolve audience snapshot
    const criteriaDto = existing.audienceCriteria ? {
      branchIds: existing.audienceCriteria.branchIds?.map((id: any) => id.toString()),
      batchIds: existing.audienceCriteria.batchIds?.map((id: any) => id.toString()),
      courseIds: existing.audienceCriteria.courseIds?.map((id: any) => id.toString()),
      userIds: existing.audienceCriteria.userIds?.map((id: any) => id.toString()),
      roles: existing.audienceCriteria.roles
    } : undefined;

    const { recipientUserIds, recipientCount } = await CommunicationAudienceService.resolveAudienceRecipients(
      tenantId,
      actor,
      existing.audienceType,
      criteriaDto,
      existing.branchId?.toString()
    );

    const now = new Date();
    const audienceSnapshot = {
      recipientUserIds,
      recipientCount,
      resolvedAt: now
    };

    // 2. Atomic CAS transition to PUBLISHED
    const updated = await CommunicationAnnouncementModel.findOneAndUpdate(
      {
        _id: announcementId,
        tenantId: tId,
        status: { $in: ['DRAFT', 'SCHEDULED'] }
      },
      {
        $set: {
          status: 'PUBLISHED',
          publishedAt: now,
          audienceSnapshot,
          'deliverySummary.recipientCount': recipientCount,
          'deliverySummary.queuedCount': recipientCount
        },
        $inc: { revision: 1 }
      },
      { new: true }
    );

    if (!updated) {
      // Re-fetch in case concurrent request won the race
      const refreshed = await CommunicationAnnouncementModel.findOne({ _id: announcementId, tenantId: tId });
      if (refreshed && refreshed.status === 'PUBLISHED') {
        return this.toDTO(refreshed);
      }
      throw new BadRequestError('Announcement could not be published due to status conflict');
    }

    // 3. Batch enqueue Phase 14 NotificationIntent records (bounded chunks of 200)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < recipientUserIds.length; i += CHUNK_SIZE) {
      const chunk = recipientUserIds.slice(i, i + CHUNK_SIZE);
      const intents = chunk.map((recipientId) => {
        const occurrenceKey = `publish:${announcementId.toString()}:${recipientId.toString()}`;
        return {
          tenantId: tId,
          eventId: crypto.createHash('sha256').update(occurrenceKey).digest('hex'),
          recipientUserId: recipientId,
          type: 'announcement.published',
          sourceType: 'CommunicationAnnouncement',
          sourceId: announcementId.toString(),
          occurrenceKey,
          data: {
            title: updated.title,
            body: updated.body.slice(0, 160),
            priority: updated.priority,
            actionUrl: `/student/inbox`
          },
          status: 'PENDING',
          attemptCount: 0,
          availableAt: now,
          createdAt: now
        };
      });

      try {
        await NotificationIntentModel.collection.insertMany(intents, { ordered: false });
      } catch (err: any) {
        // Ignore duplicate key errors if already present
        if (err.code !== 11000) throw err;
      }
    }

    // 4. Audit Log
    await AuditLogModel.create({
      tenantId: tId,
      actorId: uId,
      action: 'COMMUNICATION_ANNOUNCEMENT_PUBLISHED',
      resource: 'CommunicationAnnouncement',
      resourceId: updated._id.toString(),
      metadata: { title: updated.title, recipientCount }
    });

    return this.toDTO(updated);
  }

  public static async scheduleAnnouncement(
    id: string,
    scheduledAt: Date | string,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcementId = new Types.ObjectId(id);
    const tId = new Types.ObjectId(tenantId);
    const schedDate = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;

    const announcement = await CommunicationAnnouncementModel.findOne({
      _id: announcementId,
      tenantId: tId
    });

    if (!announcement) throw new NotFoundError('Announcement not found');
    if (announcement.status !== 'DRAFT' && announcement.status !== 'SCHEDULED') {
      throw new BadRequestError('Only draft or scheduled announcements can be rescheduled');
    }

    if (schedDate.getTime() <= Date.now()) {
      throw new BadRequestError('Scheduled time must be in the future');
    }

    announcement.status = 'SCHEDULED';
    announcement.scheduledAt = schedDate;
    announcement.revision = (announcement.revision || 0) + 1;
    await announcement.save();

    await AuditLogModel.create({
      tenantId: tId,
      actorId: new Types.ObjectId(actor.userId),
      action: 'COMMUNICATION_ANNOUNCEMENT_SCHEDULED',
      resource: 'CommunicationAnnouncement',
      resourceId: announcement._id.toString(),
      metadata: { title: announcement.title, scheduledAt: schedDate }
    });

    return this.toDTO(announcement);
  }

  public static async cancelAnnouncement(
    id: string,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcementId = new Types.ObjectId(id);
    const tId = new Types.ObjectId(tenantId);

    const announcement = await CommunicationAnnouncementModel.findOne({
      _id: announcementId,
      tenantId: tId
    });

    if (!announcement) throw new NotFoundError('Announcement not found');
    if (announcement.status === 'PUBLISHED') {
      throw new BadRequestError('Published announcements cannot be cancelled. Use archive instead.');
    }

    announcement.status = 'CANCELLED';
    announcement.cancelledAt = new Date();
    announcement.revision = (announcement.revision || 0) + 1;
    await announcement.save();

    await AuditLogModel.create({
      tenantId: tId,
      actorId: new Types.ObjectId(actor.userId),
      action: 'COMMUNICATION_ANNOUNCEMENT_CANCELLED',
      resource: 'CommunicationAnnouncement',
      resourceId: announcement._id.toString(),
      metadata: { title: announcement.title }
    });

    return this.toDTO(announcement);
  }

  public static async archiveAnnouncement(
    id: string,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcementId = new Types.ObjectId(id);
    const tId = new Types.ObjectId(tenantId);

    const announcement = await CommunicationAnnouncementModel.findOne({
      _id: announcementId,
      tenantId: tId
    });

    if (!announcement) throw new NotFoundError('Announcement not found');

    announcement.status = 'ARCHIVED';
    announcement.archivedAt = new Date();
    announcement.revision = (announcement.revision || 0) + 1;
    await announcement.save();

    await AuditLogModel.create({
      tenantId: tId,
      actorId: new Types.ObjectId(actor.userId),
      action: 'COMMUNICATION_ANNOUNCEMENT_ARCHIVED',
      resource: 'CommunicationAnnouncement',
      resourceId: announcement._id.toString(),
      metadata: { title: announcement.title }
    });

    return this.toDTO(announcement);
  }

  public static async getAnnouncement(
    id: string,
    actor: AudienceActor
  ): Promise<ICommunicationAnnouncement> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Announcement not found');

    const announcementId = new Types.ObjectId(id);
    const tId = new Types.ObjectId(tenantId);

    const announcement = await CommunicationAnnouncementModel.findOne({
      _id: announcementId,
      tenantId: tId
    });

    if (!announcement) throw new NotFoundError('Announcement not found');

    // Branch scoping
    if (announcement.branchId) {
      const userScope = await BranchAccessService.getScope(tenantId, actor);
      if (userScope.mode !== 'ALL' && !userScope.branchIds.includes(announcement.branchId.toString())) {
        throw new NotFoundError('Announcement not found');
      }
    }

    // Compute live delivery summary from Phase 14 models
    let deliverySummary: ICommunicationDeliverySummary | undefined = announcement.deliverySummary;
    if (announcement.status === 'PUBLISHED') {
      const [deliveredCount, failedCount, readCount] = await Promise.all([
        NotificationDeliveryModel.countDocuments({
          tenantId: tId,
          status: 'DELIVERED',
          notificationId: {
            $in: (await NotificationModel.find({
              tenantId: tId,
              sourceType: 'CommunicationAnnouncement',
              sourceId: id
            }).select('_id').lean()).map((n) => n._id)
          }
        }),
        NotificationDeliveryModel.countDocuments({
          tenantId: tId,
          status: 'FAILED',
          notificationId: {
            $in: (await NotificationModel.find({
              tenantId: tId,
              sourceType: 'CommunicationAnnouncement',
              sourceId: id
            }).select('_id').lean()).map((n) => n._id)
          }
        }),
        NotificationModel.countDocuments({
          tenantId: tId,
          sourceType: 'CommunicationAnnouncement',
          sourceId: id,
          readAt: { $ne: null }
        })
      ]);

      deliverySummary = {
        recipientCount: announcement.audienceSnapshot?.recipientCount || 0,
        queuedCount: Math.max(0, (announcement.audienceSnapshot?.recipientCount || 0) - deliveredCount - failedCount),
        deliveredCount,
        failedCount,
        readCount
      };
    }

    return this.toDTO(announcement, deliverySummary);
  }

  public static async listAnnouncements(
    rawQuery: any,
    actor: AudienceActor
  ): Promise<{ data: ICommunicationAnnouncement[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const userScope = await BranchAccessService.getScope(tenantId, actor);

    const page = Math.max(1, Number(rawQuery.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { tenantId: tId };

    if (rawQuery.status) filter.status = rawQuery.status;
    if (rawQuery.priority) filter.priority = rawQuery.priority;

    // Branch scoping
    if (rawQuery.branchId) {
      if (!Types.ObjectId.isValid(rawQuery.branchId)) throw new NotFoundError('Branch not found');
      if (userScope.mode !== 'ALL' && !userScope.branchIds.includes(rawQuery.branchId)) {
        throw new NotFoundError('Branch not found');
      }
      filter.branchId = new Types.ObjectId(rawQuery.branchId);
    } else if (userScope.mode === 'SELECTED') {
      filter.$or = [
        { branchId: { $in: userScope.branchIds.map((id) => new Types.ObjectId(id)) } },
        { branchId: null }
      ];
    }

    if (rawQuery.search) {
      filter.title = { $regex: rawQuery.search, $options: 'i' };
    }

    const [docs, total] = await Promise.all([
      CommunicationAnnouncementModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunicationAnnouncementModel.countDocuments(filter)
    ]);

    return {
      data: docs.map((d) => this.toDTO(d)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Background dispatcher for scheduled announcements
   */
  public static async processScheduledAnnouncements(): Promise<number> {
    const now = new Date();
    const scheduled = await CommunicationAnnouncementModel.find({
      status: 'SCHEDULED',
      scheduledAt: { $lte: now }
    }).limit(20);

    let processed = 0;
    for (const ann of scheduled) {
      try {
        await this.publishAnnouncement(ann._id.toString(), {
          userId: ann.senderUserId.toString(),
          isSuperAdmin: true,
          permissions: ['superadmin.all']
        });
        processed++;
      } catch (err) {
        console.error(`[Communication] Failed to publish scheduled announcement ${ann._id}:`, err);
      }
    }
    return processed;
  }

  public static async processDueScheduledAnnouncements(): Promise<number> {
    return this.processScheduledAnnouncements();
  }
}
