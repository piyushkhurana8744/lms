import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  OrganizationMemberModel,
  IOrganizationMemberDocument,
  OrganizationInvitationModel,
  IOrganizationInvitationDocument,
  UserModel,
  IUserDocument
} from '@edtech/database';
import {
  InviteOrganizationMemberSchema,
  CreateEmployeeMemberSchema,
  UpdateEmployeeMemberSchema,
  UpdateOrganizationMemberRoleSchema,
  UpdateOrganizationMemberStatusSchema,
  OrganizationMemberQuerySchema
} from '@edtech/validation';
import {
  IOrganizationMember,
  IOrganizationInvitation,
  TeamSummaryStats,
  OrganizationMemberRole,
  OrganizationMemberStatus
} from '@edtech/types';
import { getWorkspaceContext, hashPassword } from '@edtech/utils';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../errors/appError';

export class OrganizationMemberService {
  /**
   * Safe tenant resolver from WorkspaceContext.
   */
  private static getTenantId(): string {
    const { currentTenantId } = getWorkspaceContext();
    if (!currentTenantId || !Types.ObjectId.isValid(currentTenantId)) {
      throw new Error('Valid tenant context required');
    }
    return currentTenantId;
  }

  /**
   * Helper to format Mongoose document to clean IOrganizationMember object without secrets.
   */
  private static formatMember(doc: any): IOrganizationMember {
    const userDoc = doc.userId && typeof doc.userId === 'object' ? doc.userId : null;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: userDoc ? userDoc._id.toString() : doc.userId ? doc.userId.toString() : '',
      user: userDoc
        ? {
            id: userDoc._id.toString(),
            name: userDoc.name || 'Member',
            email: userDoc.email || '',
            phone: userDoc.phone || '',
            avatarUrl: userDoc.avatarUrl || '',
            status: userDoc.status || 'ACTIVE',
            lastLoginAt: userDoc.lastLoginAt
          }
        : undefined,
      role: doc.role as OrganizationMemberRole,
      status: doc.status as OrganizationMemberStatus,
      employeeDetails: doc.employeeDetails || undefined,
      joinedAt: doc.joinedAt,
      invitedAt: doc.invitedAt,
      invitedBy: doc.invitedBy ? doc.invitedBy.toString() : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Computes organizational team summary metrics.
   */
  public static async getTeamStats(tenantId: string): Promise<TeamSummaryStats> {
    const [totalMembers, adminsCount, instructorsCount, studentsCount, pendingInvitationsCount, suspendedCount] =
      await Promise.all([
        OrganizationMemberModel.countDocuments({ tenantId, status: { $ne: 'REMOVED' } }),
        OrganizationMemberModel.countDocuments({ tenantId, role: 'TENANT_ADMIN', status: { $ne: 'REMOVED' } }),
        OrganizationMemberModel.countDocuments({ tenantId, role: 'INSTRUCTOR', status: { $ne: 'REMOVED' } }),
        OrganizationMemberModel.countDocuments({ tenantId, role: 'STUDENT', status: { $ne: 'REMOVED' } }),
        OrganizationInvitationModel.countDocuments({ tenantId, status: 'PENDING', expiresAt: { $gt: new Date() } }),
        OrganizationMemberModel.countDocuments({ tenantId, status: 'SUSPENDED' })
      ]);

    return {
      totalMembers,
      adminsCount,
      instructorsCount,
      studentsCount,
      pendingInvitationsCount,
      suspendedCount
    };
  }

  /**
   * Lists organization members with search, filters, pagination, and summary stats.
   */
  public static async listMembers(queryPayload: unknown) {
    const tenantId = this.getTenantId();
    const query = OrganizationMemberQuerySchema.parse(queryPayload);

    const filter: any = { tenantId, status: { $ne: 'REMOVED' } };

    if (query.role && query.role !== 'ALL') {
      filter.role = query.role;
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    // If search term is present, resolve matching User ObjectIds or employee details
    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      const matchingUsers = await UserModel.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [
        { userId: { $in: userIds } },
        { 'employeeDetails.employeeId': searchRegex },
        { 'employeeDetails.designation': searchRegex },
        { 'employeeDetails.department': searchRegex },
        { 'employeeDetails.branch': searchRegex }
      ];
    }

    const total = await OrganizationMemberModel.countDocuments(filter);
    const totalPages = Math.ceil(total / query.limit) || 1;
    const skip = (query.page - 1) * query.limit;

    const sortOptions: any = {};
    sortOptions[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;

    const memberDocs = await OrganizationMemberModel.find(filter)
      .populate({
        path: 'userId',
        select: 'name email phone avatarUrl status lastLoginAt'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(query.limit)
      .lean();

    const data = memberDocs.map((doc) => this.formatMember(doc));
    const stats = await this.getTeamStats(tenantId);

    return {
      data,
      stats,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Retrieves a specific organization member by ID.
   */
  public static async getMemberById(memberId: string): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const doc = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    }).populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    if (!doc) {
      throw new NotFoundError('Organization member not found');
    }

    return this.formatMember(doc);
  }

  /**
   * Invites a new user into the organization.
   */
  public static async inviteMember(actorId: string, payload: unknown) {
    const tenantId = this.getTenantId();
    const validated = InviteOrganizationMemberSchema.parse(payload);

    // Prevent inviting Super Admins or invalid roles
    if (validated.role as string === 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot invite or assign SUPER_ADMIN role within organization');
    }

    // Check if target user exists
    let user = await UserModel.findOne({ email: validated.email });
    if (user && user.isSuperAdmin) {
      throw new ForbiddenError('Platform Super Admin accounts cannot be invited as organization members');
    }

    // Check if active or invited membership already exists in this tenant
    if (user) {
      const existingMember = await OrganizationMemberModel.findOne({
        tenantId,
        userId: user._id,
        status: { $in: ['ACTIVE', 'INVITED', 'SUSPENDED'] }
      });

      if (existingMember) {
        throw new ConflictError(`User ${validated.email} is already a member of this organization`);
      }
    } else {
      // Create initial invited user shell
      user = await UserModel.create({
        tenantId,
        allowedTenantIds: [tenantId],
        name: validated.email.split('@')[0],
        email: validated.email,
        passwordHash: '$2b$10$UnusableDummyHashForInvitedUserShell1234567890123456',
        status: 'INVITED',
        emailVerified: false,
        isSuperAdmin: false,
        roles: []
      });
    }

    // Generate cryptographically random single-use token and store SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days Expiry

    // Upsert invitation record
    await OrganizationInvitationModel.findOneAndUpdate(
      { tenantId, email: validated.email },
      {
        tenantId,
        email: validated.email,
        role: validated.role,
        tokenHash,
        expiresAt,
        invitedBy: new Types.ObjectId(actorId),
        status: 'PENDING'
      },
      { upsert: true, new: true }
    );

    // Upsert organization member in INVITED state
    const memberDoc = await OrganizationMemberModel.findOneAndUpdate(
      { tenantId, userId: user._id },
      {
        tenantId,
        userId: user._id,
        role: validated.role,
        status: 'INVITED',
        invitedAt: new Date(),
        invitedBy: new Types.ObjectId(actorId)
      },
      { upsert: true, new: true }
    ).populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.member.invited',
      resource: 'OrganizationMember',
      resourceId: memberDoc._id.toString(),
      metadata: {
        email: validated.email,
        role: validated.role
      }
    });

    return {
      member: this.formatMember(memberDoc),
      invitationToken: rawToken,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Directly creates an employee/team member with comprehensive profile data.
   */
  public static async createEmployee(actorId: string, payload: unknown): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();
    const validated = CreateEmployeeMemberSchema.parse(payload);

    if ((validated.role as string) === 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot assign SUPER_ADMIN role within organization');
    }

    // Check if user exists
    let user = await UserModel.findOne({ email: validated.email });
    if (user && user.isSuperAdmin) {
      throw new ForbiddenError('Platform Super Admin accounts cannot be added as organization members');
    }

    if (user) {
      const existingMember = await OrganizationMemberModel.findOne({
        tenantId,
        userId: user._id,
        status: { $in: ['ACTIVE', 'INVITED', 'SUSPENDED'] }
      });

      if (existingMember) {
        throw new ConflictError(`User ${validated.email} is already a member of this organization`);
      }

      // If user exists, update phone if provided and link tenantId to allowedTenantIds
      if (!user.allowedTenantIds.some((id) => id.toString() === tenantId)) {
        user.allowedTenantIds.push(new Types.ObjectId(tenantId));
      }
      if (validated.phone && !user.phone) {
        user.phone = validated.phone;
      }
      await user.save();
    } else {
      const rawPassword = validated.password || `${crypto.randomBytes(6).toString('hex')}Aa1!`;
      const passwordHash = await hashPassword(rawPassword);

      user = await UserModel.create({
        tenantId,
        allowedTenantIds: [tenantId],
        name: validated.name,
        email: validated.email,
        phone: validated.phone || undefined,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: []
      });
    }

    // Auto-generate employeeId if not provided
    let empId = validated.employeeId;
    if (!empId) {
      const count = await OrganizationMemberModel.countDocuments({ tenantId });
      empId = `EMP-${(count + 1).toString().padStart(3, '0')}`;
    }

    const employeeDetails = {
      employeeId: empId,
      designation: validated.designation || '',
      department: validated.department || '',
      branch: validated.branch || '',
      employmentType: validated.employmentType || 'FULL_TIME',
      dateOfJoining: validated.dateOfJoining || new Date(),
      workMode: validated.workMode || 'ON_SITE',
      personal: validated.personal,
      academic: validated.academic,
      kyc: validated.kyc,
      bank: validated.bank
    };

    const member = await OrganizationMemberModel.create({
      tenantId,
      userId: user._id,
      role: validated.role,
      status: 'ACTIVE',
      employeeDetails,
      joinedAt: employeeDetails.dateOfJoining || new Date(),
      invitedBy: new Types.ObjectId(actorId)
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.employee.created',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        userId: user._id.toString(),
        email: validated.email,
        role: validated.role,
        employeeId: empId,
        department: validated.department
      }
    });

    const populated = await OrganizationMemberModel.findById(member._id).populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    return this.formatMember(populated);
  }

  /**
   * Updates employee profile and synced user data.
   */
  public static async updateEmployee(actorId: string, memberId: string, payload: unknown): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const validated = UpdateEmployeeMemberSchema.parse(payload);

    const member = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    });

    if (!member) {
      throw new NotFoundError('Organization member not found');
    }

    // Update synced user details if specified
    if (validated.name || validated.phone) {
      const userUpdates: Record<string, any> = {};
      if (validated.name) userUpdates.name = validated.name;
      if (validated.phone) userUpdates.phone = validated.phone;

      await UserModel.findByIdAndUpdate(member.userId, { $set: userUpdates });
    }

    if (validated.role) {
      member.role = validated.role;
    }

    if (validated.status) {
      member.status = validated.status;
    }

    if (validated.employeeDetails) {
      member.employeeDetails = {
        ...(member.employeeDetails || {}),
        ...validated.employeeDetails,
        personal: {
          ...(member.employeeDetails?.personal || {}),
          ...(validated.employeeDetails.personal || {})
        },
        academic: {
          ...(member.employeeDetails?.academic || {}),
          ...(validated.employeeDetails.academic || {})
        },
        kyc: {
          ...(member.employeeDetails?.kyc || {}),
          ...(validated.employeeDetails.kyc || {})
        },
        bank: {
          ...(member.employeeDetails?.bank || {}),
          ...(validated.employeeDetails.bank || {})
        }
      } as any;
    }

    await member.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.employee.updated',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        role: member.role,
        status: member.status
      }
    });

    const populated = await OrganizationMemberModel.findById(member._id).populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    return this.formatMember(populated);
  }

  /**
   * Updates an organization member's role with Last Admin Protection.
   */
  public static async updateMemberRole(actorId: string, memberId: string, payload: unknown): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();
    const validated = UpdateOrganizationMemberRoleSchema.parse(payload);

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const member = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    });

    if (!member) {
      throw new NotFoundError('Organization member not found');
    }

    if (validated.role as string === 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot assign SUPER_ADMIN role');
    }

    // Last Tenant Admin Protection check
    if (member.role === 'TENANT_ADMIN' && validated.role !== 'TENANT_ADMIN') {
      const activeAdminCount = await OrganizationMemberModel.countDocuments({
        tenantId,
        role: 'TENANT_ADMIN',
        status: { $in: ['ACTIVE', 'INVITED'] }
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestError('Cannot change role of the sole active Tenant Admin. Assign another Tenant Admin first.');
      }
    }

    member.role = validated.role;
    await member.save();

    await member.populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.member.role_updated',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        role: validated.role
      }
    });

    return this.formatMember(member);
  }

  /**
   * Suspends an organization member with Last Admin Protection.
   */
  public static async suspendMember(actorId: string, memberId: string): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const member = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    });

    if (!member) {
      throw new NotFoundError('Organization member not found');
    }

    // Last Tenant Admin Protection check
    if (member.role === 'TENANT_ADMIN') {
      const activeAdminCount = await OrganizationMemberModel.countDocuments({
        tenantId,
        role: 'TENANT_ADMIN',
        status: 'ACTIVE',
        _id: { $ne: member._id }
      });

      if (activeAdminCount === 0) {
        throw new BadRequestError('Cannot suspend the sole active Tenant Admin. Assign another Tenant Admin first.');
      }
    }

    member.status = 'SUSPENDED';
    await member.save();

    // Update associated user status
    await UserModel.updateOne({ _id: member.userId }, { status: 'SUSPENDED' });

    await member.populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.member.suspended',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        status: 'SUSPENDED'
      }
    });

    return this.formatMember(member);
  }

  /**
   * Activates a suspended or invited organization member.
   */
  public static async activateMember(actorId: string, memberId: string): Promise<IOrganizationMember> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const member = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    });

    if (!member) {
      throw new NotFoundError('Organization member not found');
    }

    member.status = 'ACTIVE';
    await member.save();

    // Update associated user status
    await UserModel.updateOne({ _id: member.userId }, { status: 'ACTIVE' });

    await member.populate({
      path: 'userId',
      select: 'name email phone avatarUrl status lastLoginAt'
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.member.activated',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        status: 'ACTIVE'
      }
    });

    return this.formatMember(member);
  }

  /**
   * Removes an organization member with Last Admin Protection.
   */
  public static async removeMember(actorId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    const tenantId = this.getTenantId();

    if (!Types.ObjectId.isValid(memberId)) {
      throw new NotFoundError('Organization member not found');
    }

    const member = await OrganizationMemberModel.findOne({
      _id: memberId,
      tenantId,
      status: { $ne: 'REMOVED' }
    });

    if (!member) {
      throw new NotFoundError('Organization member not found');
    }

    // Last Tenant Admin Protection check
    if (member.role === 'TENANT_ADMIN') {
      const activeAdminCount = await OrganizationMemberModel.countDocuments({
        tenantId,
        role: 'TENANT_ADMIN',
        status: { $in: ['ACTIVE', 'INVITED'] },
        _id: { $ne: member._id }
      });

      if (activeAdminCount === 0) {
        throw new BadRequestError('Cannot remove the sole active Tenant Admin. Assign another Tenant Admin first.');
      }
    }

    member.status = 'REMOVED';
    await member.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.member.removed',
      resource: 'OrganizationMember',
      resourceId: member._id.toString(),
      metadata: {
        memberId: member._id.toString(),
        status: 'REMOVED'
      }
    });

    return {
      success: true,
      message: 'Organization member removed successfully'
    };
  }
}
