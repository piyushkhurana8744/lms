import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { TrainerZoomAccountService } from '../integrations/orchestration/trainerZoomAccount.service';
import {
  TrainerZoomAccountModel,
  UserModel,
  OrganizationMemberModel,
  ClassModel,
  BatchModel,
  IntegrationConnectionModel
} from '@edtech/database';
import { BranchAccessService } from '../branchAccess.service';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';

vi.mock('@edtech/database', () => ({
  TrainerZoomAccountModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn()
  },
  UserModel: {
    findOne: vi.fn(),
    find: vi.fn()
  },
  OrganizationMemberModel: {
    findOne: vi.fn()
  },
  ClassModel: {
    findOne: vi.fn(),
    find: vi.fn()
  },
  BatchModel: {
    findOne: vi.fn()
  },
  IntegrationConnectionModel: {
    findOne: vi.fn()
  },
  ExternalMeetingModel: {
    findOne: vi.fn()
  },
  LiveMeetingAssociationHistoryModel: {
    updateMany: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../branchAccess.service', () => ({
  BranchAccessService: {
    executeWithVerifiedTenantAuthority: vi.fn((_tenantId, _actor, fn) => fn())
  }
}));

vi.mock('../audit.service', () => ({
  AuditService: {
    logEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('TrainerZoomAccountService Unit Tests', () => {
  const tenantId = new Types.ObjectId().toString();
  const trainerId = new Types.ObjectId().toString();
  const classId = new Types.ObjectId().toString();
  const batchId = new Types.ObjectId().toString();

  const mockActor = {
    userId: new Types.ObjectId().toString(),
    roles: ['TENANT_ADMIN'],
    isHqActor: false,
    isSuperAdmin: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapTrainerZoomAccount', () => {
    it('successfully maps a Licensed Zoom user to an active LMS instructor', async () => {
      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        name: 'Rahul Trainer',
        email: 'rahul@didm.in',
        status: 'ACTIVE',
        isSuperAdmin: false
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(trainerId),
        role: 'INSTRUCTOR',
        status: 'ACTIVE'
      });

      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED',
        externalTenantId: 'zoom_account_alpha'
      });

      const mockZoomAdapter = {
        getZoomUser: vi.fn().mockResolvedValue({
          id: 'zoom_u123',
          email: 'rahul@didm.in',
          type: 2, // Licensed
          status: 'active',
          account_id: 'zoom_account_alpha'
        })
      };
      vi.spyOn(IntegrationProviderRegistry, 'getLiveMeetingProvider').mockReturnValue(mockZoomAdapter as any);

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue(null);
      (TrainerZoomAccountModel.findOneAndUpdate as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(trainerId),
        zoomAccountId: 'zoom_account_alpha',
        zoomUserId: 'zoom_u123',
        zoomEmail: 'rahul@didm.in',
        accountMembershipStatus: 'ACTIVE',
        licenseType: 'LICENSED',
        isHostEligible: true,
        ineligibilityReason: null,
        lastSyncedAt: new Date(),
        metadata: { trainerName: 'Rahul Trainer' }
      });

      const result = await TrainerZoomAccountService.mapTrainerZoomAccount(
        tenantId,
        trainerId,
        'rahul@didm.in',
        mockActor
      );

      expect(result.zoomUserId).toBe('zoom_u123');
      expect(result.licenseType).toBe('LICENSED');
      expect(result.isHostEligible).toBe(true);
      expect(result.ineligibilityReason).toBeNull();
    });

    it('rejects mapping when Zoom user has a Basic (free) license', async () => {
      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        name: 'Amit Free',
        email: 'amit@didm.in',
        status: 'ACTIVE',
        isSuperAdmin: false
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(trainerId),
        role: 'INSTRUCTOR',
        status: 'ACTIVE'
      });

      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED',
        externalTenantId: 'zoom_account_alpha'
      });

      const mockZoomAdapter = {
        getZoomUser: vi.fn().mockResolvedValue({
          id: 'zoom_u_basic',
          email: 'amit@didm.in',
          type: 1, // Basic (Free)
          status: 'active',
          account_id: 'zoom_account_alpha'
        })
      };
      vi.spyOn(IntegrationProviderRegistry, 'getLiveMeetingProvider').mockReturnValue(mockZoomAdapter as any);

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue(null);
      (TrainerZoomAccountModel.findOneAndUpdate as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(trainerId),
        zoomAccountId: 'zoom_account_alpha',
        zoomUserId: 'zoom_u_basic',
        zoomEmail: 'amit@didm.in',
        accountMembershipStatus: 'ACTIVE',
        licenseType: 'BASIC',
        isHostEligible: false,
        ineligibilityReason: 'BASIC_UNLICENSED_USER',
        lastSyncedAt: new Date()
      });

      const result = await TrainerZoomAccountService.mapTrainerZoomAccount(
        tenantId,
        trainerId,
        'amit@didm.in',
        mockActor
      );

      expect(result.licenseType).toBe('BASIC');
      expect(result.isHostEligible).toBe(false);
      expect(result.ineligibilityReason).toBe('BASIC_UNLICENSED_USER');
    });

    it('rejects mapping when the Zoom user belongs to an external foreign Zoom account', async () => {
      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        status: 'ACTIVE',
        isSuperAdmin: false
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(trainerId),
        role: 'INSTRUCTOR',
        status: 'ACTIVE'
      });

      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED',
        externalTenantId: 'institute_zoom_account_1'
      });

      const mockZoomAdapter = {
        getZoomUser: vi.fn().mockResolvedValue({
          id: 'zoom_foreign',
          email: 'hacker@other.com',
          type: 2,
          status: 'active',
          account_id: 'DIFFERENT_FOREIGN_ACCOUNT_99'
        })
      };
      vi.spyOn(IntegrationProviderRegistry, 'getLiveMeetingProvider').mockReturnValue(mockZoomAdapter as any);

      await expect(
        TrainerZoomAccountService.mapTrainerZoomAccount(
          tenantId,
          trainerId,
          'hacker@other.com',
          mockActor
        )
      ).rejects.toThrow(/different Zoom account/);
    });
  });

  describe('resolveHostForClass', () => {
    it('resolves specifically assigned class instructor over batch instructor', async () => {
      const classInstructorId = new Types.ObjectId().toString();
      const batchInstructorId = new Types.ObjectId().toString();

      (ClassModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(classId),
        instructorId: new Types.ObjectId(classInstructorId), // Class override
        batchId: new Types.ObjectId(batchId),
        scheduledStartAt: new Date(Date.now() + 3600000),
        scheduledEndAt: new Date(Date.now() + 7200000)
      });

      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(classInstructorId),
        name: 'Specific Class Trainer',
        status: 'ACTIVE'
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        status: 'ACTIVE'
      });

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(classInstructorId),
        zoomUserId: 'zoom_specific_trainer',
        zoomEmail: 'specific@didm.in',
        isHostEligible: true
      });

      const host = await TrainerZoomAccountService.resolveHostForClass(tenantId, classId);

      expect(host.hostExternalUserId).toBe('zoom_specific_trainer');
      expect(host.trainerUserId).toBe(classInstructorId);
      expect(host.isFallback).toBe(false);
    });

    it('falls back to batch instructor when class has no direct instructorId', async () => {
      const batchInstructorId = new Types.ObjectId().toString();

      (ClassModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(classId),
        instructorId: null, // No class override
        batchId: new Types.ObjectId(batchId),
        scheduledStartAt: new Date(Date.now() + 3600000),
        scheduledEndAt: new Date(Date.now() + 7200000)
      });

      (BatchModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(batchId),
        instructorId: new Types.ObjectId(batchInstructorId),
        name: 'Batch 101'
      });

      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(batchInstructorId),
        name: 'Batch Master Trainer',
        status: 'ACTIVE'
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        status: 'ACTIVE'
      });

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(batchInstructorId),
        zoomUserId: 'zoom_batch_trainer',
        zoomEmail: 'batch_trainer@didm.in',
        isHostEligible: true
      });

      const host = await TrainerZoomAccountService.resolveHostForClass(tenantId, classId);

      expect(host.hostExternalUserId).toBe('zoom_batch_trainer');
      expect(host.trainerUserId).toBe(batchInstructorId);
      expect(host.isFallback).toBe(false);
    });

    it('fails clearly when assigned trainer has no mapped Zoom host account', async () => {
      (ClassModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(classId),
        instructorId: new Types.ObjectId(trainerId),
        batchId: null
      });

      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        name: 'Unmapped Trainer',
        status: 'ACTIVE'
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        status: 'ACTIVE'
      });

      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED',
        metadata: { allowAdminFallbackHost: false }
      });

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue(null);

      await expect(
        TrainerZoomAccountService.resolveHostForClass(tenantId, classId, {
          allowFallback: false
        })
      ).rejects.toThrow(/does not have a mapped Zoom host account/);
    });

    it('detects and flags host scheduling conflicts when trainer has overlapping classes', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 7200000);

      (ClassModel.findOne as any).mockImplementation((query: any) => {
        if (query._id?.toString() === classId) {
          return Promise.resolve({
            _id: new Types.ObjectId(classId),
            instructorId: new Types.ObjectId(trainerId),
            scheduledStartAt: start,
            scheduledEndAt: end
          });
        }
        // Conflict query
        return Promise.resolve({
          _id: new Types.ObjectId(),
          name: 'Concurrent SEO Class',
          scheduledStartAt: start,
          scheduledEndAt: end
        });
      });

      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        name: 'Rahul Trainer',
        status: 'ACTIVE'
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        status: 'ACTIVE'
      });

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(trainerId),
        zoomUserId: 'zoom_u123',
        zoomEmail: 'rahul@didm.in',
        isHostEligible: true
      });

      const host = await TrainerZoomAccountService.resolveHostForClass(tenantId, classId);

      expect(host.hasConflict).toBe(true);
      expect(host.conflictDetails).toContain('Concurrent SEO Class');
    });

    it('rejects meeting creation when trainer is ineligible due to basic account', async () => {
      (ClassModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(classId),
        instructorId: new Types.ObjectId(trainerId)
      });

      (UserModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(trainerId),
        name: 'Basic Trainer',
        status: 'ACTIVE'
      });

      (OrganizationMemberModel.findOne as any).mockResolvedValue({
        status: 'ACTIVE'
      });

      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED',
        metadata: { allowAdminFallbackHost: false }
      });

      (TrainerZoomAccountModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(trainerId),
        zoomUserId: 'zoom_basic_id',
        zoomEmail: 'basic@didm.in',
        isHostEligible: false,
        ineligibilityReason: 'BASIC_UNLICENSED_USER'
      });

      await expect(
        TrainerZoomAccountService.resolveHostForClass(tenantId, classId, {
          allowFallback: false
        })
      ).rejects.toThrow(/BASIC_UNLICENSED_USER/);
    });
  });

  describe('syncAllTrainersZoomStatus', () => {
    it('synchronizes all mapped trainer Zoom accounts and computes eligible count', async () => {
      (IntegrationConnectionModel.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        provider: 'ZOOM',
        status: 'CONNECTED'
      });

      const mockDoc1 = {
        userId: new Types.ObjectId(),
        zoomUserId: 'u1',
        isHostEligible: false,
        licenseType: 'BASIC',
        accountMembershipStatus: 'ACTIVE',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockDoc2 = {
        userId: new Types.ObjectId(),
        zoomUserId: 'u2',
        isHostEligible: true,
        licenseType: 'LICENSED',
        accountMembershipStatus: 'ACTIVE',
        save: vi.fn().mockResolvedValue(true)
      };

      (TrainerZoomAccountModel.find as any).mockResolvedValue([mockDoc1, mockDoc2]);

      const mockZoomAdapter = {
        getZoomUser: vi.fn().mockImplementation((_conn, id) => {
          if (id === 'u1') return Promise.resolve({ id: 'u1', type: 2, status: 'active' }); // Now upgraded to Licensed
          return Promise.resolve({ id: 'u2', type: 2, status: 'active' });
        })
      };
      vi.spyOn(IntegrationProviderRegistry, 'getLiveMeetingProvider').mockReturnValue(mockZoomAdapter as any);

      const result = await TrainerZoomAccountService.syncAllTrainersZoomStatus(tenantId, mockActor);

      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.eligible).toBe(2);
      expect(result.ineligible).toBe(0);
      expect(mockDoc1.licenseType).toBe('LICENSED');
      expect(mockDoc1.isHostEligible).toBe(true);
    });
  });
});
