import { Types } from 'mongoose';
import crypto from 'node:crypto';
import {
  CommunicationConversationModel,
  CommunicationMessageModel,
  ICommunicationMessageDocument,
  NotificationIntentModel,
  UserModel
} from '@edtech/database';
import { ICommunicationMessage, SendMessageInput } from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/appError';
import { AudienceActor } from './communicationAudience.service';

export class CommunicationMessageService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  private static toDTO(doc: ICommunicationMessageDocument): ICommunicationMessage {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      conversationId: doc.conversationId.toString(),
      senderUserId: doc.senderUserId.toString(),
      senderName: doc.senderName,
      senderAvatarUrl: doc.senderAvatarUrl,
      body: doc.body,
      attachments: doc.attachments || [],
      idempotencyKey: doc.idempotencyKey || undefined,
      sequenceNumber: doc.sequenceNumber,
      sentAt: doc.sentAt,
      editedAt: doc.editedAt || undefined,
      isDeleted: doc.isDeleted || false,
      deletedAt: doc.deletedAt || undefined,
      deletedByUserId: doc.deletedByUserId ? doc.deletedByUserId.toString() : undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static async sendMessage(
    conversationId: string,
    input: {
      body: string;
      attachments?: Array<{ id: string; name: string; url: string; sizeBytes: number; mimeType: string }>;
      idempotencyKey?: string;
    },
    actor: AudienceActor
  ): Promise<ICommunicationMessage> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(conversationId)) throw new NotFoundError('Conversation not found');

    const convId = new Types.ObjectId(conversationId);
    const tId = new Types.ObjectId(tenantId);
    const senderId = new Types.ObjectId(actor.userId);

    // 1. Verify conversation exists and actor is participant
    const conversation = await CommunicationConversationModel.findOne({
      _id: convId,
      tenantId: tId
    });

    if (!conversation) throw new NotFoundError('Conversation not found');
    if (conversation.status === 'CLOSED') {
      throw new BadRequestError('Cannot send message to a closed conversation');
    }

    const isParticipant = conversation.participantUserIds.some((uid) => uid.toString() === actor.userId);
    if (!isParticipant && !actor.isSuperAdmin && !actor.permissions?.includes('communication.moderate')) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    // 2. Check idempotency if idempotencyKey provided
    if (input.idempotencyKey) {
      const existing = await CommunicationMessageModel.findOne({
        tenantId: tId,
        conversationId: convId,
        senderUserId: senderId,
        idempotencyKey: input.idempotencyKey
      });
      if (existing) {
        return this.toDTO(existing);
      }
    }

    // 3. Atomically increment messageCount in conversation and assign sequence number
    const updatedConv = await CommunicationConversationModel.findOneAndUpdate(
      { _id: convId, tenantId: tId },
      { $inc: { messageCount: 1 } },
      { new: true }
    );

    const sequenceNumber = updatedConv?.messageCount || 1;
    const now = new Date();

    const senderUser = await UserModel.findOne({ _id: senderId, tenantId: tId }).select('name avatarUrl').lean();

    let message: ICommunicationMessageDocument;
    try {
      message = await CommunicationMessageModel.create({
        tenantId: tId,
        conversationId: convId,
        senderUserId: senderId,
        senderName: senderUser?.name,
        senderAvatarUrl: senderUser?.avatarUrl,
        body: input.body,
        attachments: input.attachments || [],
        idempotencyKey: input.idempotencyKey || null,
        sequenceNumber,
        sentAt: now
      });
    } catch (err: any) {
      if (err.code === 11000 && input.idempotencyKey) {
        const existing = await CommunicationMessageModel.findOne({
          tenantId: tId,
          conversationId: convId,
          senderUserId: senderId,
          idempotencyKey: input.idempotencyKey
        });
        if (existing) return this.toDTO(existing);
      }
      throw err;
    }

    // 4. Update conversation metadata and sender's lastReadAt
    await CommunicationConversationModel.updateOne(
      { _id: convId, tenantId: tId },
      {
        $set: {
          lastMessageAt: now,
          lastMessagePreview: message.body.slice(0, 100),
          lastMessageSenderId: senderId,
          'participants.$[elem].lastReadAt': now
        }
      },
      {
        arrayFilters: [{ 'elem.userId': senderId }]
      }
    );

    // 5. Enqueue Phase 14 NotificationIntent for all other participants
    const recipientIds = conversation.participantUserIds.filter((uid) => uid.toString() !== actor.userId);
    if (recipientIds.length > 0) {
      const intents = recipientIds.map((recipientId) => {
        const occurrenceKey = `msg:${message._id.toString()}:${recipientId.toString()}`;
        return {
          tenantId: tId,
          eventId: crypto.createHash('sha256').update(occurrenceKey).digest('hex'),
          recipientUserId: recipientId,
          type: 'communication.message_received',
          sourceType: 'CommunicationConversation',
          sourceId: convId.toString(),
          occurrenceKey,
          data: {
            senderName: senderUser?.name || 'Someone',
            preview: message.body.slice(0, 100),
            actionUrl: `/student/conversations`
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
        if (err.code !== 11000) throw err;
      }
    }

    return this.toDTO(message);
  }

  public static async listMessages(
    conversationId: string,
    rawQuery: { limit?: number; beforeSequence?: number },
    actor: AudienceActor
  ): Promise<{ data: ICommunicationMessage[]; nextCursor?: number }> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(conversationId)) throw new NotFoundError('Conversation not found');

    const convId = new Types.ObjectId(conversationId);
    const tId = new Types.ObjectId(tenantId);

    // Verify conversation access
    const conversation = await CommunicationConversationModel.findOne({
      _id: convId,
      tenantId: tId
    });

    if (!conversation) throw new NotFoundError('Conversation not found');
    const isParticipant = conversation.participantUserIds.some((uid) => uid.toString() === actor.userId);
    if (!isParticipant && !actor.isSuperAdmin && !actor.permissions?.includes('communication.moderate')) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 50));
    const filter: any = {
      tenantId: tId,
      conversationId: convId
    };

    if (rawQuery.beforeSequence) {
      filter.sequenceNumber = { $lt: Number(rawQuery.beforeSequence) };
    }

    const messages = await CommunicationMessageModel.find(filter)
      .sort({ sequenceNumber: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const returnMessages = hasMore ? messages.slice(0, limit) : messages;

    // Return in ascending chronological sequence
    returnMessages.reverse();

    const nextCursor = hasMore && returnMessages.length > 0 ? returnMessages[0].sequenceNumber : undefined;

    return {
      data: returnMessages.map((m) => this.toDTO(m)),
      nextCursor
    };
  }
}
