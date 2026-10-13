import { Types } from 'mongoose';
import {
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  CommunicationReadStateModel
} from '@edtech/database';
import { ICommunicationInboxItem, ICommunicationUnreadCount } from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, NotFoundError } from '../../errors/appError';
import { AudienceActor } from './communicationAudience.service';

export class CommunicationInboxService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  public static async getInbox(
    rawQuery: any,
    actor: AudienceActor
  ): Promise<{ data: ICommunicationInboxItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);

    const page = Math.max(1, Number(rawQuery.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 20));
    const filterType = rawQuery.type || 'ALL';
    const filterStatus = rawQuery.status || 'ALL';

    const inboxItems: ICommunicationInboxItem[] = [];

    // 1. Fetch relevant announcements targeting this user
    if (filterType === 'ALL' || filterType === 'ANNOUNCEMENT') {
      const annFilter: any = {
        tenantId: tId,
        status: 'PUBLISHED',
        'audienceSnapshot.recipientUserIds': uId
      };

      if (rawQuery.search) {
        annFilter.title = { $regex: rawQuery.search, $options: 'i' };
      }

      const announcements = await CommunicationAnnouncementModel.find(annFilter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(100)
        .lean();

      // Read states for announcements
      const annIds = announcements.map((a) => a._id);
      const readStates = await CommunicationReadStateModel.find({
        tenantId: tId,
        recipientUserId: uId,
        itemType: 'ANNOUNCEMENT',
        itemId: { $in: annIds }
      }).lean();

      const readMap = new Map<string, Date>();
      readStates.forEach((rs) => readMap.set(rs.itemId.toString(), rs.readAt));

      for (const a of announcements) {
        const aIdStr = a._id.toString();
        const readAt = readMap.get(aIdStr);
        const isRead = Boolean(readAt);

        if (filterStatus === 'UNREAD' && isRead) continue;
        if (filterStatus === 'READ' && !isRead) continue;

        inboxItems.push({
          id: aIdStr,
          itemType: 'ANNOUNCEMENT',
          announcementId: aIdStr,
          title: a.title,
          preview: a.body.slice(0, 120),
          priority: a.priority,
          senderName: a.senderName || 'Institution',
          timestamp: a.publishedAt || a.createdAt,
          isRead,
          readAt,
          actionUrl: `/student/inbox?announcementId=${aIdStr}`,
          metadata: {
            channels: a.channels,
            hasAttachments: (a.attachments || []).length > 0
          }
        });
      }
    }

    // 2. Fetch conversations
    if (filterType === 'ALL' || filterType === 'CONVERSATION') {
      const convFilter: any = {
        tenantId: tId,
        participantUserIds: uId,
        status: { $ne: 'CLOSED' }
      };

      if (rawQuery.search) {
        convFilter.title = { $regex: rawQuery.search, $options: 'i' };
      }

      const conversations = await CommunicationConversationModel.find(convFilter)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .limit(100)
        .lean();

      for (const c of conversations) {
        const participant = c.participants.find((p) => p.userId.toString() === actor.userId);
        const lastReadAt = participant?.lastReadAt;
        const hasUnread = Boolean(
          c.lastMessageAt &&
          c.lastMessageSenderId?.toString() !== actor.userId &&
          (!lastReadAt || new Date(c.lastMessageAt) > new Date(lastReadAt))
        );
        const isRead = !hasUnread;

        if (filterStatus === 'UNREAD' && isRead) continue;
        if (filterStatus === 'READ' && !isRead) continue;

        const otherParticipant = c.participants.find((p) => p.userId.toString() !== actor.userId);

        inboxItems.push({
          id: `conv:${c._id.toString()}`,
          itemType: 'CONVERSATION',
          conversationId: c._id.toString(),
          title: c.title || otherParticipant?.name || 'Direct Conversation',
          preview: c.lastMessagePreview || 'Conversation started',
          senderName: otherParticipant?.name || 'Participant',
          senderAvatarUrl: otherParticipant?.avatarUrl,
          timestamp: c.lastMessageAt || c.createdAt,
          isRead,
          readAt: lastReadAt,
          actionUrl: `/student/conversations?id=${c._id.toString()}`,
          metadata: {
            type: c.type,
            messageCount: c.messageCount
          }
        });
      }
    }

    // 3. Sort all items descending by timestamp
    inboxItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = inboxItems.length;
    const paginatedItems = inboxItems.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static async getUnreadCount(actor: AudienceActor): Promise<ICommunicationUnreadCount> {
    const tenantId = this.getTenantId();
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);

    // 1. Announcements unread count
    const [publishedAnnouncements, readAnnouncements] = await Promise.all([
      CommunicationAnnouncementModel.find({
        tenantId: tId,
        status: 'PUBLISHED',
        'audienceSnapshot.recipientUserIds': uId
      }).select('_id').lean(),
      CommunicationReadStateModel.find({
        tenantId: tId,
        recipientUserId: uId,
        itemType: 'ANNOUNCEMENT'
      }).select('itemId').lean()
    ]);

    const readAnnSet = new Set(readAnnouncements.map((r) => r.itemId.toString()));
    const announcementsUnread = publishedAnnouncements.filter((a) => !readAnnSet.has(a._id.toString())).length;

    // 2. Conversations unread count
    const conversations = await CommunicationConversationModel.find({
      tenantId: tId,
      participantUserIds: uId,
      status: { $ne: 'CLOSED' },
      messageCount: { $gt: 0 }
    }).select('participants lastMessageAt lastMessageSenderId').lean();

    let conversationsUnread = 0;
    for (const c of conversations) {
      const participant = c.participants.find((p) => p.userId.toString() === actor.userId);
      const lastReadAt = participant?.lastReadAt;
      if (
        c.lastMessageAt &&
        c.lastMessageSenderId?.toString() !== actor.userId &&
        (!lastReadAt || new Date(c.lastMessageAt) > new Date(lastReadAt))
      ) {
        conversationsUnread++;
      }
    }

    return {
      unreadCount: announcementsUnread + conversationsUnread,
      totalUnread: announcementsUnread + conversationsUnread,
      announcementsUnread,
      conversationsUnread
    };
  }

  public static async markRead(
    input: { itemType: 'ANNOUNCEMENT' | 'CONVERSATION'; itemId: string; lastReadMessageSequence?: number },
    actor: AudienceActor
  ): Promise<{ success: boolean; unreadCount: number }> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(input.itemId)) throw new NotFoundError('Item not found');

    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(actor.userId);
    const itemId = new Types.ObjectId(input.itemId);
    const now = new Date();

    // 1. Upsert persistent CommunicationReadStateModel
    await CommunicationReadStateModel.updateOne(
      {
        tenantId: tId,
        recipientUserId: uId,
        itemType: input.itemType,
        itemId
      },
      {
        $set: {
          readAt: now,
          lastReadMessageSequence: input.lastReadMessageSequence || 0
        }
      },
      { upsert: true }
    );

    // 2. If conversation, update participant lastReadAt
    if (input.itemType === 'CONVERSATION') {
      await CommunicationConversationModel.updateOne(
        { _id: itemId, tenantId: tId },
        {
          $set: {
            'participants.$[elem].lastReadAt': now
          }
        },
        {
          arrayFilters: [{ 'elem.userId': uId }]
        }
      );
    }

    const { unreadCount } = await this.getUnreadCount(actor);
    return { success: true, unreadCount };
  }
}
