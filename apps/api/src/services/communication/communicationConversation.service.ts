import { Types } from 'mongoose';
import {
  CommunicationConversationModel,
  ICommunicationConversationDocument,
  CommunicationMessageModel,
  CommunicationReadStateModel,
  UserModel,
  OrganizationMemberModel,
  EnrollmentModel,
  BatchModel,
  ClassModel,
  StudentLifecycleModel
} from '@edtech/database';
import {
  ICommunicationConversation,
  ICommunicationParticipant,
  ConversationType
} from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/appError';
import { AudienceActor } from './communicationAudience.service';

export class CommunicationConversationService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  private static toDTO(
    doc: ICommunicationConversationDocument,
    unreadCount = 0
  ): ICommunicationConversation {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId ? doc.branchId.toString() : undefined,
      type: doc.type,
      fingerprint: doc.fingerprint || undefined,
      title: doc.title,
      participants: doc.participants.map((p) => ({
        userId: p.userId.toString(),
        name: p.name,
        email: p.email,
        avatarUrl: p.avatarUrl,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt || undefined,
        status: p.status,
        lastReadAt: p.lastReadAt || undefined
      })),
      participantUserIds: doc.participantUserIds.map((id) => id.toString()),
      courseId: doc.courseId ? doc.courseId.toString() : undefined,
      batchId: doc.batchId ? doc.batchId.toString() : undefined,
      lastMessageAt: doc.lastMessageAt || undefined,
      lastMessagePreview: doc.lastMessagePreview,
      lastMessageSenderId: doc.lastMessageSenderId ? doc.lastMessageSenderId.toString() : undefined,
      messageCount: doc.messageCount || 0,
      status: doc.status,
      unreadCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Enforces canonical academic relationship for STUDENT <-> INSTRUCTOR messaging
   */
  private static async validateStudentInstructorRelationship(
    tenantId: Types.ObjectId,
    userIdA: Types.ObjectId,
    userIdB: Types.ObjectId,
    courseId?: Types.ObjectId | null,
    batchId?: Types.ObjectId | null
  ): Promise<void> {
    // Identify who is student and who is instructor
    const [memberA, memberB] = await Promise.all([
      OrganizationMemberModel.findOne({ tenantId, userId: userIdA, status: 'ACTIVE' }).lean(),
      OrganizationMemberModel.findOne({ tenantId, userId: userIdB, status: 'ACTIVE' }).lean()
    ]);

    let instructorUserId: Types.ObjectId;
    let studentUserId: Types.ObjectId;

    if (memberA?.role === 'INSTRUCTOR') {
      instructorUserId = userIdA;
      studentUserId = userIdB;
    } else if (memberB?.role === 'INSTRUCTOR') {
      instructorUserId = userIdB;
      studentUserId = userIdA;
    } else {
      // Neither is an instructor or both are staff/students
      return;
    }

    // Verify student has active enrollment or active lifecycle in a batch/course taught by the instructor
    const instructorBatches = await BatchModel.find({
      tenantId,
      instructorId: instructorUserId,
      status: { $ne: 'ARCHIVED' }
    }).select('_id courseId').lean();

    const instructorBatchIds = instructorBatches.map((b) => b._id);
    const instructorCourseIds = instructorBatches.map((b) => b.courseId);

    // Also check classes assigned to instructor
    const instructorClasses = await ClassModel.find({
      tenantId,
      instructorId: instructorUserId,
      status: { $ne: 'CANCELLED' }
    }).select('batchId courseId').lean();

    instructorClasses.forEach((c) => {
      if (c.batchId) instructorBatchIds.push(c.batchId);
      if (c.courseId) instructorCourseIds.push(c.courseId);
    });

    if (instructorBatchIds.length === 0) {
      throw new ForbiddenError('Student and Instructor must share an active academic course or batch relationship');
    }

    const studentLifecycle = await StudentLifecycleModel.findOne({
      tenantId,
      studentUserId,
      currentStatus: { $in: ['ENROLLED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
      currentBatchId: { $in: instructorBatchIds }
    }).lean();

    const studentEnrollment = await EnrollmentModel.findOne({
      tenantId,
      $or: [{ studentId: studentUserId }, { studentUserId }],
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      batchId: { $in: instructorBatchIds }
    }).lean();

    if (!studentLifecycle && !studentEnrollment) {
      throw new ForbiddenError('Student and Instructor must share an active academic course or batch relationship');
    }
  }

  public static async createConversation(
    input: {
      type: ConversationType;
      participantUserIds: string[];
      title?: string;
      courseId?: string;
      batchId?: string;
      initialMessage?: string;
    },
    actor: AudienceActor
  ): Promise<ICommunicationConversation> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const actorUserId = new Types.ObjectId(actor.userId);

    // Ensure actor is included in participants
    const rawIds = input.participantUserIds || (input as any).recipientUserIds || [];
    const allParticipantIdsSet = new Set<string>(rawIds);
    allParticipantIdsSet.add(actor.userId);
    const participantUserIds = Array.from(allParticipantIdsSet).map((id) => new Types.ObjectId(id));

    if (participantUserIds.length < 2) {
      throw new BadRequestError('Conversation requires at least two participants');
    }

    // Verify all participants are active users in the same tenant
    const users = await UserModel.find({
      _id: { $in: participantUserIds },
      tenantId: tId,
      status: 'ACTIVE'
    }).lean();

    if (users.length !== participantUserIds.length) {
      throw new BadRequestError('All participants must be active users in the organization');
    }

    const members = await OrganizationMemberModel.find({
      userId: { $in: participantUserIds },
      tenantId: tId,
      status: 'ACTIVE'
    }).lean();
    const memberRoleMap = new Map<string, string>();
    members.forEach((m) => memberRoleMap.set(m.userId.toString(), m.role));

    // For STUDENT_INSTRUCTOR conversations, validate academic relationship
    if (input.type === 'STUDENT_INSTRUCTOR' && participantUserIds.length === 2) {
      await this.validateStudentInstructorRelationship(
        tId,
        participantUserIds[0],
        participantUserIds[1],
        input.courseId ? new Types.ObjectId(input.courseId) : null,
        input.batchId ? new Types.ObjectId(input.batchId) : null
      );
    }

    // Compute deterministic fingerprint for DIRECT or STUDENT_INSTRUCTOR pairs
    let fingerprint: string | null = null;
    if (input.type === 'DIRECT' || input.type === 'STUDENT_INSTRUCTOR') {
      const sortedIds = participantUserIds.map((id) => id.toString()).sort();
      const contextKey = input.courseId ? `:${input.courseId}` : '';
      fingerprint = `${input.type}:${sortedIds[0]}:${sortedIds[1]}${contextKey}`;
    }

    // If fingerprint exists, check if conversation already exists (idempotency under race)
    if (fingerprint) {
      const existing = await CommunicationConversationModel.findOne({
        tenantId: tId,
        fingerprint
      });
      if (existing) {
        return this.toDTO(existing);
      }
    }

    const participantsData = users.map((u) => ({
      userId: u._id as Types.ObjectId,
      name: u.name,
      email: u.email,
      role: memberRoleMap.get(u._id.toString()) || 'STUDENT',
      joinedAt: new Date(),
      status: 'ACTIVE' as const,
      lastReadAt: u._id.toString() === actor.userId ? new Date() : null
    }));

    let conversation: ICommunicationConversationDocument;
    try {
      conversation = await CommunicationConversationModel.create({
        tenantId: tId,
        type: input.type,
        fingerprint,
        title: input.title,
        participants: participantsData,
        participantUserIds,
        courseId: input.courseId ? new Types.ObjectId(input.courseId) : null,
        batchId: input.batchId ? new Types.ObjectId(input.batchId) : null,
        status: 'ACTIVE',
        messageCount: 0
      });
    } catch (err: any) {
      // If concurrent insert created the fingerprint first, return the existing one
      if (err.code === 11000 && fingerprint) {
        const existing = await CommunicationConversationModel.findOne({ tenantId: tId, fingerprint });
        if (existing) return this.toDTO(existing);
      }
      throw err;
    }

    // If initial message provided, insert it
    if (input.initialMessage) {
      const msg = await CommunicationMessageModel.create({
        tenantId: tId,
        conversationId: conversation._id,
        senderUserId: actorUserId,
        senderName: users.find((u) => u._id.toString() === actor.userId)?.name,
        body: input.initialMessage,
        attachments: [],
        sequenceNumber: 1,
        sentAt: new Date()
      });

      conversation.messageCount = 1;
      conversation.lastMessageAt = msg.sentAt;
      conversation.lastMessagePreview = msg.body.slice(0, 100);
      conversation.lastMessageSenderId = actorUserId;
      await conversation.save();
    }

    return this.toDTO(conversation);
  }

  public static async getConversation(
    id: string,
    actor: AudienceActor
  ): Promise<ICommunicationConversation> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Conversation not found');

    const conversation = await CommunicationConversationModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId)
    });

    if (!conversation) throw new NotFoundError('Conversation not found');

    // Verify actor is a participant or has moderate permissions
    const isParticipant = conversation.participantUserIds.some((uid) => uid.toString() === actor.userId);
    if (!isParticipant && !actor.isSuperAdmin && !actor.permissions?.includes('communication.moderate')) {
      throw new NotFoundError('Conversation not found');
    }

    return this.toDTO(conversation);
  }

  public static async listConversations(
    rawQuery: any,
    actor: AudienceActor
  ): Promise<{ data: ICommunicationConversation[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);

    const page = Math.max(1, Number(rawQuery.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: tId,
      participantUserIds: uId,
      status: { $ne: 'CLOSED' }
    };

    if (rawQuery.type) filter.type = rawQuery.type;
    if (rawQuery.search) {
      filter.title = { $regex: rawQuery.search, $options: 'i' };
    }

    const [docs, total] = await Promise.all([
      CommunicationConversationModel.find(filter)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunicationConversationModel.countDocuments(filter)
    ]);

    // Compute unread counts per conversation
    const result = await Promise.all(
      docs.map(async (doc) => {
        const participant = doc.participants.find((p) => p.userId.toString() === actor.userId);
        const lastReadAt = participant?.lastReadAt;

        let unreadCount = 0;
        if (lastReadAt) {
          unreadCount = await CommunicationMessageModel.countDocuments({
            tenantId: tId,
            conversationId: doc._id,
            sentAt: { $gt: lastReadAt },
            senderUserId: { $ne: uId }
          });
        } else if (doc.messageCount > 0) {
          unreadCount = doc.messageCount;
        }

        return this.toDTO(doc, unreadCount);
      })
    );

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
