import {
  LeadModel,
  LeadActivityModel,
  LeadFollowUpModel,
  AdmissionModel,
  CourseModel,
  BatchModel,
  BranchModel,
  UserModel,
  OrganizationMemberModel,
  EnrollmentModel,
  runInTransaction,
  ILeadDocument,
  ILeadActivityDocument,
  ILeadFollowUpDocument,
  IAdmissionDocument,
  LeadStage,
  LeadSource,
  LostReason,
  FollowUpType,
  FollowUpOutcome
} from '@edtech/database';
import {
  tenantContextStorage,
  normalizePhone,
  normalizeEmail,
  hashPassword
} from '@edtech/utils';
import { StudentLifecycleService } from './studentLifecycle.service';
import {
  CreateLeadPayload,
  UpdateLeadPayload,
  ChangeLeadStagePayload,
  AssignLeadPayload,
  AddLeadNotePayload,
  ScheduleFollowUpPayload,
  CompleteFollowUpPayload,
  CreateAdmissionPayload,
  ConvertAdmissionPayload,
  LeadFilterQuery,
  FollowUpFilterQuery,
  AdmissionFilterQuery,
  CRMDashboardSummary,
  PublicLeadInquiryPayload
} from '@edtech/types';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../errors/appError';
import { AuditService } from './audit.service';
import { EnrollmentService } from './enrollment.service';
import { Types } from 'mongoose';
import { BranchAccessService, BranchActor } from './branchAccess.service';
import { DomainEventService } from './domainEvent.service';

export class CRMService {
  static async reassignLeadBranch(leadId: string, destinationBranchId: string, reason: string, actor: BranchActor) {
    const tenantId = tenantContextStorage.getStore()?.currentTenantId;
    if (!tenantId) throw new Error('Tenant context required');
    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');
    if (!lead.branchId) {
      const scope = await BranchAccessService.getScope(tenantId, actor);
      if (scope.mode !== 'ALL') throw new NotFoundError('Lead not found');
    } else await BranchAccessService.assertBranchAccess(tenantId, actor, lead.branchId.toString());
    const destination = await BranchAccessService.assertBranchAccess(tenantId, actor, destinationBranchId, { requireActive: true });
    if (lead.branchId?.equals(destination._id)) return lead;
    const fromBranchId = lead.branchId; lead.branchId = destination._id; lead.updatedBy = new Types.ObjectId(actor.userId); await lead.save();
    await LeadActivityModel.create({ tenantId, leadId: lead._id, type: 'REASSIGNED', title: 'Lead branch reassigned', note: reason,
      metadata: { fromBranchId: fromBranchId?.toString(), toBranchId: destination._id.toString() }, actorId: new Types.ObjectId(actor.userId) });
    await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'LEAD_BRANCH_REASSIGNED', resource: 'Lead', resourceId: lead.id,
      metadata: { fromBranchId: fromBranchId?.toString(), toBranchId: destination._id.toString(), reason } });
    return lead;
  }
  /**
   * Helper: Generate a tenant-scoped human-readable Lead Code (e.g. LD-000101)
   */
  private static async generateLeadCode(tenantId: string): Promise<string> {
    const count = await LeadModel.countDocuments({ tenantId });
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `LD-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;
  }

  /**
   * Helper: Generate Admission Number (e.g. ADM-2026-0012)
   */
  private static async generateAdmissionNumber(tenantId: string): Promise<string> {
    const count = await AdmissionModel.countDocuments({ tenantId });
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `ADM-${year}-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;
  }

  /**
   * 1. Create a Lead (with concurrency-safe deduplication check)
   */
  static async createLead(payload: CreateLeadPayload, actorId: string, branchActor: BranchActor = { userId: actorId }): Promise<ILeadDocument> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;
    let branchId: Types.ObjectId | undefined;
    if (payload.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, branchActor, payload.branchId, { requireActive: true });
      branchId = new Types.ObjectId(payload.branchId);
    }

    const normPhone = normalizePhone(payload.phone);
    if (!normPhone) {
      throw new BadRequestError('A valid phone number is required for lead capture');
    }
    const normEmail = normalizeEmail(payload.email);

    // Concurrency-safe deduplication check: check if an active lead already exists with this phone in tenant
    const existingLead = await LeadModel.findOne({
      tenantId,
      normalizedPhone: normPhone,
      stage: { $nin: ['LOST', 'CONVERTED'] }
    });

    if (existingLead) {
      throw new ConflictError(
        `An active lead already exists with phone number (${payload.phone}). Lead Code: ${existingLead.leadCode || existingLead._id}`
      );
    }

    // Verify assigned counsellor belongs to this tenant if provided
    if (payload.assignedTo) {
      const isMember = await OrganizationMemberModel.findOne({
        tenantId,
        userId: payload.assignedTo,
        status: 'ACTIVE'
      });
      if (!isMember) {
        throw new BadRequestError('Assigned counsellor is not an active team member of this organization');
      }
    }

    const fullName = payload.lastName
      ? `${payload.firstName.trim()} ${payload.lastName.trim()}`
      : payload.firstName.trim();

    const leadCode = await this.generateLeadCode(tenantId);

    return runInTransaction(async (session) => {
    const [lead] = await LeadModel.create([{
      tenantId,
      leadCode,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName?.trim(),
      fullName,
      email: payload.email?.trim(),
      normalizedEmail: normEmail || undefined,
      phone: payload.phone.trim(),
      normalizedPhone: normPhone,
      alternatePhone: payload.alternatePhone?.trim(),
      city: payload.city?.trim(),
      state: payload.state?.trim(),
      country: payload.country?.trim() || 'India',
      source: payload.source || 'MANUAL',
      sourceDetail: payload.sourceDetail?.trim(),
      campaign: payload.campaign?.trim(),
      medium: payload.medium?.trim(),
      referralName: payload.referralName?.trim(),
      courseInterestId: payload.courseInterestId ? new Types.ObjectId(payload.courseInterestId) : null,
      batchInterestId: payload.batchInterestId ? new Types.ObjectId(payload.batchInterestId) : null,
      preferredMode: payload.preferredMode || 'ONLINE',
      branchId,
      stage: payload.stage || 'NEW',
      assignedTo: payload.assignedTo ? new Types.ObjectId(payload.assignedTo) : null,
      assignedAt: payload.assignedTo ? new Date() : null,
      assignedBy: payload.assignedTo ? new Types.ObjectId(actorId) : null,
      lastInquiryAt: new Date(),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId)
    }], { session });

    // Record initial activity
    await LeadActivityModel.create([{
      tenantId,
      leadId: lead._id,
      type: 'LEAD_CREATED',
      title: 'Lead Captured',
      note: payload.initialNote || `Lead created via ${lead.source}`,
      actorId: new Types.ObjectId(actorId)
    }], { session });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'LEAD_CREATED',
      resource: 'Lead',
      resourceId: lead._id.toString(),
      metadata: { leadCode: lead.leadCode, source: lead.source }, session
    });
    await DomainEventService.publish({ tenantId, eventId: `lead.created:${lead._id}`, eventType: 'lead.created', occurredAt: lead.createdAt || new Date(), actorId, resourceType: 'Lead', resourceId: lead._id.toString(), branchId: branchId?.toString(), correlationId: `lead:${lead._id}`, depth: 0, payloadVersion: 1, payload: { name: lead.fullName, source: lead.source, stage: lead.stage, courseId: lead.courseInterestId?.toString() } }, session);
    return lead;
    });
  }

  /**
   * 2. Public Website Lead Inquiry (with deduplication & auto-activity logging)
   */
  static async capturePublicInquiry(tenantId: string, payload: PublicLeadInquiryPayload): Promise<{ isNew: boolean; leadId: string }> {
    let branchId: Types.ObjectId | undefined;
    if (payload.branchId) {
      if (!Types.ObjectId.isValid(payload.branchId)) throw new BadRequestError('Invalid branch');
      const branch = await BranchModel.findOne({ _id: payload.branchId, tenantId, status: 'ACTIVE' }).lean();
      if (!branch) throw new BadRequestError('Selected branch is unavailable');
      branchId = branch._id;
    }
    const normPhone = normalizePhone(payload.phone);
    if (!normPhone) {
      throw new BadRequestError('Valid phone number is required');
    }
    const normEmail = normalizeEmail(payload.email);

    // Look for existing lead in this tenant
    const existingLead = await LeadModel.findOne({
      tenantId,
      normalizedPhone: normPhone
    });

    if (existingLead) {
      // If existing lead is LOST, reopen it as NEW inquiry
      if (existingLead.stage === 'LOST') {
        existingLead.stage = 'NEW';
        existingLead.lostAt = undefined;
        existingLead.lostReason = undefined;
      }
      existingLead.lastInquiryAt = new Date();
      if (payload.courseInterestId) {
        existingLead.courseInterestId = new Types.ObjectId(payload.courseInterestId);
      }
      if (!existingLead.branchId && branchId) existingLead.branchId = branchId;
      await existingLead.save();

      // Record inquiry activity
      await LeadActivityModel.create({
        tenantId,
        leadId: existingLead._id,
        type: 'LEAD_CREATED',
        title: 'Repeat Website Inquiry Received',
        note: payload.message || `Repeat inquiry for course from public site`,
        metadata: { campaign: payload.campaign, medium: payload.medium }
      });

      return { isNew: false, leadId: existingLead._id.toString() };
    }

    // Create new lead from public portal
    const nameParts = payload.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
    const leadCode = await this.generateLeadCode(tenantId);

    // Use system / first tenant admin or null as creator placeholder
    const firstAdmin = await UserModel.findOne({ tenantId, status: 'ACTIVE' }).select('_id');
    const creatorId = firstAdmin ? firstAdmin._id : new Types.ObjectId();

    const newLead = await LeadModel.create({
      tenantId,
      leadCode,
      firstName,
      lastName,
      fullName: payload.fullName.trim(),
      email: payload.email?.trim(),
      normalizedEmail: normEmail || undefined,
      phone: payload.phone.trim(),
      normalizedPhone: normPhone,
      city: payload.city?.trim(),
      source: payload.source || 'WEBSITE',
      sourceDetail: payload.sourceDetail || 'Landing Page Form',
      campaign: payload.campaign,
      medium: payload.medium,
      courseInterestId: payload.courseInterestId ? new Types.ObjectId(payload.courseInterestId) : null,
      branchId,
      stage: 'NEW',
      lastInquiryAt: new Date(),
      createdBy: creatorId,
      updatedBy: creatorId
    });

    await LeadActivityModel.create({
      tenantId,
      leadId: newLead._id,
      type: 'LEAD_CREATED',
      title: 'Public Web Inquiry Captured',
      note: payload.message || 'Captured via public website form submission'
    });

    return { isNew: true, leadId: newLead._id.toString() };
  }

  /**
   * 3. List Leads with server-side pagination, filters & next follow-up resolution
   */
  static async getLeads(filters: LeadFilterQuery, actorId: string, branchActor: BranchActor = { userId: actorId }) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const scope = await BranchAccessService.getScope(tenantId, branchActor);
    const query: any = { tenantId };
    if (scope.mode === 'SELECTED') query.branchId = { $in: scope.branchIds.map((id) => new Types.ObjectId(id)) };

    if (filters.stage && filters.stage !== 'ALL') query.stage = filters.stage;
    if (filters.source && filters.source !== 'ALL') query.source = filters.source;
    if (filters.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, branchActor, filters.branchId);
      query.branchId = new Types.ObjectId(filters.branchId);
    }
    if (filters.courseId) query.courseInterestId = filters.courseId;

    // Counsellor filter / My Leads
    if (filters.isMyLeads || filters.assignedTo) {
      const targetUserId = filters.isMyLeads ? actorId : filters.assignedTo;
      query.assignedTo = targetUserId;
    }

    // Search by name, phone, email, leadCode
    if (filters.search) {
      const safeTerm = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeTerm, 'i');
      query.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { normalizedPhone: searchRegex },
        { email: searchRegex },
        { leadCode: searchRegex }
      ];
    }

    const total = await LeadModel.countDocuments(query);
    const leadsRaw = await LeadModel.find(query)
      .populate('courseInterestId', 'title slug')
      .populate('batchInterestId', 'name batchCode')
      .populate('assignedTo', 'name email avatarUrl')
      .sort({ [filters.sortBy || 'createdAt']: filters.sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Resolve next pending follow-up for each lead
    const leadIds = leadsRaw.map((l) => l._id);
    const pendingFollowUps = await LeadFollowUpModel.find({
      tenantId,
      leadId: { $in: leadIds },
      status: 'PENDING'
    })
      .sort({ dueAt: 1 })
      .lean();

    const followUpMap = new Map<string, any>();
    pendingFollowUps.forEach((fu) => {
      const lId = fu.leadId.toString();
      if (!followUpMap.has(lId)) {
        followUpMap.set(lId, fu);
      }
    });

    const leads = leadsRaw.map((l: any) => {
      const nextFu = followUpMap.get(l._id.toString());
      return {
        id: l._id.toString(),
        leadCode: l.leadCode,
        fullName: l.fullName,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        city: l.city,
        state: l.state,
        source: l.source,
        sourceDetail: l.sourceDetail,
        stage: l.stage,
        preferredMode: l.preferredMode,
        branchId: l.branchId,
        courseInterest: l.courseInterestId ? {
          id: l.courseInterestId._id.toString(),
          title: l.courseInterestId.title
        } : undefined,
        batchInterest: l.batchInterestId ? {
          id: l.batchInterestId._id.toString(),
          name: l.batchInterestId.name
        } : undefined,
        counsellor: l.assignedTo ? {
          id: l.assignedTo._id.toString(),
          name: l.assignedTo.name,
          email: l.assignedTo.email
        } : undefined,
        assignedAt: l.assignedAt,
        lostReason: l.lostReason,
        lostReasonDetail: l.lostReasonDetail,
        admissionId: l.admissionId?.toString(),
        convertedAt: l.convertedAt,
        nextFollowUp: nextFu ? {
          id: nextFu._id.toString(),
          type: nextFu.type,
          dueAt: nextFu.dueAt,
          note: nextFu.note,
          isOverdue: new Date(nextFu.dueAt) < new Date()
        } : undefined,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      };
    });

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 4. Get Single Lead Detail with Full Context & Timeline
   */
  static async getLeadById(leadId: string, branchActor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId })
      .populate('courseInterestId', 'title slug')
      .populate('batchInterestId', 'name batchCode')
      .populate('assignedTo', 'name email avatarUrl')
      .lean();

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    if (branchActor) {
      if (!lead.branchId) {
        const scope = await BranchAccessService.getScope(tenantId, branchActor);
        if (scope.mode !== 'ALL') throw new NotFoundError('Lead not found');
      } else await BranchAccessService.assertBranchAccess(tenantId, branchActor, lead.branchId.toString());
    }

    // Fetch activities
    const activities = await LeadActivityModel.find({ tenantId, leadId })
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch follow-ups
    const followUps = await LeadFollowUpModel.find({ tenantId, leadId })
      .populate('assignedTo', 'name email')
      .sort({ dueAt: -1 })
      .lean();

    // Fetch admission if linked
    let admission: any = null;
    if (lead.admissionId) {
      admission = await AdmissionModel.findOne({ _id: lead.admissionId, tenantId })
        .populate('courseId', 'title')
        .populate('batchId', 'name')
        .lean();
    }

    return {
      lead: {
        id: lead._id.toString(),
        leadCode: lead.leadCode,
        fullName: lead.fullName,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        source: lead.source,
        sourceDetail: lead.sourceDetail,
        campaign: lead.campaign,
        medium: lead.medium,
        referralName: lead.referralName,
        stage: lead.stage,
        preferredMode: lead.preferredMode,
        branchId: lead.branchId,
        courseInterest: lead.courseInterestId ? {
          id: (lead.courseInterestId as any)._id.toString(),
          title: (lead.courseInterestId as any).title
        } : undefined,
        batchInterest: lead.batchInterestId ? {
          id: (lead.batchInterestId as any)._id.toString(),
          name: (lead.batchInterestId as any).name
        } : undefined,
        counsellor: lead.assignedTo ? {
          id: (lead.assignedTo as any)._id.toString(),
          name: (lead.assignedTo as any).name,
          email: (lead.assignedTo as any).email
        } : undefined,
        assignedAt: lead.assignedAt,
        lostAt: lead.lostAt,
        lostReason: lead.lostReason,
        lostReasonDetail: lead.lostReasonDetail,
        admissionId: lead.admissionId?.toString(),
        studentUserId: lead.studentUserId?.toString(),
        convertedAt: lead.convertedAt,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      },
      activities: activities.map((a: any) => ({
        id: a._id.toString(),
        type: a.type,
        title: a.title,
        note: a.note,
        metadata: a.metadata,
        actor: a.actorId ? { id: a.actorId._id.toString(), name: a.actorId.name } : { name: a.actorName || 'System' },
        createdAt: a.createdAt
      })),
      followUps: followUps.map((fu: any) => ({
        id: fu._id.toString(),
        type: fu.type,
        dueAt: fu.dueAt,
        note: fu.note,
        status: fu.status,
        completedAt: fu.completedAt,
        outcome: fu.outcome,
        outcomeNote: fu.outcomeNote,
        counsellor: fu.assignedTo ? { id: fu.assignedTo._id.toString(), name: fu.assignedTo.name } : undefined,
        isOverdue: fu.status === 'PENDING' && new Date(fu.dueAt) < new Date(),
        createdAt: fu.createdAt
      })),
      admission: admission ? {
        id: admission._id.toString(),
        admissionNumber: admission.admissionNumber,
        status: admission.status,
        courseTitle: admission.courseId?.title,
        batchName: admission.batchId?.name,
        applicationDate: admission.applicationDate,
        admittedAt: admission.admittedAt
      } : null
    };
  }

  /**
   * 5. Update Lead Information
   */
  static async updateLead(leadId: string, payload: UpdateLeadPayload, actorId: string, branchActor?: BranchActor) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');
    if (branchActor) {
      if (!lead.branchId) {
        const scope = await BranchAccessService.getScope(tenantId, branchActor);
        if (scope.mode !== 'ALL') throw new NotFoundError('Lead not found');
      } else await BranchAccessService.assertBranchAccess(tenantId, branchActor, lead.branchId.toString());
    }

    if (payload.firstName) lead.firstName = payload.firstName.trim();
    if (payload.lastName !== undefined) lead.lastName = payload.lastName.trim();
    lead.fullName = lead.lastName ? `${lead.firstName} ${lead.lastName}` : lead.firstName;

    if (payload.phone) {
      lead.phone = payload.phone.trim();
      lead.normalizedPhone = normalizePhone(payload.phone);
    }
    if (payload.email !== undefined) {
      lead.email = payload.email.trim();
      lead.normalizedEmail = normalizeEmail(payload.email);
    }

    if (payload.alternatePhone !== undefined) lead.alternatePhone = payload.alternatePhone.trim();
    if (payload.city !== undefined) lead.city = payload.city.trim();
    if (payload.state !== undefined) lead.state = payload.state.trim();
    if (payload.country !== undefined) lead.country = payload.country.trim();
    if (payload.source) lead.source = payload.source;
    if (payload.sourceDetail !== undefined) lead.sourceDetail = payload.sourceDetail.trim();
    if (payload.campaign !== undefined) lead.campaign = payload.campaign.trim();
    if (payload.medium !== undefined) lead.medium = payload.medium.trim();
    if (payload.referralName !== undefined) lead.referralName = payload.referralName.trim();
    if (payload.preferredMode) lead.preferredMode = payload.preferredMode;
    if (payload.branchId !== undefined) throw new BadRequestError('Use the explicit lead branch reassignment operation');

    if (payload.courseInterestId !== undefined) {
      lead.courseInterestId = payload.courseInterestId ? new Types.ObjectId(payload.courseInterestId) : undefined;
    }
    if (payload.batchInterestId !== undefined) {
      lead.batchInterestId = payload.batchInterestId ? new Types.ObjectId(payload.batchInterestId) : undefined;
    }

    lead.updatedBy = new Types.ObjectId(actorId);
    await lead.save();

    await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: 'NOTE_ADDED',
      title: 'Lead Profile Updated',
      actorId: new Types.ObjectId(actorId)
    });

    return lead;
  }

  /**
   * 6. Pipeline Stage Transition
   */
  static async changeStage(leadId: string, payload: ChangeLeadStagePayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');

    const previousStage = lead.stage;
    const nextStage = payload.stage;

    // Validate LOST transition requires lostReason
    if (nextStage === 'LOST' && !payload.lostReason) {
      throw new BadRequestError('A valid lost reason is required when marking a lead as LOST');
    }

    lead.stage = nextStage;
    lead.updatedBy = new Types.ObjectId(actorId);

    if (nextStage === 'LOST') {
      lead.lostAt = new Date();
      lead.lostReason = payload.lostReason;
      lead.lostReasonDetail = payload.lostReasonDetail?.trim();
    } else if (previousStage === 'LOST' && (nextStage as string) !== 'LOST') {
      // Reopened
      lead.lostAt = undefined;
      lead.lostReason = undefined;
      lead.lostReasonDetail = undefined;
    }

    await lead.save();

    // Record Stage Change Activity
    await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: nextStage === 'LOST' ? 'LOST' : previousStage === 'LOST' ? 'REOPENED' : 'STAGE_CHANGED',
      title: `Stage Changed to ${nextStage}`,
      note: payload.note || (nextStage === 'LOST' ? `Reason: ${payload.lostReason}` : `Transitioned from ${previousStage}`),
      metadata: { previousStage, nextStage, lostReason: payload.lostReason },
      actorId: new Types.ObjectId(actorId)
    });

    return lead;
  }

  /**
   * 7. Assign / Reassign Counsellor
   */
  static async assignCounsellor(leadId: string, payload: AssignLeadPayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');

    // Verify counsellor is an active team member of this organization
    const member = await OrganizationMemberModel.findOne({
      tenantId,
      userId: payload.assignedTo,
      status: 'ACTIVE'
    }).populate('userId', 'name email');

    if (!member) {
      throw new BadRequestError('Selected counsellor is not an active team member of this organization');
    }

    const previousCounsellorId = lead.assignedTo?.toString();
    const newCounsellor = member.userId as any;

    lead.assignedTo = new Types.ObjectId(payload.assignedTo);
    lead.assignedAt = new Date();
    lead.assignedBy = new Types.ObjectId(actorId);
    lead.updatedBy = new Types.ObjectId(actorId);
    await lead.save();

    await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: previousCounsellorId ? 'REASSIGNED' : 'ASSIGNED',
      title: `Assigned to ${newCounsellor.name || 'Counsellor'}`,
      note: payload.note || `Ownership assigned`,
      metadata: { previousCounsellorId, assignedTo: payload.assignedTo },
      actorId: new Types.ObjectId(actorId)
    });

    return lead;
  }

  /**
   * 8. Add Note / Log Interaction
   */
  static async addNote(leadId: string, payload: AddLeadNotePayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');

    const activity = await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: payload.type || 'NOTE_ADDED',
      title: payload.title || 'Interaction Note',
      note: payload.note.trim(),
      actorId: new Types.ObjectId(actorId)
    });

    lead.updatedBy = new Types.ObjectId(actorId);
    await lead.save();

    return activity;
  }

  /**
   * 9. Schedule Follow-Up
   */
  static async scheduleFollowUp(leadId: string, payload: ScheduleFollowUpPayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const idempotencyKey = (payload as any).idempotencyKey as string | undefined;
    if (idempotencyKey) { const existing = await LeadFollowUpModel.findOne({ tenantId, idempotencyKey }); if (existing) return existing; }
    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');

    const assignedTo = payload.assignedTo || lead.assignedTo?.toString() || actorId;

    let followUp: any;
    try { followUp = await LeadFollowUpModel.create({
      tenantId,
      leadId: lead._id,
      assignedTo: new Types.ObjectId(assignedTo),
      type: payload.type || 'CALL',
      dueAt: new Date(payload.dueAt),
      note: payload.note?.trim(),
      status: 'PENDING',
      createdBy: new Types.ObjectId(actorId)
      ,idempotencyKey
    }); } catch (error: any) { if (error?.code === 11000 && idempotencyKey) { const existing = await LeadFollowUpModel.findOne({ tenantId, idempotencyKey }); if (existing) return existing; } throw error; }

    // Automatically set lead stage to FOLLOW_UP if currently NEW/CONTACTED
    if (['NEW', 'CONTACTED'].includes(lead.stage)) {
      lead.stage = 'FOLLOW_UP';
      await lead.save();
    }

    await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: 'FOLLOW_UP_CREATED',
      title: `Follow-Up Scheduled (${payload.type || 'CALL'})`,
      note: `Due on ${new Date(payload.dueAt).toLocaleString()}${payload.note ? ': ' + payload.note : ''}`,
      metadata: { followUpId: followUp._id.toString(), dueAt: payload.dueAt },
      actorId: new Types.ObjectId(actorId)
    });

    return followUp;
  }

  /**
   * 10. Complete Follow-Up
   */
  static async completeFollowUp(followUpId: string, payload: CompleteFollowUpPayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const followUp = await LeadFollowUpModel.findOne({ _id: followUpId, tenantId });
    if (!followUp) throw new NotFoundError('Follow-up not found');

    followUp.status = 'COMPLETED';
    followUp.completedAt = new Date();
    followUp.completedBy = new Types.ObjectId(actorId);
    if (payload.outcome) followUp.outcome = payload.outcome;
    if (payload.outcomeNote) followUp.outcomeNote = payload.outcomeNote.trim();
    await followUp.save();

    await LeadActivityModel.create({
      tenantId,
      leadId: followUp.leadId,
      type: 'FOLLOW_UP_COMPLETED',
      title: `Follow-Up Completed (${followUp.type})`,
      note: `Outcome: ${payload.outcome || 'COMPLETED'}${payload.outcomeNote ? ' — ' + payload.outcomeNote : ''}`,
      metadata: { followUpId, outcome: payload.outcome },
      actorId: new Types.ObjectId(actorId)
    });

    // If scheduled next follow-up is requested
    let nextFollowUp: any = null;
    if (payload.scheduleNextDueAt) {
      nextFollowUp = await this.scheduleFollowUp(
        followUp.leadId.toString(),
        {
          dueAt: payload.scheduleNextDueAt,
          note: payload.scheduleNextNote,
          type: followUp.type
        },
        actorId
      );
    }

    return { followUp, nextFollowUp };
  }

  /**
   * 11. Create Admission Application from Lead
   */
  static async createAdmission(leadId: string, payload: CreateAdmissionPayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const lead = await LeadModel.findOne({ _id: leadId, tenantId });
    if (!lead) throw new NotFoundError('Lead not found');

    // Verify course
    const course = await CourseModel.findOne({ _id: payload.courseId, tenantId });
    if (!course) throw new NotFoundError('Selected course not found');

    // Verify batch if provided
    if (payload.batchId) {
      const batch = await BatchModel.findOne({ _id: payload.batchId, tenantId, courseId: payload.courseId });
      if (!batch) throw new BadRequestError('Selected batch does not match course');
    }

    // Check duplicate active admission for this lead
    const existingAdmission = await AdmissionModel.findOne({
      tenantId,
      leadId: lead._id,
      status: { $nin: ['REJECTED', 'CANCELLED'] }
    });
    if (existingAdmission) {
      return existingAdmission;
    }

    const admissionNumber = await this.generateAdmissionNumber(tenantId);

    const admission = await AdmissionModel.create({
      tenantId,
      admissionNumber,
      leadId: lead._id,
      applicant: {
        fullName: payload.applicant?.fullName || lead.fullName,
        email: payload.applicant?.email || lead.email || '',
        phone: payload.applicant?.phone || lead.phone,
        dob: payload.applicant?.dob,
        gender: payload.applicant?.gender,
        address: payload.applicant?.address,
        guardianName: payload.applicant?.guardianName,
        guardianPhone: payload.applicant?.guardianPhone
      },
      courseId: new Types.ObjectId(payload.courseId),
      batchId: payload.batchId ? new Types.ObjectId(payload.batchId) : undefined,
      branchId: lead.branchId,
      assignedCounsellor: payload.assignedCounsellor
        ? new Types.ObjectId(payload.assignedCounsellor)
        : lead.assignedTo,
      status: 'APPLICATION_SUBMITTED',
      applicationDate: new Date(),
      notes: payload.notes?.trim(),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId)
    });

    // Link admission to lead and update stage
    lead.admissionId = admission._id;
    lead.stage = 'APPLICATION_STARTED';
    await lead.save();

    await LeadActivityModel.create({
      tenantId,
      leadId: lead._id,
      type: 'ADMISSION_CREATED',
      title: 'Admission Application Started',
      note: `Application #${admissionNumber} submitted for ${course.title}`,
      metadata: { admissionId: admission._id.toString(), courseId: payload.courseId },
      actorId: new Types.ObjectId(actorId)
    });

    return admission;
  }

  /**
   * 12. Convert Admission to Student Identity & Course Enrollment
   * Reuses UserModel & EnrollmentService deterministically & idempotently
   */
  static async convertAdmissionToStudent(admissionId: string, payload: ConvertAdmissionPayload, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    return runInTransaction(async (session) => {

    const admission = await AdmissionModel.findOne({ _id: admissionId, tenantId })
      .populate('courseId', 'title')
      .populate('batchId', 'name')
      .session(session);

    if (!admission) throw new NotFoundError('Admission record not found');

    if (admission.status === 'ADMITTED' && admission.studentUserId) {
      // Already admitted idempotency
      return {
        alreadyAdmitted: true,
        admissionId: admission._id.toString(),
        studentUserId: admission.studentUserId.toString(),
        enrollmentId: admission.enrollmentId?.toString()
      };
    }

    const applicant = admission.applicant;
    const normEmail = normalizeEmail(applicant.email);
    const normPhone = normalizePhone(applicant.phone);

    // 1. Resolve or create User authentication identity
    let user = await UserModel.findOne({
      tenantId,
      email: normEmail
    }).session(session);

    if (!user) {
      // Generate default secure initial password hash
      const initialPassword = `Student@${normPhone.slice(-4)}`;
      const passwordHash = await hashPassword(initialPassword);

      [user] = await UserModel.create([{
        tenantId: new Types.ObjectId(tenantId),
        name: applicant.fullName,
        email: normEmail,
        phone: applicant.phone,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: []
      }], { session });
    }

    const studentUserId = user._id;

    // 2. Ensure OrganizationMember entry with STUDENT role exists
    await OrganizationMemberModel.findOneAndUpdate(
      { tenantId, userId: studentUserId },
      {
        $set: {
          role: 'STUDENT',
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      },
      { upsert: true, new: true, session }
    );

    // 3. Create canonical LMS Enrollment via EnrollmentService
    const courseIdStr = (admission.courseId?._id || admission.courseId)?.toString();
    const courseTitle = (admission.courseId as any)?.title || 'Enrolled Course';

    const enrollment = await EnrollmentService.enrollStudent(
      studentUserId.toString(),
      courseIdStr,
      session
    );

    const enrollmentId = enrollment ? (enrollment._id || (enrollment as any).id) : undefined;

    // 3b. Initialize canonical StudentLifecycle aggregate
    if (enrollmentId) {
      await StudentLifecycleService.initializeLifecycle(
        {
          tenantId,
          studentUserId: studentUserId.toString(),
          admissionId: admission._id.toString(),
          currentEnrollmentId: enrollmentId.toString(),
          currentBatchId: payload.batchId || (admission.batchId ? admission.batchId.toString() : undefined),
          currentBranchId: admission.branchId ? admission.branchId.toString() : undefined,
          createdBy: actorId
        },
        session
      );
    }

    // 4. Update Admission status to ADMITTED
    admission.status = 'ADMITTED';
    admission.admittedAt = new Date();
    admission.admittedBy = new Types.ObjectId(actorId);
    admission.studentUserId = studentUserId;
    if (enrollmentId) {
      admission.enrollmentId = enrollmentId;
    }
    if (payload.batchId) {
      admission.batchId = new Types.ObjectId(payload.batchId);
    }
    await admission.save({ session });

    // 5. Update Lead stage to CONVERTED
    await LeadModel.findByIdAndUpdate(admission.leadId, {
      $set: {
        stage: 'CONVERTED',
        studentUserId,
        convertedAt: new Date(),
        updatedBy: new Types.ObjectId(actorId)
      }
    }, { session });

    // 6. Record timeline activity
    await LeadActivityModel.create([{
      tenantId,
      leadId: admission.leadId,
      type: 'CONVERTED',
      title: 'Student Admitted & Enrolled',
      note: `Converted to active student (${applicant.fullName}) and enrolled in ${courseTitle}`,
      metadata: {
        studentUserId: studentUserId.toString(),
        enrollmentId: admission.enrollmentId?.toString()
      },
      actorId: new Types.ObjectId(actorId)
    }], { session });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'STUDENT_ADMITTED',
      resource: 'Admission',
      resourceId: admission._id.toString(),
      metadata: {
        studentUserId: studentUserId.toString(),
        courseTitle
      },
      session
    });

    return {
      success: true,
      admissionId: admission._id.toString(),
      studentUserId: studentUserId.toString(),
      enrollmentId: admission.enrollmentId?.toString(),
      courseTitle
    };
    });
  }

  /**
   * 13. CRM Dashboard Operational Summary Metrics
   */
  static async getDashboardMetrics(): Promise<CRMDashboardSummary> {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');
    const tenantId = ctx.currentTenantId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      convertedStudents,
      lostLeads,
      followUpsPending,
      followUpsOverdue,
      followUpsToday,
      admissionsInProgress,
      recentLeadsRaw,
      todaysFollowUpsRaw
    ] = await Promise.all([
      LeadModel.countDocuments({ tenantId }),
      LeadModel.countDocuments({ tenantId, stage: 'NEW' }),
      LeadModel.countDocuments({ tenantId, stage: 'CONTACTED' }),
      LeadModel.countDocuments({ tenantId, stage: 'QUALIFIED' }),
      LeadModel.countDocuments({ tenantId, stage: 'CONVERTED' }),
      LeadModel.countDocuments({ tenantId, stage: 'LOST' }),
      LeadFollowUpModel.countDocuments({ tenantId, status: 'PENDING' }),
      LeadFollowUpModel.countDocuments({ tenantId, status: 'PENDING', dueAt: { $lt: startOfToday } }),
      LeadFollowUpModel.countDocuments({ tenantId, status: 'PENDING', dueAt: { $gte: startOfToday, $lte: endOfToday } }),
      AdmissionModel.countDocuments({ tenantId, status: { $in: ['APPLICATION_SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } }),
      LeadModel.find({ tenantId })
        .populate('courseInterestId', 'title')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      LeadFollowUpModel.find({ tenantId, status: 'PENDING', dueAt: { $gte: startOfToday, $lte: endOfToday } })
        .populate('leadId', 'fullName phone stage')
        .populate('assignedTo', 'name')
        .sort({ dueAt: 1 })
        .limit(6)
        .lean()
    ]);

    // Source breakdown aggregate
    const sourceAggr = await LeadModel.aggregate([
      { $match: { tenantId: new Types.ObjectId(tenantId) } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    const sourceBreakdown = sourceAggr.map((s) => ({
      source: s._id as LeadSource,
      count: s.count
    }));

    const pipelineCounts: Record<LeadStage, number> = {
      NEW: newLeads,
      CONTACTED: contactedLeads,
      QUALIFIED: qualifiedLeads,
      DEMO_SCHEDULED: await LeadModel.countDocuments({ tenantId, stage: 'DEMO_SCHEDULED' }),
      FOLLOW_UP: await LeadModel.countDocuments({ tenantId, stage: 'FOLLOW_UP' }),
      APPLICATION_STARTED: await LeadModel.countDocuments({ tenantId, stage: 'APPLICATION_STARTED' }),
      ADMISSION_IN_PROGRESS: await LeadModel.countDocuments({ tenantId, stage: 'ADMISSION_IN_PROGRESS' }),
      CONVERTED: convertedStudents,
      LOST: lostLeads
    };

    return {
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        qualifiedLeads,
        followUpsPending,
        followUpsOverdue,
        followUpsToday,
        admissionsInProgress,
        convertedStudents,
        lostLeads
      },
      pipelineCounts,
      sourceBreakdown,
      recentLeads: recentLeadsRaw.map((l: any) => ({
        id: l._id.toString(),
        tenantId: l.tenantId.toString(),
        leadCode: l.leadCode,
        fullName: l.fullName,
        firstName: l.firstName,
        phone: l.phone,
        normalizedPhone: l.normalizedPhone || l.phone,
        email: l.email,
        source: l.source,
        stage: l.stage,
        courseInterest: l.courseInterestId ? { id: l.courseInterestId._id.toString(), title: l.courseInterestId.title } : undefined,
        counsellor: l.assignedTo ? { id: l.assignedTo._id.toString(), name: l.assignedTo.name, email: '' } : undefined,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      })),
      todaysFollowUps: todaysFollowUpsRaw.map((fu: any) => ({
        id: fu._id.toString(),
        tenantId: fu.tenantId.toString(),
        leadId: fu.leadId?._id?.toString() || '',
        lead: fu.leadId ? {
          id: fu.leadId._id.toString(),
          fullName: fu.leadId.fullName,
          phone: fu.leadId.phone,
          stage: fu.leadId.stage
        } : undefined,
        assignedTo: fu.assignedTo?._id?.toString() || '',
        counsellor: fu.assignedTo ? { id: fu.assignedTo._id.toString(), name: fu.assignedTo.name } : undefined,
        type: fu.type,
        dueAt: fu.dueAt,
        note: fu.note,
        status: fu.status,
        createdAt: fu.createdAt
      }))
    };
  }
}
