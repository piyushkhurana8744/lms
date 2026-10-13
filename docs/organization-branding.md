# DIDM LMS — Organization Branding & White-Label Website Architecture

## Overview

The **Organization Branding & White-Label Website Foundation (STEP 4C)** enables multi-tenant LMS workspaces to independently configure brand logos, favicons, typography, HEX color palettes, login page copy, browser metadata, and public website homepage layout.

---

## Data Models

### 1. `OrganizationBranding` (`@edtech/database`)
- **Collection**: `organizationbrandings`
- **Tenant Isolation**: `tenantIsolationPlugin` enforced on `{ tenantId: 1 }` (unique).
- **Fields**:
  - `tenantId`: ObjectId (ref: `Tenant`, unique index)
  - `logoMediaId`: ObjectId (ref: `Media`)
  - `faviconMediaId`: ObjectId (ref: `Media`)
  - `organizationName`: String (1–100 chars)
  - `primaryColor`: String (HEX, default `#BE1E2E`)
  - `secondaryColor`: String (HEX, default `#1F2937`)
  - `accentColor`: String (HEX, default `#F59E0B`)
  - `backgroundColor`: String (HEX)
  - `surfaceColor`: String (HEX)
  - `textColor`: String (HEX)
  - `fontFamily`: String (`Inter`, `Poppins`, `Roboto`, `System`)
  - `loginPage`: `{ showLogo: Boolean, headline: String, description: String, backgroundImageMediaId: ObjectId }`
  - `browser`: `{ title: String, faviconMediaId: ObjectId }`
  - `social`: `{ ogImageMediaId: ObjectId, twitterImageMediaId: ObjectId }`
  - `createdBy`, `updatedBy`: ObjectId (ref: `User`)

### 2. `OrganizationWebsite` (`@edtech/database`)
- **Collection**: `organizationwebsites`
- **Tenant Isolation**: `tenantIsolationPlugin` enforced on `{ tenantId: 1 }` (unique).
- **Fields**:
  - `tenantId`: ObjectId (ref: `Tenant`, unique index)
  - `enabled`: Boolean (default `true`)
  - `homepage`: `{ heroTitle: String, heroSubtitle: String, heroImageMediaId: ObjectId, showFeaturedCourses: Boolean, featuredCourseIds: ObjectId[], showCategories: Boolean, showWhyChooseUs: Boolean, showTestimonials: Boolean, showContactSection: Boolean }`
  - `navigation`: `{ showCourses: Boolean, coursesLabel: String, customLinks: [{ label: String, url: String, openInNewTab: Boolean }] }`
  - `footer`: `{ description: String, copyrightText: String, showSocialLinks: Boolean }`
  - `seo`: `{ title: String, description: String, keywords: String[], ogImageMediaId: ObjectId }`
  - `createdBy`, `updatedBy`: ObjectId (ref: `User`)

---

## API Endpoints

### Protected Admin Settings Routes
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organization/settings/branding` | `organization.branding.view` | Retrieves tenant branding configuration |
| `PATCH` | `/api/v1/organization/settings/branding` | `organization.branding.update` | Updates tenant branding configuration |
| `POST` | `/api/v1/organization/settings/branding/reset` | `organization.branding.update` | Resets branding to platform defaults |
| `GET` | `/api/v1/organization/settings/website` | `organization.website.view` | Retrieves tenant website configuration |
| `PATCH` | `/api/v1/organization/settings/website` | `organization.website.update` | Updates tenant website configuration |

### Public Unauthenticated Visitor Routes
| Method | Endpoint | Tenant Resolution | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/tenant/branding` | `publicTenantResolverMiddleware` | Returns sanitized tenant branding for web app theme |
| `GET` | `/api/v1/public/tenant/website` | `publicTenantResolverMiddleware` | Returns sanitized tenant homepage & SEO config |

---

## Storage & Media Integration

Branding assets (Logo, Favicon, Hero Graphic, Login Background, OG Image) use the organization's object storage provider established in STEP 4B (Cloudflare R2 or Amazon S3).

- All media uploads go through `MediaService.uploadMedia()` via `/api/v1/media/upload`.
- Every media asset reference is validated to ensure `media.tenantId === currentTenantId`. Cross-tenant media references are rejected with a `400 Bad Request`.

---

## Security Guarantees

1. **Strict Tenant Isolation**: All admin mutations resolve `tenantId` from `WorkspaceContext.currentTenantId`. Client attempts to inject `tenantId` in payloads are stripped by Zod schemas.
2. **RBAC Control**: Only `TENANT_ADMIN` can modify branding or website configuration. `INSTRUCTOR` and `STUDENT` roles receive `403 Forbidden`.
3. **Color & URL Sanitization**: HEX color validation enforces standard format (`#BE1E2E`) and rejects `javascript:`, `url()`, or `<svg>`. Link URLs accept only `http://` or `https://` protocols and reject `javascript:` or `data:` URLs.
4. **Audit Logging**: Structured events logged for all mutations:
   - `organization.branding.updated`
   - `organization.branding.reset`
   - `organization.website.updated`
