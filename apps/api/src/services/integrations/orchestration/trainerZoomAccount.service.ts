import { Types } from 'mongoose';
import {
  TrainerZoomAccountModel,
  ITrainerZoomAccountDocument,
  UserModel,
  OrganizationMemberModel,
  ClassModel,
  BatchModel,
  ExternalMeetingModel,
  IntegrationConnectionModel,
  LiveMeetingAssociationHistoryModel
} from '@edtech/database';
import { ITrainerZoomAccountDTO } from '@edtech/types';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../../errors/appError';
import { BranchAccessService, BranchActor } from '../../branchAccess.service';
import { AuditService } from '../../audit.service';
import { IntegrationProviderRegistry } from '../registry/providerRegistry.service';
import { ZoomAdapter } from '../adapters/zoom.adapter';

export interface ResolvedHostResult {
  hostExternalUserId: string;
  hostEmail: string;
  trainerUserId: string | null;
  trainerName?: string;
  isFallback: boolean;
  hasConflict?: boolean;
  conflictDetails?: string;
  warning?: string;
}

export class TrainerZoomAccountService {
  private static deterministicAdaptersEnabled() {
    return process.env.NODE_ENV === 'test' && process.env.ENABLE_INTEGRATION_TEST_ADAPTERS === 'true';
  }

  public static toDTO(doc: ITrainerZoomAccountDocument, userDoc?: any): ITrainerZoomAccountDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: doc.userId.toString(),
      trainerName: userDoc?.name || doc.metadata?.trainerName,
      trainerEmail: userDoc?.email || doc.metadata?.trainerEmail,
      zoomAccountId: doc.zoomAccountId,
      zoomUserId: doc.zoomUserId,
      zoomEmail: doc.zoomEmail,
      accountMembershipStatus: doc.accountMembershipStatus,
      licenseType: doc.licenseType,
      isHostEligible: doc.isHostEligible,
      ineligibilityReason: doc.ineligibilityReason,
      verifiedAt: doc.verifiedAt,
      lastSyncedAt: doc.lastSyncedAt,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Verifies and maps an LMS trainer to their institute Zoom host account.
   */
  public static async mapTrainerZoomAccount(
    tenantId: string,
    trainerUserId: string,
    zoomIdentifier: string,
    actor: BranchActor
  ): Promise<ITrainerZoomAccountDTO> {
    return BranchAccessService.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      if (!zoomIdentifier || !zoomIdentifier.trim()) {
        throw new BadRequestError('Zoom user ID or verified email is required');
      }

      // 1. Verify LMS trainer exists and is an active INSTRUCTOR
      const trainerUser = await UserModel.findOne({
        _id: new Types.ObjectId(trainerUserId),
        tenantId: new Types.ObjectId(tenantId)
      });
      if (!trainerUser || trainerUser.status !== 'ACTIVE') {
        throw new NotFoundError('Trainer user account not found or is inactive in this institute');
      }

      const membership = await OrganizationMemberModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(trainerUserId),
        status: 'ACTIVE'
      });
      if (!membership) {
        throw new ForbiddenError('Trainer is not an active member of this organization');
      }
      if (membership.role !== 'INSTRUCTOR' && !trainerUser.isSuperAdmin) {
        throw new BadRequestError('User does not have INSTRUCTOR role in this organization');
      }

      // 2. Fetch tenant Zoom connection
      const connection = await IntegrationConnectionModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        provider: 'ZOOM',
        status: 'CONNECTED'
      });
      if (!connection) {
        throw new BadRequestError('No active Zoom connection found for this institute. Connect Zoom first in Admin Settings → Integrations.');
      }

      // 3. Query Zoom API to verify user existence, account membership, and license
      const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM') as any;
      let zoomUser: any;
      try {
        zoomUser = await providerAdapter.getZoomUser(connection, zoomIdentifier.trim());
      } catch (err: any) {
        if (err.status === 404 || err.code === 'RESOURCE_NOT_FOUND') {
          throw new NotFoundError(`Zoom user "${zoomIdentifier}" was not found in the connected Zoom account`);
        }
        throw err;
      }

      if (!zoomUser || !zoomUser.id) {
        throw new NotFoundError(`Unable to resolve Zoom user for identifier "${zoomIdentifier}"`);
      }

      // 4. Verify account ownership matching
      const expectedAccountId = connection.externalTenantId;
      if (expectedAccountId && zoomUser.account_id && zoomUser.account_id !== expectedAccountId) {
        throw new ForbiddenError('The specified Zoom user belongs to a different Zoom account than the institute connection');
      }

      // 5. Evaluate license and host eligibility
      // Zoom User types: 1 = Basic, 2 = Licensed, 3 = On-Prem
      const zoomType = Number(zoomUser.type || 1);
      const licenseType: 'LICENSED' | 'BASIC' | 'ON_PREM' =
        zoomType === 2 ? 'LICENSED' : zoomType === 3 ? 'ON_PREM' : 'BASIC';
      const rawStatus = String(zoomUser.status || 'active').toUpperCase();
      const accountMembershipStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' =
        rawStatus === 'ACTIVE' ? 'ACTIVE' : rawStatus === 'PENDING' ? 'PENDING' : 'INACTIVE';

      let isHostEligible = true;
      let ineligibilityReason: string | null = null;

      if (accountMembershipStatus !== 'ACTIVE') {
        isHostEligible = false;
        ineligibilityReason = `ACCOUNT_${accountMembershipStatus}`;
      } else if (licenseType !== 'LICENSED') {
        isHostEligible = false;
        ineligibilityReason = 'BASIC_UNLICENSED_USER';
      }

      // 6. Check for collision: zoomUserId must not already be mapped to a DIFFERENT trainer in this tenant
      const existingMapping = await TrainerZoomAccountModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        zoomUserId: zoomUser.id,
        userId: { $ne: new Types.ObjectId(trainerUserId) }
      });
      if (existingMapping) {
        throw new ConflictError('This Zoom user ID is already mapped to another trainer in this institute');
      }

      // 7. Upsert TrainerZoomAccount mapping
      const mapping = await TrainerZoomAccountModel.findOneAndUpdate(
        {
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(trainerUserId)
        },
        {
          $set: {
            zoomAccountId: zoomUser.account_id || expectedAccountId || 'zoom_institute_account',
            zoomUserId: zoomUser.id,
            zoomEmail: String(zoomUser.email || '').toLowerCase().trim(),
            accountMembershipStatus,
            licenseType,
            isHostEligible,
            ineligibilityReason,
            verifiedAt: new Date(),
            lastSyncedAt: new Date(),
            metadata: {
              trainerName: trainerUser.name,
              trainerEmail: trainerUser.email,
              pmi: zoomUser.pmi,
              dept: zoomUser.dept,
              timezone: zoomUser.timezone,
              verifiedBy: actor.userId
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'TRAINER_ZOOM_ACCOUNT_MAPPED',
        resource: 'TrainerZoomAccount',
        resourceId: mapping._id.toString(),
        metadata: {
          trainerUserId,
          zoomUserId: zoomUser.id,
          zoomEmail: zoomUser.email,
          licenseType,
          isHostEligible,
          ineligibilityReason
        }
      });

      return this.toDTO(mapping, trainerUser);
    });
  }

  /**
   * Synchronizes license and status for all mapped trainer Zoom accounts for the tenant.
   */
  public static async syncAllTrainersZoomStatus(
    tenantId: string,
    actor: BranchActor
  ): Promise<{ total: number; synced: number; eligible: number; ineligible: number }> {
    return BranchAccessService.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const connection = await IntegrationConnectionModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        provider: 'ZOOM',
        status: 'CONNECTED'
      });
      if (!connection) {
        throw new BadRequestError('No active Zoom connection found for this institute');
      }

      const mappings = await TrainerZoomAccountModel.find({
        tenantId: new Types.ObjectId(tenantId)
      });
      const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM') as any;

      let synced = 0;
      let eligible = 0;
      let ineligible = 0;

      for (const m of mappings) {
        try {
          const zoomUser = await providerAdapter.getZoomUser(connection, m.zoomUserId);
          if (zoomUser) {
            const zoomType = Number(zoomUser.type || 1);
            const licenseType = zoomType === 2 ? 'LICENSED' : zoomType === 3 ? 'ON_PREM' : 'BASIC';
            const rawStatus = String(zoomUser.status || 'active').toUpperCase();
            const accountMembershipStatus = rawStatus === 'ACTIVE' ? 'ACTIVE' : rawStatus === 'PENDING' ? 'PENDING' : 'INACTIVE';
            const isHostEligible = accountMembershipStatus === 'ACTIVE' && licenseType === 'LICENSED';
            const ineligibilityReason = !isHostEligible
              ? accountMembershipStatus !== 'ACTIVE' ? `ACCOUNT_${accountMembershipStatus}` : 'BASIC_UNLICENSED_USER'
              : null;

            m.accountMembershipStatus = accountMembershipStatus;
            m.licenseType = licenseType;
            m.isHostEligible = isHostEligible;
            m.ineligibilityReason = ineligibilityReason;
            m.lastSyncedAt = new Date();
            await m.save();

            synced++;
            if (isHostEligible) eligible++;
            else ineligible++;
          }
        } catch {
          // Keep previous record on temporary network error
        }
      }

      return { total: mappings.length, synced, eligible, ineligible };
    });
  }

  /**
   * Resolves the assigned trainer and their verified Zoom host account for a class.
   * Never silently schedules every meeting under SuperAdmin unless fallback is explicitly configured.
   */
  public static async resolveHostForClass(
    tenantId: string,
    classId: string,
    options?: { allowFallback?: boolean }
  ): Promise<ResolvedHostResult> {
    const cls = await ClassModel.findOne({
      _id: new Types.ObjectId(classId),
      tenantId: new Types.ObjectId(tenantId)
    });
    if (!cls) {
      throw new NotFoundError('Canonical Class not found');
    }

    // 1. Resolve assigned trainer: direct class instructor takes precedence over batch instructor
    let assignedTrainerId = cls.instructorId ? cls.instructorId.toString() : null;
    let batchName: string | undefined;

    if (!assignedTrainerId && cls.batchId) {
      const batch = await BatchModel.findOne({
        _id: cls.batchId,
        tenantId: new Types.ObjectId(tenantId)
      });
      if (batch?.instructorId) {
        assignedTrainerId = batch.instructorId.toString();
        batchName = batch.name;
      }
    }

    const connection = await IntegrationConnectionModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      provider: 'ZOOM',
      status: 'CONNECTED'
    });

    const isFallbackAllowed = Boolean(
      options?.allowFallback ||
      connection?.metadata?.allowAdminFallbackHost ||
      (options?.allowFallback !== false && this.deterministicAdaptersEnabled())
    );

    // If no trainer is assigned anywhere on class or batch:
    if (!assignedTrainerId) {
      if (isFallbackAllowed && connection?.externalAccountId) {
        return {
          hostExternalUserId: connection.externalAccountId,
          hostEmail: connection.metadata?.accountEmail || 'admin-host@institute.zoom',
          trainerUserId: null,
          isFallback: true,
          warning: 'NO_ASSIGNED_TRAINER: Scheduled under institute admin fallback host'
        };
      }
      throw new BadRequestError(
        'No trainer is assigned to this online class or its batch. Please assign an instructor with a verified Zoom host account.'
      );
    }

    // 2. Validate trainer membership and active status
    const trainerUser = await UserModel.findOne({
      _id: new Types.ObjectId(assignedTrainerId),
      tenantId: new Types.ObjectId(tenantId)
    });
    if (!trainerUser || trainerUser.status !== 'ACTIVE') {
      if (isFallbackAllowed && connection?.externalAccountId) {
        return {
          hostExternalUserId: connection.externalAccountId,
          hostEmail: connection.metadata?.accountEmail || 'admin-host@institute.zoom',
          trainerUserId: assignedTrainerId,
          trainerName: trainerUser?.name,
          isFallback: true,
          warning: 'TRAINER_INACTIVE: Scheduled under institute admin fallback host'
        };
      }
      throw new BadRequestError(`Assigned trainer (${trainerUser?.name || assignedTrainerId}) account is not active`);
    }

    const membership = await OrganizationMemberModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(assignedTrainerId),
      status: 'ACTIVE'
    });
    if (!membership) {
      if (isFallbackAllowed && connection?.externalAccountId) {
        return {
          hostExternalUserId: connection.externalAccountId,
          hostEmail: connection.metadata?.accountEmail || 'admin-host@institute.zoom',
          trainerUserId: assignedTrainerId,
          trainerName: trainerUser.name,
          isFallback: true,
          warning: 'TRAINER_NOT_MEMBER: Scheduled under institute admin fallback host'
        };
      }
      throw new ForbiddenError(`Assigned trainer (${trainerUser.name}) does not have active membership in this organization`);
    }

    // 3. Resolve trainer's verified Zoom account mapping
    const mapping = await TrainerZoomAccountModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(assignedTrainerId)
    });

    if (!mapping) {
      if (isFallbackAllowed && connection?.externalAccountId) {
        return {
          hostExternalUserId: connection.externalAccountId,
          hostEmail: connection.metadata?.accountEmail || 'admin-host@institute.zoom',
          trainerUserId: assignedTrainerId,
          trainerName: trainerUser.name,
          isFallback: true,
          warning: `TRAINER_ZOOM_NOT_MAPPED: Trainer "${trainerUser.name}" has no Zoom mapping; used institute admin fallback host`
        };
      }
      throw new BadRequestError(
        `Assigned trainer "${trainerUser.name}" does not have a mapped Zoom host account. Please map a licensed Zoom account in Admin Settings → Integrations → Zoom Hosts.`
      );
    }

    // 4. Validate host eligibility
    if (!mapping.isHostEligible) {
      if (isFallbackAllowed && connection?.externalAccountId) {
        return {
          hostExternalUserId: connection.externalAccountId,
          hostEmail: connection.metadata?.accountEmail || 'admin-host@institute.zoom',
          trainerUserId: assignedTrainerId,
          trainerName: trainerUser.name,
          isFallback: true,
          warning: `TRAINER_ZOOM_INELIGIBLE: Trainer "${trainerUser.name}" is ineligible (${mapping.ineligibilityReason}); used institute admin fallback host`
        };
      }
      throw new ConflictError(
        `Trainer "${trainerUser.name}" cannot host Zoom meetings: ${mapping.ineligibilityReason || 'INELIGIBLE_HOST'}. An active Licensed Zoom host account is required.`
      );
    }

    // 5. Host scheduling conflict check: does trainer have overlapping class meeting?
    const start = cls.scheduledStartAt || cls.startDate;
    const end = cls.scheduledEndAt || cls.endDate;
    let hasConflict = false;
    let conflictDetails: string | undefined;

    if (start && end) {
      const conflictQuery = ClassModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        instructorId: new Types.ObjectId(assignedTrainerId),
        _id: { $ne: cls._id },
        status: { $ne: 'CANCELLED' },
        scheduledStartAt: { $lt: end },
        scheduledEndAt: { $gt: start }
      });
      const conflictClass: any = typeof conflictQuery?.select === 'function'
        ? await conflictQuery.select('name scheduledStartAt scheduledEndAt').lean()
        : await conflictQuery;

      if (conflictClass) {
        hasConflict = true;
        conflictDetails = `Trainer "${trainerUser.name}" already has an overlapping class "${conflictClass.name}" from ${conflictClass.scheduledStartAt?.toISOString?.() || conflictClass.scheduledStartAt} to ${conflictClass.scheduledEndAt?.toISOString?.() || conflictClass.scheduledEndAt}`;
      }
    }

    return {
      hostExternalUserId: mapping.zoomUserId,
      hostEmail: mapping.zoomEmail,
      trainerUserId: assignedTrainerId,
      trainerName: trainerUser.name,
      isFallback: false,
      hasConflict,
      conflictDetails
    };
  }

  /**
   * Reassigns class trainer and updates/replaces external live meeting if necessary.
   */
  public static async reassignClassTrainerMeeting(
    tenantId: string,
    classId: string,
    newTrainerUserId: string,
    actor: BranchActor
  ): Promise<{ classId: string; newTrainerUserId: string; hostExternalUserId: string }> {
    return BranchAccessService.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const cls = await ClassModel.findOne({
        _id: new Types.ObjectId(classId),
        tenantId: new Types.ObjectId(tenantId)
      });
      if (!cls) throw new NotFoundError('Class not found');

      // Update class instructor
      const previousInstructorId = cls.instructorId?.toString();
      cls.instructorId = new Types.ObjectId(newTrainerUserId);
      await cls.save();

      // Check if external meeting exists
      const externalMeeting = await ExternalMeetingModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        classId: cls._id
      });

      if (!externalMeeting || externalMeeting.provider !== 'ZOOM') {
        return { classId, newTrainerUserId, hostExternalUserId: '' };
      }

      // Resolve host for newly assigned trainer
      const hostResult = await this.resolveHostForClass(tenantId, classId);

      // Retire old meeting association in history
      await LiveMeetingAssociationHistoryModel.updateMany(
        {
          tenantId: new Types.ObjectId(tenantId),
          classId: cls._id,
          status: 'ACTIVE'
        },
        {
          $set: {
            status: 'RETIRED',
            retiredAt: new Date(),
            retirementReason: `REASSIGNED_TRAINER_FROM_${previousInstructorId}_TO_${newTrainerUserId}`
          }
        }
      );

      // Cancel old meeting on provider to avoid orphan
      const connection = await IntegrationConnectionModel.findOne({
        _id: externalMeeting.connectionId,
        tenantId: new Types.ObjectId(tenantId)
      });
      if (connection) {
        try {
          const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM');
          await providerAdapter.cancelMeeting(connection, externalMeeting.externalMeetingId, 'Trainer reassigned');
        } catch {
          // Tolerant to offline provider during cancel
        }
      }

      // Recreate meeting under new trainer
      const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM');
      const newMeetingResult = await providerAdapter.createMeeting(connection!, {
        tenantId,
        branchId: cls.branchId?.toString(),
        classId: cls._id.toString(),
        topic: cls.name,
        startTime: cls.scheduledStartAt || cls.startDate || new Date(),
        endTime: cls.scheduledEndAt || cls.endDate || new Date(),
        timezone: cls.timezone || 'UTC',
        organizerUserId: actor.userId,
        hostExternalUserId: hostResult.hostExternalUserId,
        hostEmail: hostResult.hostEmail,
        autoRecord: cls.zoomDetails?.autoRecord || false
      });

      externalMeeting.externalMeetingId = newMeetingResult.externalMeetingId;
      externalMeeting.joinUrl = newMeetingResult.joinUrl;
      externalMeeting.hostUrl = newMeetingResult.hostUrl || newMeetingResult.joinUrl;
      externalMeeting.providerStatus = newMeetingResult.providerStatus;
      externalMeeting.metadata = {
        ...(externalMeeting.metadata || {}),
        hostTrainerUserId: newTrainerUserId,
        hostExternalUserId: hostResult.hostExternalUserId,
        hostEmail: hostResult.hostEmail,
        isFallback: hostResult.isFallback
      };
      await externalMeeting.save();

      cls.zoomDetails = {
        meetingUrl: newMeetingResult.joinUrl,
        meetingId: newMeetingResult.externalMeetingId,
        passcode: newMeetingResult.password || '',
        hostUrl: newMeetingResult.hostUrl || '',
        instructions: cls.zoomDetails?.instructions || 'Please join on time via Zoom.',
        autoRecord: cls.zoomDetails?.autoRecord || false
      };
      await cls.save();

      await LiveMeetingAssociationHistoryModel.create({
        tenantId: new Types.ObjectId(tenantId),
        classId: cls._id,
        provider: 'ZOOM',
        externalMeetingId: newMeetingResult.externalMeetingId,
        connectionId: connection!._id,
        joinUrl: newMeetingResult.joinUrl,
        actorId: new Types.ObjectId(actor.userId),
        status: 'ACTIVE',
        activatedAt: new Date()
      });

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'CLASS_TRAINER_REASSIGNED',
        resource: 'Class',
        resourceId: classId,
        metadata: {
          previousInstructorId,
          newTrainerUserId,
          newMeetingId: newMeetingResult.externalMeetingId,
          hostExternalUserId: hostResult.hostExternalUserId
        }
      });

      return { classId, newTrainerUserId, hostExternalUserId: hostResult.hostExternalUserId };
    });
  }

  /**
   * List all trainer Zoom account mappings for tenant.
   */
  public static async listTrainerZoomAccounts(
    tenantId: string,
    actor: BranchActor
  ): Promise<ITrainerZoomAccountDTO[]> {
    return BranchAccessService.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const mappings = await TrainerZoomAccountModel.find({
        tenantId: new Types.ObjectId(tenantId)
      }).lean();

      const userIds = mappings.map((m) => m.userId);
      const users = await UserModel.find({
        _id: { $in: userIds },
        tenantId: new Types.ObjectId(tenantId)
      }).select('name email').lean();
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      return mappings.map((m) => this.toDTO(m as any, userMap.get(m.userId.toString())));
    });
  }

  /**
   * Unmaps a trainer's Zoom account.
   */
  public static async deleteTrainerZoomAccount(
    tenantId: string,
    trainerUserId: string,
    actor: BranchActor
  ): Promise<boolean> {
    return BranchAccessService.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const result = await TrainerZoomAccountModel.deleteOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(trainerUserId)
      });

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'TRAINER_ZOOM_ACCOUNT_UNMAPPED',
        resource: 'TrainerZoomAccount',
        resourceId: trainerUserId,
        metadata: { trainerUserId }
      });

      return result.deletedCount > 0;
    });
  }

  /**
   * Returns currently logged-in instructor's Zoom host account details.
   */
  public static async getTrainerZoomAccountForUser(
    tenantId: string,
    userId: string
  ): Promise<ITrainerZoomAccountDTO | null> {
    const mapping = await TrainerZoomAccountModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId)
    });
    if (!mapping) return null;
    const user = await UserModel.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId)
    }).select('name email');
    return this.toDTO(mapping, user);
  }
}
