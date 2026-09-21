# TecresTrackIT AMS — Frontend/Backend Split: Full Detailed Implementation Plan

## Context

The current codebase (`ink-asset-management`) is a single Next.js monolith. Two sibling repos already exist for the split — `asset_management_frontend` and `asset_management_backend` — but both are **completely empty** (`git init` only, no code). This is a from-scratch build guided by the monolith's feature set, not a mechanical file move, rebranded as **TecresTrackIT AMS**.

Verified problems in the monolith that this plan must not carry forward (confirmed by direct code read, not assumption):
- **Real cross-org data leakage today**: `src/app/(dashboard)/settings/page.tsx:14` and `src/app/api/settings/route.ts:27` both run `db.select().from(organizations).limit(1)` — zero `orgId` filter, grabbing an arbitrary org. Dashboard/reports/audits queries follow the same unscoped pattern.
- `users.email` (`src/db/schema/index.ts:106`) has no uniqueness constraint at all — not even global.
- `passwordResetTokens` table exists (`schema/index.ts:130`) but no route ever reads/writes it — password reset doesn't work today.
- No 2FA/TOTP anywhere. Auth is bcrypt + a DB-backed `sessions` cookie, no JWT.
- `audits` (`schema/index.ts:223`) is single-actor: `performedBy` is both creator and scanner — no assign-to-staff / verify-by-manager concept, no remarks column at all.
- `organizations` (`schema/index.ts:22`) has `currency`/`currencySymbol` defaulting to `USD`/`$`, no theme/brand-color columns, and `permissions.ts` has no value-visibility permission — every role sees full asset values today.
- Reports/Labels page fetches and renders assets completely unfiltered — no date range, category, or assignee filters exist.
- No platform-admin (cross-org) concept exists at all — `permissions.ts` only knows `super_admin|admin|asset_manager|staff`, all scoped to a single org.

This plan is the complete technical specification for both new repos — full schema, every API endpoint, every frontend page/component, the security model, and every new feature — detailed enough to execute directly. No implementation calendar is included by request; sequencing is left to execution.

---

## 0. Product Naming

- **Product/platform name: "TecresTrackIT AMS"** — used everywhere there is no tenant context yet: browser tab title, the platform-admin login and dashboard, transactional emails sent *from* the platform (invite emails, platform-level alerts), the marketing/landing page, and a small "Powered by TecresTrackIT AMS" footer on tenant-facing PDF reports/labels.
- **Per-organization branding** — once an organization completes onboarding, their own **name, logo, and brand colors** (set in the onboarding wizard, §H) drive everything inside their tenant instance: sidebar, header, in-app PDF/Excel export headers, browser tab favicon-adjacent title (`{Org Name} · TecresTrackIT AMS`), login screen for that org's users (shown once an org slug/subdomain is resolved).
- The internal operator team (what the earlier draft called "Aplify") is renamed **Tecres platform admin** / `platform_admins` — this is Tecres's own staff monitoring all customer organizations, not a customer-facing concept.
- Default asset tag prefix at org creation defaults to a slug derived from the **org's own name** (e.g. "Acme Logistics" → `ACME-AST-0001`), not a Tecres-branded prefix — tenants own their asset-tag namespace.

---

## A. Architecture

- **`asset_management_backend`**: Node 20+ / Express / Drizzle ORM / Postgres. Owns all business logic, DB access, file storage, email, TOTP, JWT issuance. Stateless — any instance serves any request, no sticky sessions.
- **`asset_management_frontend`**: Vite + React 19 + React Router (SPA, no SSR). TanStack Query (server state) + Zustand (client/UI state) + Tailwind + Radix (component base) + recharts + framer-motion + sonner + jspdf/xlsx + jsbarcode/qrcode/html5-qrcode (all carried over as pure client-side libs from the monolith).
- Platform-admin and onboarding are **route trees inside these same two repos**: `/platform/*` and `/onboarding/*` on the frontend, `/api/platform/*` on the backend, each behind their own guard middleware — not separate repos/services.
- **Deployment**: frontend as a static build behind a CDN (Vercel/Netlify/CloudFront); backend as a horizontally-scalable containerized Express app behind a load balancer; single Postgres database with application-layer tenant isolation (not per-tenant DBs, not Postgres RLS at this stage); S3 for file storage with a Postgres-bytea fallback for local dev (mirrors the monolith's existing `storage.ts` pattern); Redis recommended (not required) for rate-limit counters and refresh-token/TOTP-challenge caching.
- **Env separation**: backend holds all secrets — `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, a **separate** `PLATFORM_ADMIN_JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, SMTP/Resend/SES credentials, `AWS_S3_*`, `CORS_ALLOWED_ORIGINS`, `COOKIE_DOMAIN`. Frontend env is `VITE_`-prefixed and public-only (`VITE_API_BASE_URL`, `VITE_APP_ENV`) — no secret ever ships to the browser.

---

## B. Complete Database Schema

The monolith's 18 tables are the baseline. Below is the **full target schema** for the new backend — every table it needs, marking `[NEW]` tables and `[ALTERED]` columns so nothing has to be cross-referenced against the old file.

### Carried over unchanged (columns exactly as in `schema/index.ts`)
- **`departments`**: id, orgId, name, code, description, managerId, createdAt, updatedAt
- **`locations`**: id, orgId, name, code, address, city, state, country, zipCode, building, floor, room, isActive, createdAt, updatedAt
- **`categories`**: id, orgId, name, code, icon, color, description, usefulLifeMonths (default 36), depreciationRate (numeric 5,2, default 20.00), createdAt, updatedAt
- **`vendors`**: id, orgId, name, code, contactPerson, email, phone, website, address, notes, isActive, createdAt, updatedAt
- **`assets`**: id, orgId, assetTag, name, description, categoryId, departmentId, locationId, vendorId, custodianId, status(available|in_use|in_maintenance|reserved|disposed|lost), condition(excellent|good|fair|poor|damaged), brand, model, serialNumber, macAddress, ipAddress, purchaseDate, purchasePrice(12,2), currentValue(12,2), salvageValue(12,2), depreciationType(straight_line), warrantyExpiry, warrantyNotes, barcodeData, qrCodeData, imageUrl, customFields(jsonb), notes, createdAt, updatedAt
- **`assetAssignments`**: id, orgId, assetId, userId(custodian), assignedBy, assignedAt, expectedReturnDate, returnedAt, conditionOut, conditionIn, notes, receiptNo, signatureUrl, createdAt
- **`maintenanceRecords`**: id, orgId, assetId, title, description, maintenanceType(preventive|corrective|calibration|inspection|upgrade), status(scheduled|in_progress|waiting_parts|completed|cancelled), priority(low|medium|high|critical), scheduledDate, startDate, completedDate, cost(12,2), partsUsed, technicianName, vendorId, performedBy, notes, invoiceFileId, createdAt, updatedAt
- **`auditItems`**: id, auditId, assetId, status(pending|matched|missing|relocated|damaged), scannedAt, scannedBy, scannedLocationId, conditionFound, notes
- **`storedFiles`** / **`assetFiles`**: hybrid S3/Postgres-bytea storage, exactly as-is (id, orgId, filename, originalName, mimeType, sizeBytes, storageType, s3Key, s3Bucket, data(bytea), sha256Hash, uploaderId, createdAt / bridge table with fileType)
- **`activityLogs`**: id, orgId, userId, action, entityType, entityId, entityName, details(jsonb), ipAddress, createdAt — generic enough to log every new security + audit-workflow event without a schema change
- **`notifications`**: id, orgId, userId, title, message, type(info|warning|success|danger), isRead, link, createdAt
- **`systemSettings`**: id, orgId, key, value(jsonb), createdAt, updatedAt

### `[ALTERED]` organizations
```
id, name, slug (unique), logoUrl,
currency (default "NGN"),            -- was "USD"
currencySymbol (default "₦"),        -- was "$"
timezone (default "UTC"), dateFormat, assetQuota (default 5000), userQuota (default 100), settings(jsonb),
primaryColor varchar(20) default '#2563eb',      -- [NEW] theme
accentColor varchar(20),                          -- [NEW] theme
sidebarColor varchar(20),                         -- [NEW] theme
onboardingCompletedAt timestamp,                  -- [NEW] null until wizard finished
planStatus varchar(30) default 'active',          -- [NEW] active|suspended|expired
planExpiresAt timestamp,                          -- [NEW]
lastActivityAt timestamp,                         -- [NEW] updated opportunistically on login/API activity
createdAt, updatedAt
```

### `[ALTERED]` users
```
id, orgId, name, email, passwordHash, role(super_admin|admin|asset_manager|staff),
employeeId, title, departmentId, phone, avatarUrl, isActive,
totpEnabled boolean default false,        -- [NEW] denormalized flag mirroring totp_credentials.status
failedLoginAttempts integer default 0,    -- [NEW]
lockedUntil timestamp,                    -- [NEW]
createdAt, updatedAt
-- [ALTERED] add UNIQUE constraint on (orgId, email) — currently has none at all
```

### `[ALTERED]` audits — the core change for the assign/verify workflow
```
id, orgId, name, code,
status varchar(50) default 'draft',   -- [ALTERED] enum: draft|assigned|in_progress|submitted|verified|rejected|cancelled
                                        --   (was: draft|in_progress|completed|cancelled)
scopeType, scopeId,
totalExpected, totalScanned, totalMatched, totalMissing, totalDiscrepant,
assignedTo text references users.id,      -- [NEW] staff performing the count
assignedBy text references users.id,      -- [NEW] manager/admin who delegated
assignedAt timestamp,                     -- [NEW]
startedAt,                                 -- kept, set on assigned→in_progress
submittedAt timestamp,                    -- [NEW]
submittedBy text references users.id,     -- [NEW] normally = assignedTo, explicit for traceability across reassignment
verifiedAt timestamp,                     -- [NEW]
verifiedBy text references users.id,      -- [NEW] manager/admin who approves — must differ from submittedBy
staffRemark text,                         -- [NEW] required on submit
verifierRemark text,                      -- [NEW] optional on verify, required on reject
rejectionReason text,                     -- [NEW] structured reason, kept distinct from verifierRemark
performedBy,                               -- kept, repurposed: "who did the most recent scan pass" (survives reassignment)
completedAt,                                -- kept, repurposed: set = verifiedAt on the terminal `verified` state
notes,
createdAt
```

### `[NEW]` audit_status_history
Append-only log of every state transition (a single audit can cycle reject→resubmit multiple times; the `audits` row can only hold the *latest* remark, so full history lives here, not in `activityLogs` which is a general-purpose polymorphic feed unsuited as the primary audit-approval-history source).
```
id, auditId references audits.id (cascade),
fromStatus varchar(50), toStatus varchar(50),
actorId references users.id,
remark text,
createdAt
```

### `[NEW]` password_reset_tokens (fixes the existing dead table)
```
id, userId references users.id (cascade),
tokenHash varchar(255) unique,   -- [FIXED] hashed, not raw as the current dead table would store
expiresAt timestamp,
usedAt timestamp,                -- [NEW]
requestedIp varchar(100),        -- [NEW]
createdAt
```

### `[NEW]` totp_credentials
```
id, userId text unique references users.id (cascade),
secretEncrypted text,           -- encrypted at rest with TOTP_ENCRYPTION_KEY, never raw base32 in the DB
status varchar(20) default 'pending',  -- pending|active
verifiedAt timestamp,
createdAt
```

### `[NEW]` totp_recovery_codes
```
id, userId references users.id (cascade),
codeHash text,      -- argon2/bcrypt hash of a one-time recovery code, never plaintext
usedAt timestamp,
createdAt
```
Ten codes generated at enrollment, shown once, regenerable (invalidates the prior set).

### `[NEW]` refresh_tokens (replaces `sessions`' role entirely in the JWT model)
```
id, userId references users.id (cascade),
tokenHash text,             -- sha256 of the actual refresh token, never stored raw
familyId text,              -- groups a rotation chain; reuse of ANY ancestor revokes the whole family
replacedByTokenId text,     -- self-FK, set when rotated
revokedAt timestamp,
expiresAt timestamp,
ipAddress varchar(100),
userAgent text,
createdAt
```
`sessions` table is **retired**, not extended — JWT access tokens are stateless; rotation/family tracking has no equivalent in the old bare-session-id model.

### `[NEW]` org_invites
```
id, orgId references organizations.id (cascade),
email varchar(255),
role varchar(50),                 -- role the invitee will receive
invitedBy references users.id,
tokenHash text,
status varchar(20) default 'pending',  -- pending|accepted|expired|revoked
expiresAt timestamp,
acceptedAt timestamp,
createdAt
```
Gives new staff a real "set your own password" link instead of an admin typing a password into a form — a natural companion to the password-reset/TOTP rework, not explicitly requested but structurally cheap since `users` is already being touched. Confirm during review; trivial to descope if unwanted.

### `[NEW]` platform_admins (Tecres staff — separate identity space)
```
id, name, email unique, passwordHash,
totpSecret text (encrypted), totpEnabled boolean default false,
recoveryCodesHash jsonb default [],
role varchar(30) default 'platform_support',  -- platform_owner|platform_support
isActive boolean default true,
createdAt, updatedAt
```
Deliberately **not** part of `users`/the 4-role enum — no `orgId`, no shared table, no shared role type. This is the structural guarantee a tenant account can never be confused with or escalated into a platform admin.

### `[NEW]` platform_admin_activity_logs
```
id, platformAdminId references platform_admins.id,
action varchar(50),   -- org_suspended|org_reactivated|password_force_reset|quota_adjusted|alert_resolved
targetOrgId text, targetUserId text,
details jsonb default {},
ipAddress varchar(100),
createdAt
```
Kept separate from tenant `activityLogs` so platform actions are never visible through — or corruptible via — a tenant's own activity trail.

### `[NEW]` platform_alerts
```
id, orgId text (nullable — some alerts are platform-wide),
type varchar(50),      -- quota_breach|failed_login_spike|plan_expired|stale_org|security_incident
severity varchar(20),  -- info|warning|critical
title, description text,
metadata jsonb default {},
status varchar(20) default 'open',   -- open|acknowledged|resolved
acknowledgedBy references platform_admins.id,
resolvedAt timestamp,
createdAt
```
Populated by a scheduled job (§I), never computed on the tenant request path.

No new quota-usage table: usage is computed live via `count(*)` against `assets`/`users` vs. `organizations.assetQuota`/`userQuota` — a denormalized counter would just drift.

---

## C. Security Architecture

**Password hashing**: argon2id (OWASP-recommended, memory-hard) — no bcrypt legacy to preserve since this is a new backend.

**Login flow** (email is unique per-org now, so login requires an org hint — slug or subdomain):
1. `POST /api/auth/login {orgSlug, email, password}` → rate-limited (per `orgSlug+email` **and** per IP) → generic `401` on any failure, never reveal which check failed → `failedLoginAttempts`/`lockedUntil` backoff after repeated failures.
2. Password success + TOTP not yet enrolled (first login only — mandatory, never optional in steady state) → short-lived `enrollmentToken` (JWT, 10 min, `purpose: totp_enroll`), forced enrollment before any real session is issued.
3. Password success + TOTP enrolled → short-lived `preAuthToken` (JWT, 5 min, `purpose: totp_challenge`, `userId` only) → `POST /api/auth/login/totp {code}`.
4. TOTP check: RFC 6238, ±1 step (30s) window, replay protection (reject a code reused within the same step — track last-used step per user), recovery-code fallback (hash-compare, single-use).
5. Full success → access JWT (15 min, `{sub, orgId, role}`) + opaque refresh token as `httpOnly, Secure, SameSite=None` cookie (cross-origin requirement) + a `refresh_tokens` row. Reset `failedLoginAttempts`.

**Refresh rotation + reuse detection**: every `/api/auth/refresh` call issues a new refresh token and revokes the old one (same `familyId`). A revoked token presented again is a theft signal → the **entire family** is revoked, forcing full re-login.

**Password reset** (actually wired up, unlike today): request → always `200` regardless of whether the account exists (no enumeration) → hashed token, 30–60 min TTL, emailed link → confirm → new password hashed, **all existing refresh tokens for that user revoked** → still must complete the normal TOTP challenge on next login.

**TOTP enrollment/disable**: `POST /api/auth/totp/enroll` generates a secret (otplib), returns a QR code (reusing the `qrcode` lib already in the stack) + manual-entry key; `POST /api/auth/totp/verify-enroll {code}` flips `status=active`, sets `users.totpEnabled=true`, returns 10 recovery codes once. Disabling requires re-auth (password + current TOTP code) and is logged as a security-sensitive event.

**Middleware chain** (in order): `helmet` → `cors` (explicit allowlist, `credentials: true`) → request-id/pino logger → global rate limiter + strict per-endpoint limiter on all auth/reset endpoints → `express.json` → zod validation middleware → `authenticate` (verify access JWT) → `loadOrgContext` (derives `orgId` **only from the verified JWT**, rejects with `ORG_SUSPENDED` if `planStatus==='suspended'`) → `authorize(permission)` (RBAC) → handler → centralized error handler. Platform routes use an entirely separate `authenticatePlatformAdmin`/`authorizePlatformAdmin` pair against `PLATFORM_ADMIN_JWT_SECRET`.

**Non-negotiables against cross-org leakage** (directly targets the confirmed `settings/route.ts` bug):
1. Every tenant query includes `eq(table.orgId, req.user.orgId)`, enforced via a `scopedDb(orgId)` wrapper that only exposes pre-scoped accessors — makes an unscoped query structurally awkward to write, not just a reviewer's job to catch.
2. `orgId` is derived only from the verified JWT; a tenant route never accepts a client-supplied `orgId`.
3. Client-supplied cross-referenced FKs (`categoryId`, `locationId`, etc.) are checked at the service layer for org match — Drizzle doesn't auto-filter this.
4. File-serving endpoints re-check the requester's `orgId` against the file record's `orgId` before streaming bytes, not just before listing.
5. Platform and tenant JWTs use different secrets/claims — structurally rejected by each other's verifier.
6. Rate-limit keys for login include `(orgSlug, email)`, not just IP.

---

## D. Audit Assignment/Verification Workflow

**States**: `draft → assigned → in_progress → submitted → verified` (terminal success), or `submitted → rejected → in_progress` (loop), or `→ cancelled` from any non-terminal state.

| Transition | Who | Effect |
|---|---|---|
| create → `draft` | admin / asset_manager / super_admin | audit + expected `auditItems` created from scope |
| `draft → assigned` | admin / asset_manager / super_admin | `assignedTo`, `assignedBy`, `assignedAt` set; assignee notified via `notifications` |
| `assigned → in_progress` | only `assignedTo` | scanning begins; per-item match logic ports near-verbatim from the monolith's `verify_scan` action |
| `in_progress → submitted` | only `assignedTo` | `submittedAt`/`submittedBy` set; **`staffRemark` required**; remaining `pending` items auto-flip to `missing`; items become immutable |
| `submitted → verified` | admin/asset_manager/super_admin, **never equal to `submittedBy`** (segregation of duties, enforced at instance level regardless of role) | `verifiedAt`/`verifiedBy` set, optional `verifierRemark`, `completedAt = verifiedAt` → **triggers report generation** |
| `submitted → rejected` | same segregation rule | **`rejectionReason` required**; assignee notified |
| `rejected → in_progress` | `assignedTo` | resumes; full history in `audit_status_history`, nothing overwritten |
| `* → cancelled` | admin/asset_manager/super_admin | only from non-terminal states |

**Report generation**: auto-triggered on `verified`. Contents: header (scope, assignee, verifier, all timestamps), full item list (status + condition found), staff remark, verifier remark, summary counts. Generated via the monolith's existing PDF export utility, persisted as a `storedFiles` row so verified reports become a retrievable list per org.

---

## E. RBAC Permission Matrix

Extends the monolith's `PermissionSet` (`permissions.ts`) — existing flags kept as-is except `canManageAudits`, which is retired and split three ways:

| Permission | super_admin | admin | asset_manager | staff |
|---|:---:|:---:|:---:|:---:|
| canManageOrg / canManageSettings | ✓ | ✓ | ✗ | ✗ |
| canCreateAsset / canEditAsset | ✓ | ✓ | ✓ | ✗ |
| canDeleteAsset | ✓ | ✓ | ✗ | ✗ |
| canCheckInOut | ✓ | ✓ | ✓ | ✗ |
| canScheduleMaintenance | ✓ | ✓ | ✓ | ✓ (request only) |
| canCompleteMaintenance | ✓ | ✓ | ✓ | ✗ |
| canManagePeople / canManageVendors | ✓ | ✓ | ✗ / ✓ | ✗ |
| canExportReports / canPrintLabels | ✓ | ✓ | ✓ | ✗ |
| **canAssignAudits** *(new, replaces canManageAudits)* | ✓ | ✓ | ✓ | ✗ |
| **canVerifyAudits** *(new)* | ✓ | ✓ | ✓ | ✗ — instance rule: verifier ≠ submitter |
| **canPerformAssignedAudit** *(new, ownership check not a role flag)* | ✓ | ✓ | ✓ | ✓ — any role can act on an audit assigned to them |
| **canViewAssetValuation** *(new)* | ✓ | ✓ | ✓ | ✗ — gates whether value fields are returned by the API at all |

`platform_admin` sits **entirely outside this matrix** with its own set (`canSuspendOrg`, `canForceResetPassword`, `canAdjustQuota`, `canResolveAlert`) behind a separate middleware — no special-casing needed inside the 4-role tenant matrix.

`canAccessRoute()` (path-string gating) is kept only as a frontend nav convenience; it is **not** the security boundary — that's the backend's `authorize()` middleware, which doesn't exist at all in the monolith today.

---

## F. Currency Handling

- Single currency per org, no FX conversion. `organizations.currency`/`currencySymbol` default to `NGN`/`₦` at the **DB column level and re-enforced server-side** on org creation (a client omitting the field must still land on NGN, not just a frontend form default).
- One shared util (`lib/currency.ts` both sides), upgraded from the monolith's `formatCurrency` to use `Intl.NumberFormat` keyed off the ISO `currency` code, falling back to symbol-prefix concatenation only for non-ISO codes. Every money-rendering component (dashboard, asset detail, reports, PDF/Excel exports) goes through this one function — never a literal `$` or ad hoc string build.
- **Value-hiding for staff is backend field-omission, not frontend hiding**: any response containing `currentValue`/`purchasePrice`/`salvageValue`/`totalValuation` runs through a role-keyed stripping step before serialization. For staff, the keys are **absent**, not null — a staff-role client hitting the API directly (curl, bypassing the UI) still cannot retrieve them. The dashboard's KPI grid conditionally renders the valuation card only when the field is present, so there's no "hidden" placeholder that itself hints a number exists.

---

## G. Reports & Labels Filtering

One shared backend query builder, one query-param shape, used identically by the Reports page, the Labels page, and both PDF/Excel export (so "download" always matches the current filter, unlike today's unfiltered dump):
```
GET /api/reports/assets?
  dateFrom=&dateTo=&dateField=purchaseDate|depreciationDate
  &categoryId=&custodianId=&auditAssigneeId=&locationId=
  &sortBy=purchaseDate|currentValue|name|assetTag&sortDir=asc|desc
  &page=&pageSize=
```
- "Depreciation date" isn't a stored column — computed as `purchaseDate + categories.usefulLifeMonths` inside the query (join to `categories` already required for the filter).
- `buildAssetReportQuery(orgId, filters)` starts from the mandatory `orgId` condition and conditionally ANDs in each optional filter.
- Filters live in the URL query string (shareable/bookmarkable): date-range picker with a purchase-date/depreciation-date toggle, category/location multi-select, a searchable staff/custodian combobox, sortable column headers on desktop and an explicit sort dropdown on the mobile card layout.
- `canViewAssetValuation=false` still strips value columns from this endpoint's output for staff, per §F — reports respect the same visibility rule as everywhere else.

---

## H. Onboarding Wizard (org self-serve)

Gated by `organizations.onboardingCompletedAt IS NULL`:
1. **Account + org creation** — admin name/email/password, **organization's own name** + slug (uniqueness checked live); org row created with `currency=NGN` default.
2. **Mandatory TOTP enrollment** — not skippable, not even for the very first admin; recovery codes shown once.
3. **Org profile** — currency (NGN preselected), timezone (reuses `timezones.ts` as-is), date format.
4. **Branding/theme** — **the org's own logo** upload + primary/accent/sidebar color pickers, with a live preview pane rendering a miniature sidebar/header mock; persisted on "Next" (not on every color-drag event, to avoid write-spam) into the new `organizations` theme columns.
5. **Optional seed data** — first location/category/department, skippable.
6. **Finish** — `onboardingCompletedAt` set, redirect to dashboard.

**Live theme application**: colors applied as CSS custom properties on `document.documentElement` by a `ThemeProvider` reading the org record (cached via TanStack Query); Tailwind classes reference the CSS vars so no component needs per-instance conditional styling for branding.

---

## I. Platform Admin Dashboard (Tecres)

- **Monitoring**: per-org asset/user counts vs. quota, `planStatus`/`planExpiresAt`, `lastActivityAt` staleness, login-failure rates, fleet-wide totals (orgs, users, assets).
- **Alert detection** runs as a scheduled job (e.g. every 15 min), never on the tenant request path:
  - Quota breach: org count ≥ 90%/100% of quota → idempotent `platform_alerts` insert (skip if an open alert of the same type already exists).
  - Failed-login spike: driven off `users.failedLoginAttempts`/`lockedUntil`, not log-scanning.
  - Plan expired: `planExpiresAt < now()` → flips `planStatus`, raises alert.
  - Stale org: `lastActivityAt` older than threshold → informational alert.
- **Remediation actions** (each writes a `platform_admin_activity_logs` row atomically with the mutation): suspend/reactivate org (enforced by `loadOrgContext` rejecting tenant calls with `ORG_SUSPENDED`); force-reset an org admin's password (reuses the emailed reset-token flow — auditable, not a silent change — plus immediate refresh-token revocation); adjust quotas; view an org's activity trail (read-only, platform-route-only). **Impersonating an org user is deliberately NOT one of these** — it was built and then removed on 2026-09-19 (signing into a customer account as them is a legal exposure no support convenience justifies). Force-reset-password is the supported way into a stuck account, precisely because the account owner sees it happen.

---

## J. UI/UX Upgrade

A cohesive design-system pass, not per-page patchwork:
- Extend the ported Radix/shadcn-style primitives with what the new features need: combobox, date-range picker, richer toast variants, stepper/wizard shell, segmented control (for role-scoped views on the audit page).
- All brand-facing surfaces (sidebar, header, buttons, focus rings) consume the CSS-variable theme so per-org branding is automatic everywhere.
- New surfaces needing first-class design attention: onboarding wizard (progress + live preview), audit assign/scan/verify screens (distinct layouts per actor role — assigner vs. assignee vs. verifier), Tecres platform dashboard + alerts feed, reports/labels filter bar.
- Carry over the monolith's proven responsive pattern (dual desktop-table/mobile-card layout) rather than reinventing.
- Standardize empty states, loading skeletons, and error toasts across all pages (inconsistent/absent today).

---

## K. Backend — Full Module & Endpoint Map

Folder structure:
```
src/
  config/        env.ts, database.ts, redis.ts, s3.ts
  db/
    schema/       organizations.ts, users.ts, assets.ts, audits.ts, security.ts (totp/refresh/reset), platform.ts, ...
    migrations/
  middleware/     helmet+cors setup, authenticate, loadOrgContext, authorize, authenticatePlatformAdmin, rateLimit, validate, errorHandler
  modules/        one folder per domain below, each with {name}.router.ts + {name}.service.ts + {name}.schema.ts (zod)
  lib/            currency.ts, email.ts, crypto.ts (token hashing), totp.ts
  jobs/           alertDetection.cron.ts, tokenCleanup.cron.ts
  app.ts / server.ts
```

| Module | Endpoints |
|---|---|
| **auth** | `POST /auth/login`, `POST /auth/login/totp`, `POST /auth/totp/enroll`, `POST /auth/totp/verify-enroll`, `POST /auth/totp/disable`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `GET /auth/me` |
| **organizations** | `GET /organizations/me` (profile+theme+plan), `PATCH /organizations/me` (profile), `PATCH /organizations/me/theme`, `POST /organizations` (self-serve onboarding step 1), `PATCH /organizations/me/onboarding-complete` |
| **users (people)** | `GET/POST /people`, `GET/PUT/DELETE /people/:id`, `POST /people/invite`, `POST /people/invite/:token/accept` |
| **departments / locations / categories / vendors** | standard `GET`, `POST /`, `PUT/DELETE /:id` per resource, all org-scoped |
| **assets** | `GET /assets` (filter/paginate), `POST /assets`, `GET/PUT/DELETE /assets/:id`, `GET /assets/:id/history`, `GET /assets/:id/maintenance` |
| **assignments** | `GET /assignments` (active+overdue), `POST /assignments/checkout`, `POST /assignments/checkin`, `GET /assignments/:id/receipt` |
| **maintenance** | `GET/POST /maintenance`, `PUT/DELETE /maintenance/:id` |
| **audits** | `GET/POST /audits`, `GET /audits/:id`, `PATCH /audits/:id/assign`, `POST /audits/:id/start`, `POST /audits/:id/scan`, `POST /audits/:id/submit`, `POST /audits/:id/verify`, `POST /audits/:id/reject`, `POST /audits/:id/cancel`, `GET /audits/:id/history`, `GET /audits/:id/report`, `GET /audits/trail` |
| **reports** | `GET /reports/assets` (shared filtered query, §G), `GET /reports/valuation-depreciation` |
| **labels** | `GET /labels/assets` (same filter shape as reports, feeds label-sheet generation) |
| **files** | `POST /files/upload`, `GET /files/:id` |
| **notifications** | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| **activity** | `GET /activity` |
| **dashboard** | `GET /dashboard/stats` (role-stripped per §F), `GET /dashboard/activity`, `GET /dashboard/charts` |
| **settings** | `GET /settings`, category/department/location CRUD (mirrors the resource modules above, aggregated view) |
| **search** | `GET /search?q=` |
| **platform** (Tecres, separate auth) | `POST /platform/auth/login`, `POST /platform/auth/login/totp`, `GET /platform/stats`, `GET /platform/orgs`, `POST /platform/orgs`, `GET /platform/orgs/:id`, `PATCH /platform/orgs/:id/status`, `PATCH /platform/orgs/:id/quotas`, `POST /platform/orgs/:id/users/:userId/force-reset`, `GET /platform/orgs/:id/activity`, `GET /platform/alerts`, `PATCH /platform/alerts/:id/resolve` |

---

## L. Frontend — Full Page & Component Map

Folder structure:
```
src/
  app/            router.tsx (guards: tenant / onboarding / platform trees), QueryClientProvider
  features/
    auth/          LoginPage, TotpChallengePage, TotpEnrollPage, ForgotPasswordPage, ResetPasswordPage
    onboarding/     OnboardingWizard (steps: Account, Totp, Profile, Branding, SeedData, Finish)
    dashboard/      DashboardPage, KpiCards (value card conditional per §F), ActivityFeed, DashboardCharts
    assets/         AssetsListPage, AssetDetailPage (tabs: Overview/History/Maintenance/Files/Audit/Activity), AssetCreatePage
    check-in-out/   CheckInOutPage, CameraScannerModal, ReceiptPrint
    maintenance/    MaintenancePage
    audits/         AuditsListPage, AssignAuditModal, StaffScanView (assignee), VerifyAuditView (verifier), AuditReportView
    reports/        ReportsPage (filter bar shared with labels/, §G)
    labels/         LabelsPage (reuses reports/ filter bar, barcode/QR sheet render)
    people/         PeoplePage, InvitePersonModal
    vendors/        VendorsPage
    settings/       SettingsPage (profile, categories/departments/locations, branding re-edit)
    platform/       PlatformLoginPage, PlatformDashboard, OrganizationsPage, OrgDetailPage, AlertsPage
  components/
    ui/             button, input, select, dialog, table, tabs, combobox[new], date-range-picker[new], stepper[new]
    layout/         AppShell, Sidebar, Header, MobileNav, MobileDrawer, CommandPalette
    common/         BarcodeViewer, QrCodeViewer, StatusBadge, ConditionBadge, CameraScannerModal
  lib/              api-client.ts (401→refresh→retry), currency.ts, permissions.ts, barcode.ts, export.ts, timezones.ts
  hooks/            useAuth, useCurrentUser, useOrgTheme, usePermission
  store/            auth.store.ts (Zustand), theme.store.ts
```

Routing tree:
```
/login, /forgot-password, /reset-password
/onboarding/*                                (gated: no active session yet, or onboardingCompletedAt is null)
/  (ProtectedRoute → AppShell)
  index (dashboard), /assets, /assets/new, /assets/:id, /check-in-out,
  /maintenance, /audits, /people, /vendors, /reports, /labels, /settings
/platform/*  (PlatformProtectedRoute, entirely separate auth/session)
  index (dashboard), /orgs, /orgs/:id, /alerts
```

---

## M. Port vs. Rewrite

**Port with light adaptation**: `lib/barcode.ts`, `lib/export.ts`, `lib/timezones.ts`, `lib/utils.ts` presentation helpers (`formatBytes`, `getInitials`, status/condition color maps), `lib/storage.ts`'s S3/bytea hybrid, `lib/permissions.ts`'s role→booleans shape (extended per §E), the per-scan matching logic from `api/audits/route.ts`'s `verify_scan` action, Radix UI primitives.

**Rewrite entirely**: all of `auth.ts`/`api/auth/*` (session model → JWT+TOTP+rotation), `sessions` table's role, `audits`' create/complete logic and `AuditsClient.tsx` (single-actor → state machine + role-specific screens), the dashboard page (must become a JSON API with org-scoping and value-hiding that don't exist today), the reports query layer (unfiltered → parameterized builder), the settings org-profile route (fixes the confirmed cross-org bug, adds theme fields), and the entire platform-admin surface (no equivalent exists — `OrgSwitcher.tsx` is a cosmetic single-tenant demo dropdown).

---

## Verification

- **Cross-org isolation**: with 2+ seeded test orgs, confirm every tenant endpoint returns zero rows from the other org, including via direct API calls bypassing the UI — the exact bug class confirmed present today.
- **Value-hiding**: confirm a staff-role JWT calling `GET /api/assets/:id` and `GET /api/dashboard/stats` never receives value fields at all (absent, not null).
- **Auth**: login→TOTP-challenge→access, refresh rotation (reused old token → full family revoked), password reset (revokes other sessions), lockout after N failures.
- **Audit workflow**: full assign→scan→submit→reject→resubmit→verify cycle across 3 test users, confirming a submitter can never also verify their own submission.
- **Reports/labels**: PDF/Excel export always matches the currently-applied filters.
- **Onboarding**: theme colors persist and apply live without reload; TOTP enrollment cannot be bypassed even for the first admin account; org's own name/logo (not "Tecres") appears throughout their tenant instance post-onboarding.
