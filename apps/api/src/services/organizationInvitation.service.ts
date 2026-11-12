import crypto from 'crypto';
import { hashPassword, tenantContextStorage } from '@edtech/utils';
import {
  OrganizationInvitationModel,
  OrganizationMemberModel,
  UserModel,
  TenantModel,
  runInTransaction
} from '@edtech/database';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError, ConflictError } from '../errors/appError';

export class OrganizationInvitationService {
  /**
   * Hashes a raw invitation token into SHA-256 format.
   */
  private static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Resolves invitation details using a raw invitation token string.
   */
  public static async getInvitationByToken(rawToken: string) {
    if (!rawToken || rawToken.trim() === '') {
      throw new BadRequestError('Invitation token is required');
    }

    const tokenHash = this.hashToken(rawToken);
    const invitation = await OrganizationInvitationModel.findOne({ tokenHash });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new NotFoundError('Invalid, accepted, or revoked invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new BadRequestError('Invitation token has expired');
    }

    const tenant = await TenantModel.findById(invitation.tenantId).select('name slug logoUrl').lean();

    return {
      id: invitation._id.toString(),
      tenantId: invitation.tenantId.toString(),
      organizationName: tenant?.name || 'Organization',
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      status: invitation.status
    };
  }

  /**
   * Accepts an invitation token, creating or linking the user and activating membership.
   * Enforces atomic transactional completion, tenant/role immutability from persisted record,
   * tenant-scoped user and membership creation, and concurrency protection.
   */
  public static async acceptInvitation(
    rawToken: string,
    payload: { name?: string; password?: string }
  ) {
    if (!rawToken || rawToken.trim() === '') {
      throw new BadRequestError('Invitation token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    // Check if invitation exists or is already expired before transaction
    const existing = await OrganizationInvitationModel.findOne({ tokenHash });
    if (!existing) {
      throw new NotFoundError('Invalid, accepted, or revoked invitation token');
    }
    if (existing.status === 'PENDING' && existing.expiresAt <= new Date()) {
      await OrganizationInvitationModel.updateOne(
        { _id: existing._id, status: 'PENDING' },
        { $set: { status: 'EXPIRED' } }
      );
      throw new BadRequestError('Invitation token has expired');
    }
    if (existing.status !== 'PENDING') {
      throw new NotFoundError('Invalid, accepted, or revoked invitation token');
    }

    const tenant = await TenantModel.findById(existing.tenantId).select('status').lean();
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new BadRequestError('Tenant organization is inactive or not found');
    }

    return await runInTransaction(async (session) => {
      // Atomic single-use claim in transaction: only transition if PENDING and not expired
      const invitation = await OrganizationInvitationModel.findOneAndUpdate(
        {
          _id: existing._id,
          tokenHash,
          status: 'PENDING',
          expiresAt: { $gt: new Date() }
        },
        {
          $set: {
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        },
        { new: true, session }
      );

      if (!invitation) {
        throw new NotFoundError('Invalid, accepted, or revoked invitation token');
      }

      // Role and tenantId are derived strictly from persisted invitation record (immutable from token)
      const tenantId = invitation.tenantId.toString();
      const assignedRole = invitation.role;

      return await tenantContextStorage.run(
        {
          currentTenantId: tenantId,
          currentUserId: 'invitation-accept',
          isPlatformContext: false,
          allowedTenantIds: [tenantId]
        },
        async () => {
          let user: any = await UserModel.findOne({ email: invitation.email }).session(session);

          if (!user) {
            if (!payload.password || payload.password.length < 8) {
              throw new BadRequestError('Password of at least 8 characters is required for new accounts');
            }
            const passwordHash = await hashPassword(payload.password);
            const created = await UserModel.create([{
              tenantId: invitation.tenantId,
              allowedTenantIds: [invitation.tenantId],
              name: payload.name?.trim() || invitation.email.split('@')[0],
              email: invitation.email,
              passwordHash,
              status: 'ACTIVE',
              emailVerified: true,
              isSuperAdmin: false,
              roles: []
            }], { session });
            user = created[0];
          } else {
            user.status = 'ACTIVE';
            user.emailVerified = true;
            if (!user.allowedTenantIds.some((id: any) => id.toString() === tenantId)) {
              user.allowedTenantIds.push(invitation.tenantId);
            }
            await user.save({ session });
          }

          // Activate membership record with immutable role from invitation record
          const member = await OrganizationMemberModel.findOneAndUpdate(
            { tenantId: invitation.tenantId, userId: user._id },
            {
              $set: {
                userId: user._id,
                role: assignedRole,
                status: 'ACTIVE',
                joinedAt: new Date()
              }
            },
            { upsert: true, new: true, session }
          );

          await AuditService.logEvent({
            actorId: user._id.toString(),
            tenantId,
            action: 'organization.member.invitation_accepted',
            resource: 'OrganizationMember',
            resourceId: member._id.toString(),
            metadata: {
              email: invitation.email,
              role: assignedRole
            },
            session
          });

          return {
            success: true,
            message: 'Invitation accepted successfully. You are now an active team member.',
            memberId: member._id.toString(),
            role: member.role,
            tenantId
          };
        }
      );
    });
  }
}
