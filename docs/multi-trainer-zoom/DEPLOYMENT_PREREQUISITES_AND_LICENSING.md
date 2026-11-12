# Multi-Trainer Zoom Hosting: Deployment Prerequisites & Licensing Decisions

## Executive Overview

To successfully operate multi-trainer Zoom hosting in production, specific Zoom account tiers, app types, and OAuth scopes are required. This document outlines the exact deployment prerequisites and licensing requirements to avoid runtime blockers.

---

## 1. Zoom Account Plan Requirements

| Plan Tier | Multi-Trainer Support | Concurrent Classes | Cloud Recording | Recommendation |
|---|---|---|---|---|
| **Zoom Basic (Free)** | **No** (1 user only) | No (1 meeting at a time) | No (Local only) | **Incompatible**. Cannot support institute multi-trainer hosting. |
| **Zoom Pro (1 license)** | **No** (Single host) | No (1 meeting at a time) | Yes (5 GB) | **Incompatible** for multiple concurrent trainers. |
| **Zoom Pro (Multi-license)** | **Yes** (Add licenses per trainer) | Yes (1 meeting per licensed trainer) | Yes (5 GB shared) | **Compatible** for small academies (2–9 trainers). |
| **Zoom Business / Workplace** | **Yes** (10+ licenses) | Yes (1 concurrent meeting per trainer) | Yes (unlimited / 5 GB+ per user) | **Recommended for DIDM LMS**. |
| **Zoom Enterprise** | **Yes** (250+ licenses) | Yes | Yes | Supported. |

### Rule of Thumb
An institute must purchase **one Licensed seat per active concurrent trainer**.
- If DIDM has 5 trainers teaching batches simultaneously at 10:00 AM, the Zoom account must have at least 5 `Licensed` users.
- If a trainer only has a `Basic` user in the Zoom account, Zoom enforces a 40-minute duration limit and prevents cloud recording. The LMS will detect this and flag the trainer as `ineligible`.

---

## 2. Zoom Marketplace App Configuration

To enable the LMS to create and manage meetings under different trainers, the Zoom App in the Zoom App Marketplace must be configured correctly:

### 2.1 App Type
- **Required**: **Account-Level OAuth App** OR **Server-to-Server OAuth App**.
- **DO NOT USE**: User-Level OAuth App.
  - *Reason*: A User-Level OAuth app only authorizes actions on `/users/me`. It cannot create meetings on behalf of other trainers (`/users/{trainerUserId}/meetings`).

### 2.2 Required Scopes
Configure the following granular scopes in the Zoom Marketplace app build flow:

1. **User Management**:
   - `user:read:admin` (or `user:read`): Allows the LMS to query user existence, verify membership in the institute, and inspect `type` (`1` vs `2`).
2. **Meeting Management**:
   - `meeting:write:admin` (or `meeting:write`): Allows the LMS to create meetings under any trainer's user ID (`/users/{trainerUserId}/meetings`).
   - `meeting:read:admin` (or `meeting:read`): Allows the LMS to query meeting details and join parameters.
3. **Reporting & Attendance**:
   - `report:read:admin`: Allows the LMS to download participant join/leave times for attendance evidence.
4. **Cloud Recording**:
   - `recording:read:admin` (or `recording:read`): Allows the LMS to download and stream cloud recordings.

### 2.3 Redirect & Webhook URLs
- **OAuth Callback URL**:
  `https://<YOUR_API_DOMAIN>/api/v1/integrations/connections/zoom/callback`
- **Webhook Endpoint URL**:
  `https://<YOUR_API_DOMAIN>/api/v1/integrations/webhooks/zoom`
- **Subscribed Events**:
  - `meeting.started`
  - `meeting.ended`
  - `meeting.participant_joined`
  - `meeting.participant_left`
  - `recording.completed`
  - `endpoint.url_validation`

---

## 3. Trainer Onboarding & Provisioning Runbook

When an institute hires or assigns a new trainer:

1. **Step 1 (Zoom Console)**:
   The IT Administrator goes to the Zoom Admin Console (`zoom.us/account/user`) and adds the trainer:
   - Email: `trainer@didm.in`
   - User Type: Select **Licensed** (Type 2).
2. **Step 2 (Trainer Email Acceptance)**:
   The trainer receives the Zoom invitation email and clicks **Accept Invitation** to join the institute's Zoom account.
3. **Step 3 (LMS Mapping)**:
   In DIDM LMS:
   - Navigate to **Admin Settings → Integrations → Trainer Zoom Host Management**.
   - Click **Map Trainer Account**.
   - Select the LMS instructor from the dropdown.
   - Enter their Zoom email or Zoom User ID.
   - Click **Verify & Bind Account**.
4. **Step 4 (Validation)**:
   The LMS queries the Zoom API, confirms the user is `status: active` and `type: Licensed`, and marks `Host Eligibility: Eligible Host`.
5. **Step 5 (Automatic Scheduling)**:
   Any class or batch assigned to this trainer will now automatically have its Zoom meetings provisioned under this trainer's Zoom account!

---

## 4. Operational Fallback Behavior

If an instructor's Zoom license expires, or if an unmapped instructor is assigned to a class:
- **Default Strict Mode**: Meeting creation fails with an explicit error: `Trainer is not configured as an eligible Licensed Zoom host`.
- **Optional Admin Fallback Mode**: If the institute enables `allowAdminFallbackHost: true` in integration connection settings, the meeting is scheduled under the institute's central administrative account with an explicit audit warning: `FALLBACK_ADMIN_HOST_USED`.

