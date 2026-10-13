import { Types } from 'mongoose';
import {
  UserModel,
  OrganizationMemberModel,
  StudentLifecycleModel,
  EnrollmentModel,
  BatchModel,
  BranchModel
} from '@edtech/database';
import { CommunicationAudienceType, ICommunicationAudienceCriteria } from '@edtech/types';
import { BranchAccessService, BranchActor } from '../branchAccess.service';
import { BadRequestError, NotFoundError } from '../../errors/appError';

export interface AudienceActor extends BranchActor {
  roles?: string[];
  permissions?: string[];
}

export class CommunicationAudienceService {
  /**
   * Resolves the list of unique eligible recipient User IDs for an announcement.
   * Excludes inactive/suspended users and respects tenant isolation and branch authorization.
   */
  public static async resolveAudienceRecipients(
    tenantId: string,
    actor: AudienceActor,
    audienceType: CommunicationAudienceType,
    criteria?: ICommunicationAudienceCriteria,
    announcementBranchId?: string
  ): Promise<{ recipientUserIds: Types.ObjectId[]; recipientCount: number }> {
    const tId = new Types.ObjectId(tenantId);
    const userScope = await BranchAccessService.getScope(tenantId, actor);

    // Resolve effective branch IDs authorized for this actor
    let authorizedBranchObjectIds: Types.ObjectId[] = [];
    if (userScope.mode === 'ALL') {
      const allActiveBranches = await BranchModel.find({ tenantId: tId, status: 'ACTIVE' }).select('_id').lean();
      authorizedBranchObjectIds = allActiveBranches.map((b) => b._id as Types.ObjectId);
    } else {
      authorizedBranchObjectIds = userScope.branchIds.map((id) => new Types.ObjectId(id));
    }

    // If announcement is branch-scoped, verify actor's access
    if (announcementBranchId) {
      if (!Types.ObjectId.isValid(announcementBranchId)) {
        throw new NotFoundError('Branch not found');
      }
      if (userScope.mode !== 'ALL' && !userScope.branchIds.includes(announcementBranchId)) {
        throw new NotFoundError('Branch not found');
      }
      authorizedBranchObjectIds = [new Types.ObjectId(announcementBranchId)];
    }

    const recipientSet = new Set<string>();

    switch (audienceType) {
      case 'ALL_AUTHORIZED': {
        // All active students and members in authorized branches
        const [students, members] = await Promise.all([
          StudentLifecycleModel.find({
            tenantId: tId,
            currentBranchId: { $in: authorizedBranchObjectIds },
            currentStatus: { $in: ['ENROLLED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] }
          }).select('studentUserId').lean(),
          OrganizationMemberModel.find({
            tenantId: tId,
            status: 'ACTIVE',
            $or: [
              { branchAccessMode: 'ALL' },
              { branchIds: { $in: authorizedBranchObjectIds } }
            ]
          }).select('userId').lean()
        ]);

        students.forEach((s) => recipientSet.add(s.studentUserId.toString()));
        members.forEach((m) => recipientSet.add(m.userId.toString()));
        break;
      }

      case 'BRANCH': {
        const targetBranchIds = (criteria?.branchIds && criteria.branchIds.length > 0)
          ? criteria.branchIds
              .filter((id) => userScope.mode === 'ALL' || userScope.branchIds.includes(id))
              .map((id) => new Types.ObjectId(id))
          : authorizedBranchObjectIds;

        if (targetBranchIds.length === 0) {
          throw new BadRequestError('No authorized target branches specified');
        }

        const [students, members] = await Promise.all([
          StudentLifecycleModel.find({
            tenantId: tId,
            currentBranchId: { $in: targetBranchIds },
            currentStatus: { $in: ['ENROLLED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] }
          }).select('studentUserId').lean(),
          OrganizationMemberModel.find({
            tenantId: tId,
            status: 'ACTIVE',
            branchIds: { $in: targetBranchIds }
          }).select('userId').lean()
        ]);

        students.forEach((s) => recipientSet.add(s.studentUserId.toString()));
        members.forEach((m) => recipientSet.add(m.userId.toString()));
        break;
      }

      case 'BATCH': {
        const batchIds = (criteria?.batchIds || []).map((id) => new Types.ObjectId(id));
        if (batchIds.length === 0) throw new BadRequestError('At least one batch ID is required');

        // Verify batches belong to tenant and authorized branches
        const batches = await BatchModel.find({
          _id: { $in: batchIds },
          tenantId: tId,
          ...(userScope.mode !== 'ALL' ? { branchId: { $in: authorizedBranchObjectIds } } : {})
        }).select('_id instructorId').lean();

        const validBatchIds = batches.map((b) => b._id);
        const [students, batchInstructors] = await Promise.all([
          StudentLifecycleModel.find({
            tenantId: tId,
            currentBatchId: { $in: validBatchIds },
            currentStatus: { $in: ['ENROLLED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] }
          }).select('studentUserId').lean(),
          batches.filter((b) => b.instructorId).map((b) => b.instructorId!.toString())
        ]);

        students.forEach((s) => recipientSet.add(s.studentUserId.toString()));
        batchInstructors.forEach((id) => recipientSet.add(id));
        break;
      }

      case 'COURSE': {
        const courseIds = (criteria?.courseIds || []).map((id) => new Types.ObjectId(id));
        if (courseIds.length === 0) throw new BadRequestError('At least one course ID is required');

        const enrollments = await EnrollmentModel.find({
          tenantId: tId,
          courseId: { $in: courseIds },
          status: { $in: ['ACTIVE', 'COMPLETED'] }
        }).select('studentId').lean();

        enrollments.forEach((e) => recipientSet.add(e.studentId.toString()));
        break;
      }

      case 'STUDENTS': {
        const students = await StudentLifecycleModel.find({
          tenantId: tId,
          currentBranchId: { $in: authorizedBranchObjectIds },
          currentStatus: { $in: ['ENROLLED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] }
        }).select('studentUserId').lean();

        students.forEach((s) => recipientSet.add(s.studentUserId.toString()));
        break;
      }

      case 'INSTRUCTORS': {
        const instructors = await OrganizationMemberModel.find({
          tenantId: tId,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          $or: [
            { branchAccessMode: 'ALL' },
            { branchIds: { $in: authorizedBranchObjectIds } }
          ]
        }).select('userId').lean();

        instructors.forEach((i) => recipientSet.add(i.userId.toString()));
        break;
      }

      case 'STAFF': {
        const staff = await OrganizationMemberModel.find({
          tenantId: tId,
          role: { $in: ['TENANT_ADMIN', 'BRANCH_MANAGER', 'STAFF', 'FINANCE', 'ADMISSION_COUNSELOR'] },
          status: 'ACTIVE',
          $or: [
            { branchAccessMode: 'ALL' },
            { branchIds: { $in: authorizedBranchObjectIds } }
          ]
        }).select('userId').lean();

        staff.forEach((s) => recipientSet.add(s.userId.toString()));
        break;
      }

      case 'SPECIFIC_USERS': {
        const userIds = (criteria?.userIds || []).map((id) => new Types.ObjectId(id));
        if (userIds.length === 0) throw new BadRequestError('At least one user ID is required');

        const validUsers = await UserModel.find({
          _id: { $in: userIds },
          tenantId: tId,
          status: 'ACTIVE'
        }).select('_id').lean();

        validUsers.forEach((u) => recipientSet.add(u._id.toString()));
        break;
      }

      default:
        throw new BadRequestError(`Unsupported audience type: ${audienceType}`);
    }

    if (recipientSet.size === 0) {
      return { recipientUserIds: [], recipientCount: 0 };
    }

    // Filter by active UserModel status to ensure no suspended users receive messages
    const activeRecipients = await UserModel.find({
      _id: { $in: Array.from(recipientSet).map((id) => new Types.ObjectId(id)) },
      tenantId: tId,
      status: 'ACTIVE'
    }).select('_id').lean();

    const recipientUserIds = activeRecipients.map((u) => u._id as Types.ObjectId);

    return {
      recipientUserIds,
      recipientCount: recipientUserIds.length
    };
  }
}
