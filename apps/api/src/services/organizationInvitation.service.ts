import crypto from 'crypto';
import { hashPassword } from '@edtech/utils';
import {
  OrganizationInvitationModel,
  OrganizationMemberModel,
  UserModel,
  TenantModel
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
   */
  public static async acceptInvitation(
    rawToken: string,
    payload: { name?: string; password?: string }
  ) {
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

    const tenantId = invitation.tenantId.toString();

    // Check existing user or create new user
    let user = await UserModel.findOne({ email: invitation.email });

    if (!user) {
      if (!payload.password || payload.password.length < 8) {
        throw new BadRequestError('Password of at least 8 characters is required for new accounts');
      }
      const passwordHash = await hashPassword(payload.password);
      user = await UserModel.create({
        tenantId: invitation.tenantId,
        allowedTenantIds: [invitation.tenantId],
        name: payload.name?.trim() || invitation.email.split('@')[0],
        email: invitation.email,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: []
      });
    } else {
      user.status = 'ACTIVE';
      user.emailVerified = true;
      if (!user.allowedTenantIds.some((id) => id.toString() === tenantId)) {
        user.allowedTenantIds.push(invitation.tenantId);
      }
      await user.save();
    }

    // Mark invitation ACCEPTED (Single-Use Enforcement)
    invitation.status = 'ACCEPTED';
    await invitation.save();

    // Activate membership record
    const member = await OrganizationMemberModel.findOneAndUpdate(
      { tenantId: invitation.tenantId, userId: user._id },
      {
        tenantId: invitation.tenantId,
        userId: user._id,
        role: invitation.role,
        status: 'ACTIVE',
        joinedAt: new Date()
      },
      { upsert: true, new: true }
    );

    await AuditService.logEvent({
      actorId: user._id.toString(),
      tenantId,
      action: 'organization.member.invitation_accepted',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        email: invitation.email,
        role: invitation.role
      }
    });

    return {
      success: true,
      message: 'Invitation accepted successfully. You are now an active team member.',
      memberId: member._id.toString(),
      role: member.role,
      tenantId
    };
  }
}
