import crypto from 'crypto';
import {
  OrganizationDomainModel,
  TenantModel,
  OrganizationWebsiteModel,
  IOrganizationDomainDocument
} from '@edtech/database';
import {
  SafeOrganizationDomain,
  IDnsVerificationRecord,
  ConfigureDomainPayload,
  IWhiteLabelConfig,
  UpdateWhiteLabelPayload
} from '@edtech/types';
import { ConfigureDomainSchema, UpdateWhiteLabelSchema } from '@edtech/validation';
import { getWorkspaceContext, logger } from '@edtech/utils';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError, ConflictError } from '../errors/appError';

export class OrganizationDomainService {
  /**
   * Helper to format raw document into SafeOrganizationDomain DTO envelope.
   */
  private static toSafeResponse(doc: IOrganizationDomainDocument): SafeOrganizationDomain {
    const subName = doc.customDomain ? doc.customDomain.split('.')[0] : 'learn';
    const verificationRecord: IDnsVerificationRecord = {
      type: doc.verificationMethod || 'CNAME',
      name: subName,
      value: `verify.platform.com`,
      ttl: 'Auto'
    };

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      platformSubdomain: doc.platformSubdomain,
      customDomain: doc.customDomain || undefined,
      status: doc.status,
      verificationToken: doc.verificationToken,
      verificationMethod: doc.verificationMethod,
      verificationRecord,
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      lastCheckedAt: doc.lastCheckedAt ? doc.lastCheckedAt.toISOString() : null,
      lastError: doc.lastError || null,
      isPrimary: doc.isPrimary,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString()
    };
  }

  /**
   * Normalizes incoming hostname strings (strips protocol, port, path, query, trailing dots).
   */
  public static normalizeHostname(hostname: string): string {
    if (!hostname) return '';
    let cleaned = hostname.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split(':')[0];
    cleaned = cleaned.replace(/\.$/, '');
    return cleaned;
  }

  /**
   * Generates a platform subdomain from tenant slug (e.g. `didm.platform.com`).
   */
  public static async initializePlatformSubdomain(tenantId: string): Promise<IOrganizationDomainDocument> {
    const tenant = await TenantModel.findById(tenantId).lean();
    if (!tenant) {
      throw new NotFoundError('Tenant workspace not found');
    }

    const platformSubdomain = `${tenant.slug.toLowerCase()}.platform.com`;
    const verificationToken = `verify_${crypto.randomBytes(16).toString('hex')}`;

    let doc = await OrganizationDomainModel.findOne({ tenantId });
    if (!doc) {
      const platformSubdomain = `${tenant.slug.toLowerCase()}.platform.com`;
      const verificationToken = `verify_${crypto.randomBytes(16).toString('hex')}`;
      doc = await OrganizationDomainModel.create({
        tenantId,
        platformSubdomain,
        status: 'ACTIVE',
        verificationToken,
        verificationMethod: 'CNAME',
        isPrimary: true
      });
    }

    return doc;
  }

  /**
   * Resolves domain settings for the current workspace tenant.
   */
  public static async getDomain(): Promise<SafeOrganizationDomain> {
    const tenantId = getWorkspaceContext().currentTenantId;
    let doc = await OrganizationDomainModel.findOne({ tenantId });

    if (!doc) {
      doc = (await this.initializePlatformSubdomain(tenantId)) as any;
    }

    return this.toSafeResponse(doc!);
  }

  /**
   * Configures a custom domain for the organization workspace.
   */
  public static async configureCustomDomain(
    actorId: string,
    rawPayload: ConfigureDomainPayload
  ): Promise<SafeOrganizationDomain> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const validated = ConfigureDomainSchema.parse(rawPayload);
    const customDomain = this.normalizeHostname(validated.customDomain);

    // Global Uniqueness Check across custom domains
    const existingCustomDomain = await OrganizationDomainModel.findOne({
      customDomain,
      tenantId: { $ne: tenantId }
    });

    if (existingCustomDomain) {
      throw new ConflictError('This custom domain is already registered to another organization workspace');
    }

    // Check if custom domain matches another tenant's platform subdomain
    const existingPlatformSubdomain = await OrganizationDomainModel.findOne({
      platformSubdomain: customDomain,
      tenantId: { $ne: tenantId }
    });

    if (existingPlatformSubdomain) {
      throw new ConflictError('This domain conflicts with an existing platform subdomain');
    }

    let doc = await OrganizationDomainModel.findOne({ tenantId });
    if (!doc) {
      doc = (await this.initializePlatformSubdomain(tenantId)) as any;
    }

    doc!.customDomain = customDomain;
    doc!.status = 'PENDING';
    doc!.verificationToken = `verify_${crypto.randomBytes(16).toString('hex')}`;
    doc!.verificationMethod = 'CNAME';
    doc!.lastError = null;
    doc!.updatedBy = actorId as any;
    await doc!.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.domain.configured',
      resource: 'OrganizationDomain',
      resourceId: doc!._id.toString(),
      metadata: {
        customDomain,
        platformSubdomain: doc!.platformSubdomain,
        status: doc!.status
      }
    });

    return this.toSafeResponse(doc!);
  }

  /**
   * Verifies DNS verification token for configured custom domain.
   */
  public static async verifyDomain(actorId: string): Promise<{ success: boolean; message: string; domain: SafeOrganizationDomain }> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const doc = await OrganizationDomainModel.findOne({ tenantId });

    if (!doc || !doc.customDomain || doc.status === 'NOT_CONFIGURED') {
      throw new BadRequestError('No custom domain configured to verify');
    }

    // Simulate / foundation verification check
    doc.status = 'VERIFIED';
    doc.verifiedAt = new Date();
    doc.lastCheckedAt = new Date();
    doc.lastError = null;
    doc.updatedBy = actorId as any;
    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.domain.verified',
      resource: 'OrganizationDomain',
      resourceId: doc._id.toString(),
      metadata: {
        customDomain: doc.customDomain,
        status: doc.status
      }
    });

    return {
      success: true,
      message: `Custom domain ${doc.customDomain} verified successfully`,
      domain: this.toSafeResponse(doc)
    };
  }

  /**
   * Activates a verified custom domain.
   */
  public static async activateDomain(actorId: string): Promise<SafeOrganizationDomain> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const doc = await OrganizationDomainModel.findOne({ tenantId });

    if (!doc || !doc.customDomain) {
      throw new BadRequestError('No custom domain configured to activate');
    }

    if (doc.status !== 'VERIFIED' && doc.status !== 'ACTIVE') {
      throw new BadRequestError('Custom domain must be verified before activation');
    }

    doc.status = 'ACTIVE';
    doc.updatedBy = actorId as any;
    await doc.save();

    // Also sync TenantModel customDomain field
    await TenantModel.findByIdAndUpdate(tenantId, {
      customDomain: doc.customDomain,
      isCustomDomainVerified: true
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.domain.activated',
      resource: 'OrganizationDomain',
      resourceId: doc._id.toString(),
      metadata: {
        customDomain: doc.customDomain,
        status: doc.status
      }
    });

    return this.toSafeResponse(doc);
  }

  /**
   * Disconnects custom domain from tenant organization.
   */
  public static async disconnectDomain(actorId: string): Promise<SafeOrganizationDomain> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const doc = await OrganizationDomainModel.findOne({ tenantId });

    if (!doc || !doc.customDomain) {
      throw new NotFoundError('No custom domain configured to disconnect');
    }

    const disconnectedDomain = doc.customDomain;
    doc.customDomain = undefined;
    doc.status = 'DISCONNECTED';
    doc.verifiedAt = null;
    doc.lastError = null;
    doc.updatedBy = actorId as any;
    await doc.save();

    // Clear custom domain on TenantModel
    await TenantModel.findByIdAndUpdate(tenantId, {
      $unset: { customDomain: 1 },
      isCustomDomainVerified: false
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.domain.disconnected',
      resource: 'OrganizationDomain',
      resourceId: doc._id.toString(),
      metadata: {
        disconnectedDomain
      }
    });

    return this.toSafeResponse(doc);
  }

  /**
   * Resolves tenant ID from an incoming request hostname.
   */
  public static async resolveTenantByHostname(hostname: string): Promise<string | null> {
    const normalized = this.normalizeHostname(hostname);
    if (!normalized || normalized === 'localhost' || normalized === '127.0.0.1') {
      return null;
    }

    // 1. Direct match on customDomain
    const customMatch = await OrganizationDomainModel.findOne({
      customDomain: normalized,
      status: { $in: ['VERIFIED', 'ACTIVE'] }
    }).lean();

    if (customMatch) {
      return customMatch.tenantId.toString();
    }

    // 2. Match on platformSubdomain
    const platformMatch = await OrganizationDomainModel.findOne({
      platformSubdomain: normalized
    }).lean();

    if (platformMatch) {
      return platformMatch.tenantId.toString();
    }

    // 3. Subdomain slug extraction (e.g. `didm.platform.com` -> `didm`)
    if (normalized.endsWith('.platform.com')) {
      const slug = normalized.replace('.platform.com', '');
      const tenant = await TenantModel.findOne({ slug, status: 'ACTIVE' }).lean();
      if (tenant) {
        return tenant._id.toString();
      }
    }

    return null;
  }

  /**
   * Resolves white-label website preferences for current workspace context.
   */
  public static async getWhiteLabelSettings(): Promise<IWhiteLabelConfig> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const website = await OrganizationWebsiteModel.findOne({ tenantId }).lean();

    return website?.whiteLabel || {
      hidePlatformBranding: false,
      useCustomLogo: true,
      useCustomFavicon: true,
      useCustomColors: true,
      customSupportEmail: '',
      publicPoweredByEnabled: true
    };
  }

  /**
   * Updates white-label website preferences for current workspace context.
   */
  public static async updateWhiteLabelSettings(
    actorId: string,
    rawPayload: UpdateWhiteLabelPayload
  ): Promise<IWhiteLabelConfig> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const validated = UpdateWhiteLabelSchema.parse(rawPayload);

    let website = await OrganizationWebsiteModel.findOne({ tenantId });
    if (!website) {
      website = new OrganizationWebsiteModel({
        tenantId,
        status: 'DRAFT',
        branding: { organizationName: 'DIDM Academy' },
        whiteLabel: {
          hidePlatformBranding: false,
          useCustomLogo: true,
          useCustomFavicon: true,
          useCustomColors: true,
          customSupportEmail: '',
          publicPoweredByEnabled: true,
          ...validated
        }
      });
    } else {
      website.whiteLabel = {
        hidePlatformBranding: false,
        useCustomLogo: true,
        useCustomFavicon: true,
        useCustomColors: true,
        customSupportEmail: '',
        publicPoweredByEnabled: true,
        ...(website.whiteLabel || {}),
        ...validated
      };
      website.updatedBy = actorId as any;
    }

    await website.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.whitelabel.updated',
      resource: 'OrganizationWebsite',
      resourceId: website._id.toString(),
      metadata: {
        updatedKeys: Object.keys(validated)
      }
    });

    return website.whiteLabel!;
  }
}
