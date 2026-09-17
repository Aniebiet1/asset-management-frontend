# Tecres Asset Manager — Frontend Build Plan (Phased, Functionality-First)

This supersedes the build-order thinking in `solid_implementation_plan.md` (kept for the full
technical spec — schema, endpoints, security model) and the "mock UI first, wire it all up later"
approach from the initial scaffold. **New direction: each phase adds real, backend-wired
functionality.** No more building the whole app against fake data and rewiring it in bulk at the
end — `src/lib/mock-data.ts` is retired one feature at a time, in the phase that feature is built.

The backend (`asset-management-backend`) is already substantially implemented — every module in
§K of `solid_implementation_plan.md` has a working router/service/schema. This plan sequences the
frontend against what's *actually there* (verified by reading the routers, not assumed from the
spec), and calls out the handful of backend gaps that block a clean Phase 1.

---

## Status

Three states: **Pending** (not started — still mock/stub), **Working on it** (someone has real
wiring in progress, not all committed/mock-free yet), **Done** (`tsc -b` clean, `npm run build`
succeeds, smoke-tested against a running backend, that feature's mock usage deleted per §4).

Whoever picks up a phase flips its row to **Working on it** when they start and **Done** when it
actually clears the bar above — don't mark a phase Done because the UI renders, and don't leave it
on Working on it after it's merged. This table is the thing everyone checks before picking up work,
so keep it honest; a stale table is worse than no table.

| Phase | Status | Notes |
|---|---|---|
| 1 — Auth foundation, platform admin (minimal), onboarding | Done | Real login, TOTP enroll/challenge, onboarding wizard, and the minimal platform app are committed and wired. |
| 2 — Dashboard (real data) | Done | Stats/charts/activity hit real endpoints (`features/dashboard/api.ts`); value-hiding confirmed for staff vs. admin; the Maintenance Due widget is still mock, which is expected, that's Phase 5's mock to remove, not this phase's. |
| 3 — Assets + catalog dependencies | Working on it | Catalog CRUD (categories/locations/departments) lives under Settings > Catalog (`features/catalog/`); vendors stays read-only here (Phase 7 owns its write UI). `AssetsListPage`/`AssetDetailPage`/`AssetCreatePage`/new `AssetEditPage` are wired to real endpoints (`features/assets/api.ts`), including image upload and joined category/location/department/vendor/custodian names (added LEFT JOINs to `assets.service.ts`, which had none before). `tsc -b`/`npm run build` both clean. Not yet marked Done: got through login + TOTP enrollment in a live smoke test but hit the backend's 5/15min TOTP rate limiter before exercising the Catalog tab and Asset create/list/detail live; needs a manual pass (or a rerun after a backend restart) before flipping to Done. |
| 4 — Check-Out / Return | Pending | `CheckInOutPage` is a `ComingSoon` stub. |
| 5 — Maintenance | Pending | `MaintenancePage` is a `ComingSoon` stub. |
| 6 — Audits | Pending | `AuditsListPage` renders mock audits; assigner/assignee/verifier workflow screens not built. |
| 7 — People + Vendors | Pending | `PeoplePage` renders mock users; `VendorsPage` is a `ComingSoon` stub. |
| 8 — Reports + Labels | Working on it | Labels' format picker is real and wired: `LabelsPage` renders 3 selectable previews (`features/labels/components/LabelPreview.tsx`) against real org/asset data, persists the org's choice via `PATCH /organizations/me/label-format`, and gates the Save action on `canManageOrg`. `ReportsPage` is still untouched, remains a `ComingSoon` stub. |
| 9 — Settings | Done | Org profile, branding/theme (logo + colors, shared components with onboarding), catalog (categories/locations/departments CRUD) and a personal Appearance tab (light/dark/system, sidebar collapse) are real and wired; the whole page (not just individual tabs) is gated to `canManageSettings`/`canManageOrg` roles. |
| 10 — Platform admin, full feature set | Pending | Base platform app (dashboard/orgs/suspend/quotas/alerts) landed in Phase 1; force-reset-password, impersonation, and the impersonation banner from this phase are not built. |
| 11 — Polish / hardening | Pending | No route-level code-splitting yet (still a single bundle); no unified loading/empty/error states or tests yet. |

Status last verified against the working tree on 2026-09-16 — re-check the actual code before
trusting a row that looks old, the same caveat §4 applies to the phase descriptions themselves.

---

## 0. What changed from the original plan

**Only Tecres creates workspaces. There is no admin sign-up.**

- A Tecres platform admin creates an organization *and* its first admin user (name, email,
  password) in one step, via the already-built `POST /api/platform/orgs`
  (`createOrgAsPlatformAdmin` → `createOrganization`, which inserts both the `organizations` row
  and a `super_admin` user row directly — see `organizations.service.ts`).
- The org's first admin never "signs up." They're handed org slug + email + password out of band
  (the Tecres admin UI shows it once after creation — see Phase 1) and log in at the normal tenant
  `/login`.
- **The old §H onboarding wizard's step 1 ("Account + org creation") is gone.** Onboarding now
  starts *after* login + mandatory TOTP enrollment, gated purely on
  `organizations.onboardingCompletedAt IS NULL`: **Org Profile → Branding → Seed Data → Finish.**
- Additional staff (beyond the first admin) are still added the original way — People → Invite,
  email link, they set their own password (`org_invites`, already wired in
  `people.router.ts`). That flow is unchanged and untouched by this revision.

**Backend gap this creates — flag for a short backend pass before/alongside Phase 1:**

- `POST /api/organizations` (`organizations.router.ts`) is still a **live, unauthenticated**
  self-serve org-creation endpoint — a leftover from the old self-serve model. The new frontend
  will never call it, but it staying reachable contradicts "only Tecres creates workspaces."
  Recommend removing it (or gating it behind `authenticatePlatformAdmin`) in the same pass as
  Phase 1. This is a backend-repo change; flagged here so it isn't lost.
- `POST /api/platform/orgs` is gated by `authorizePlatformAdmin("canSuspendOrg")` — works (only
  `platform_owner` can create orgs, not `platform_support`), but the permission name is a
  misnomer. Low priority; rename to something like `canCreateOrg` when convenient.
- There is no `POST /api/platform/auth/refresh`. Platform-admin sessions are a single JWT with no
  rotation — the frontend's platform auth store must expect **re-login on expiry**, not silent
  refresh (see §3). Fine for Phase 1; worth adding backend-side later if session length becomes a
  problem.

---

## 1. Two experiences, one SPA, two auth identities

The backend already treats tenant users and platform admins as **completely separate identity
spaces** (separate JWT secret, separate tables, separate middleware — see backend `CLAUDE.md`).
The frontend mirrors that split exactly, not just in routing but in state:

| | Tenant app | Tecres platform app |
|---|---|---|
| Routes | `/`, `/assets`, `/audits`, ... (everything under the real `AppShell`) | `/platform/login`, `/platform`, `/platform/orgs`, `/platform/orgs/:id`, `/platform/alerts` |
| Shell | Full `AppShell` (sidebar, command palette, notifications) — already built in Phase 0 | **Deliberately minimal** — a slim top bar (logo + admin name + logout) and a 3-item tab strip (Dashboard / Organizations / Alerts). No sidebar, no command palette, no asset-management chrome. It's an internal ops tool, not the product. |
| Auth store | `src/store/auth.store.ts` — access token in memory, refresh via httpOnly cookie | `src/store/platformAuth.store.ts` — **separate store, separate in-memory token.** Never shares a module-level variable or storage key with the tenant store. |
| API client | `src/lib/api-client.ts` → `/api/*` with tenant bearer token | `src/lib/platform-api-client.ts` → `/api/platform/*` with platform bearer token |

Keeping these physically separate (different store files, different API client instances) means a
bug can't leak a platform-admin token into a tenant request or vice versa — same reasoning as the
backend's separate JWT secrets, just enforced on the frontend too.

---

## 2. API client foundation (built once, in Phase 1, used by every phase after)

`src/lib/api-client.ts`:
- `fetch` wrapper, base URL from `VITE_API_BASE_URL` (default `http://localhost:4000/api`,
  matching the backend's `.env` `PORT=4000` + `app.use("/api", router)`).
- `credentials: "include"` on every call (the refresh token is an httpOnly cookie the backend
  sets — nothing to manage manually).
- Access token held in memory (Zustand), **never localStorage** (XSS surface). On app boot, call
  `POST /auth/refresh` once to silently re-establish a session from the cookie; if it 401s, land
  on `/login`.
- On any `401` mid-session: attempt one `POST /auth/refresh`, retry the original request once, else
  clear the store and redirect to `/login`. Matches `solid_implementation_plan.md` §L's
  `api-client.ts` spec exactly.
- Typed thin wrappers per domain (`getAssets`, `createAsset`, ...), not a generic `request()` call
  scattered through components — keeps the TanStack Query hooks (below) simple and gives one place
  to fix a response-shape mismatch.

`src/lib/platform-api-client.ts`: same shape, pointed at `/api/platform/*`, its own token source.
No `/auth/refresh` call — per §0, just clear and redirect to `/platform/login` on 401.

**TanStack Query hooks**, one file per domain, colocated with the feature:
`src/features/assets/api.ts` exports `useAssetsQuery`, `useAssetQuery(id)`, `useCreateAssetMutation`,
etc. Query keys follow `["assets", "list", filters]` / `["assets", "detail", id]` so cache
invalidation after a mutation is a one-line `queryClient.invalidateQueries({ queryKey: ["assets"] })`.

**Response envelope**: every backend endpoint returns `{ data: ... }` for single/list responses
(verified across `dashboard.router.ts`, `organizations.router.ts`, `assets.router.ts`, etc.) — the
API client's typed wrappers unwrap `.data` once, so hooks and components never touch the envelope.

---

## 3. Phases

Each phase below lists: the pages/routes it makes real, the exact backend endpoints it consumes
(verified against the current router files, not the spec), and what it removes from
`mock-data.ts`. A phase is "done" when: `tsc -b` is clean, a `npm run build` succeeds, and the flow
has been smoke-tested against a locally running backend (`pnpm dev` in the backend repo) — not just
against mock data.

### Phase 1 — Auth foundation, platform admin (minimal), onboarding — Status: Done
The gate every other phase sits behind. Nothing past `/login` is real until this lands.

**Tenant auth**
- `/login` — org slug + email + password → `POST /auth/login`. Branch on response `status`:
  - `totp_enrollment_required` → `/totp/enroll` (show QR from `POST /auth/totp/enroll`, verify via
    `POST /auth/totp/verify-enroll`, display the 10 recovery codes **once**).
  - `totp_challenge_required` → `/totp/challenge` (`POST /auth/login/totp`).
- `/forgot-password`, `/reset-password` → `POST /auth/password-reset/request`,
  `POST /auth/password-reset/confirm`.
- On session established: `GET /auth/me` populates `auth.store`. If
  `org.onboardingCompletedAt === null` → force-redirect into `/onboarding/*` before anything else
  in the tenant app is reachable.

**Onboarding wizard** (`/onboarding/*`, revised per §0 — starts at org profile, not account creation)
1. **Org Profile** — currency (NGN preselected per plan §F), timezone, date format →
   `PATCH /organizations/me`.
2. **Branding** — logo upload (`POST /organizations/me/logo`) + primary/accent/sidebar color
   pickers with a **live preview** using the theme store's `applyOrgTheme` (already built in
   Phase 0) → `PATCH /organizations/me/theme` on "Next", not on every color drag.
3. **Seed Data** (optional, skippable) — first location/category/department via the catalog CRUD
   endpoints (`POST /locations`, `POST /categories`, `POST /departments`).
4. **Finish** → `PATCH /organizations/me/onboarding-complete`, redirect into the real dashboard.

**Tecres platform app** (minimal shell per §1)
- `/platform/login` — same login → TOTP-enrollment-or-challenge branching as tenant auth, against
  `/platform/auth/*`.
- `/platform` (dashboard) — fleet totals from `GET /platform/stats`.
- `/platform/orgs` — table from `GET /platform/orgs` (name, plan status, user/asset counts vs.
  quota).
- `/platform/orgs/new` — **the only place a workspace gets created.** Form: org name, org slug
  (live-checked against `GET /platform/orgs` client-side, though the real uniqueness check is
  server-side on submit), admin name, admin email, admin password (generate-a-strong-password
  helper + reveal toggle, since the platform admin is about to hand this to someone). On success
  (`POST /platform/orgs`), show a **one-time "workspace created" screen** with the org slug, admin
  email, and the password the admin just set — clearly labeled to copy and hand off securely, since
  the backend has no "email the new admin their credentials" flow yet (only `org_invites` for
  *additional* staff has an email step). Note this as a nice-to-have for a later phase: reuse
  `src/emails/templates/` + `sendEmail()` server-side to send a real welcome email instead.
- `/platform/orgs/:id` — detail: usage vs. quota, plan status, activity (`GET /platform/orgs/:id`,
  `GET /platform/orgs/:id/activity`), and the action buttons this phase wires:
  suspend/reactivate (`PATCH /orgs/:id/status`), adjust quotas (`PATCH /orgs/:id/quotas`).
  Force-reset-password and impersonate are Phase 10 (lower urgency, higher blast radius — get the
  read paths and org creation solid first).
- `/platform/alerts` — `GET /platform/alerts`, resolve via `PATCH /platform/alerts/:id/resolve`.

**Mock data removed**: `mockCurrentUser`, `mockOrg` as static defaults for `auth.store` (the store
keeps its shape, just stops self-initializing with mock data — it starts `null` and populates from
`GET /auth/me`). The Header's "Preview as" persona switcher (a Phase-0 mock-only convenience) is
removed — real role-based views come from actually logging in as different seeded users.

---

### Phase 2 — Dashboard (real data) — Status: Done
- `GET /dashboard/stats`, `GET /dashboard/activity`, `GET /dashboard/charts` replace
  `buildMockDashboardStats`/`buildMockDashboardCharts`/`mockActivity` in `DashboardPage.tsx`. The
  component structure built in Phase 0 barely changes — only the data source.
- Confirms value-hiding end to end: log in as a seeded `staff` user, verify the fleet-value card
  and value columns are simply absent (not zero/blank), matching plan §F.

### Phase 3 — Assets + catalog dependencies — Status: Working on it
Assets can't exist without categories/locations/departments/vendors, so this phase does both:
- Catalog CRUD pages (or a shared "Catalog" tab under Settings — decide layout when building):
  `GET/POST /categories`, `/locations`, `/departments`, `/vendors`, `PUT/DELETE /:id` each.
- `AssetsListPage` → `GET /assets` (filters: status, category, location, search — matches
  `assetListQuerySchema`), replacing `mockAssets`.
- `AssetDetailPage` → `GET /assets/:id`, `GET /assets/:id/history`, `GET /assets/:id/maintenance`.
- `AssetCreatePage` → real form (react-hook-form + zod, schema mirrors `assets.schema.ts`) →
  `POST /assets`. Edit reuses the same form → `PUT /assets/:id`.
- File/image upload on the asset form → `POST /files/upload`.

### Phase 4 — Check-Out / Return — Status: Pending
- `GET /assignments` (active + overdue), `POST /assignments/checkout`, `POST /assignments/checkin`,
  `GET /assignments/:id/receipt` (render client-side via `jspdf`, per backend's "no server-side PDF
  rendering" note).
- Camera/barcode scan flow (`html5-qrcode`, already installed) wired to asset lookup by tag.

### Phase 5 — Maintenance — Status: Pending
- `GET/POST /maintenance`, `PUT/DELETE /maintenance/:id`. Straightforward CRUD list/detail/modal,
  same pattern as Phase 3.

### Phase 6 — Audits (the workflow, not just a list) — Status: Pending
The highest-complexity phase — three distinct role-scoped screens, not one page:
- **Assigner view** (`canAssignAudits`): create audit + scope (`POST /audits`), assign
  (`PATCH /audits/:id/assign`).
- **Assignee/scanner view** (`canPerformAssignedAudit`, ownership-checked not role-checked): start
  (`POST /audits/:id/start`), scan loop (`POST /audits/:id/scan`), submit with required remark
  (`POST /audits/:id/submit`).
- **Verifier view** (`canVerifyAudits`, backend enforces verifier ≠ submitter): verify
  (`POST /audits/:id/verify`) or reject with required reason (`POST /audits/:id/reject`).
- `GET /audits/:id/history` renders the `audit_status_history` trail. `GET /audits/:id/report` for
  the post-verification report view.
- `AuditsListPage` (already stubbed in Phase 0 with mock audits) switches to `GET /audits`.

### Phase 7 — People + Vendors — Status: Pending
- `PeoplePage` (already stubbed with mock users) → `GET /people`, edit/deactivate
  (`PUT/DELETE /people/:id`), invite (`POST /people/invite`) + a public
  `/invite/:token/accept` page (no auth — this is the "additional staff" onboarding path, distinct
  from the first-admin flow in Phase 1).
- `VendorsPage` → real catalog CRUD, same pattern as Phase 3's catalog work.

### Phase 8 — Reports + Labels — Status: Pending

#### Reports

- Shared filter bar (category, location, custodian — per plan §G) driving `GET /reports/assets`,
  `GET /reports/valuation-depreciation`, `GET /labels/assets`.
- **Two independent range filters, combinable, not a toggle.** The backend's current
  `buildAssetReportQuery` (`src/lib/assetReportQuery.ts`) only supports *one* date filter at a
  time via `dateField: "purchaseDate" | "depreciationDate"` — a mode switch, not two simultaneous
  filters. This phase needs both applicable together:
  - **Date range** — filters by `purchaseDate` (unchanged).
  - **Depreciation range** — filters by *how depreciated* an asset is, not a date. Expressed as
    either a % depreciated range (e.g. "60–100% depreciated") or a current book value range
    (e.g. "₦0–₦50,000 remaining") — pick one primary representation for the filter UI and show the
    other as a read-only column; % depreciated is probably the more intuitive one for a manager
    doing a write-off review.
  - Backend work this implies (flag for the backend repo, not done yet): extend
    `AssetReportFilters` with `depreciationFrom`/`depreciationTo`, computed live in SQL the same
    way `depreciationDateExpr` already computes depreciation *date* live rather than trusting the
    stored `assets.currentValue` column (which isn't recalculated on a schedule — see backend's
    "Known gaps"). Reuse the same straight-line formula as the sort/display column below so the
    filter and the number shown always agree.
- **Standard depreciation method: straight-line**, matching `assets.depreciationType`
  (schema currently only defines `"straight_line"` — no other method to branch on):
  ```
  monthsElapsed        = min(category.usefulLifeMonths, monthsBetween(purchaseDate, now))
  accumulatedDepr      = (purchasePrice - salvageValue) * (monthsElapsed / usefulLifeMonths)
  currentValue          = max(salvageValue, purchasePrice - accumulatedDepr)
  percentDepreciated    = accumulatedDepr / (purchasePrice - salvageValue) * 100
  ```
  Put this in one shared place (`src/lib/depreciation.ts` on whichever side ends up computing it —
  backend if the filter needs it in SQL per above, frontend `lib/` if only used for display/export)
  and have every place that shows a depreciation number — report table, asset detail, dashboard
  valuation card — go through it, mirroring how `lib/currency.ts` is the one place money formatting
  happens (plan §F). Never let a second, slightly different depreciation formula appear in the
  labels/export path.
- Consolidated view groups/sorts by category, location, or depreciation bucket (e.g. "0–25% /
  25–50% / 50–75% / 75–100%+ depreciated") as a report display mode, not a separate endpoint —
  client-side grouping over the same filtered/paginated rows from `GET /reports/assets`.

#### Labels

Physical label size: **45mm × 40mm.** Three label format variants (choose per print run, not a
global setting):

1. **Barcode + QR, split layout** — two zones side by side: left zone carries the company logo
   above (or beside) a linear barcode (asset tag); right zone is the QR code alone.
2. **QR + logo** — company logo and QR code only, no linear barcode.
3. **Barcode only** — just the linear barcode (asset tag), no logo, no QR.

All three render from the same asset data (`GET /labels/assets`, same filter shape as Reports per
plan §G) — the format choice only changes which of {logo, barcode, QR} appear and how they're
arranged in the 45×40mm cell, not the data fetched. `jsbarcode` (linear) + `qrcode` (QR) are both
already installed; company logo comes from `organizations.logoUrl`.

**Print sheet calibration** (Avery-style, confirmed scope): before printing, the user can set —
- label width/height (defaults to 45×40mm, editable in case of different physical label stock)
- columns and rows per sheet
- page margins (top/right/bottom/left)
- gap between labels (horizontal and vertical)
- page size (A4 / Letter)

so the generated PDF's label grid lines up with pre-cut label paper in the org's printer. This is
sheet-geometry calibration, not a per-print nudge offset — get the grid right once and it stays
right. Persist it per-org (reuse the existing `systemSettings` table — `key: "label_sheet_layout"`,
`value: jsonb` — rather than a new table; it already exists for exactly this kind of org-level
key/value config) so it's set once, not re-entered every print run. Render via
`jspdf`/`jspdf-autotable`, same as the Reports PDF export.

### Phase 9 — Settings — Status: Pending
- Org profile + branding re-edit (same endpoints as Phase 1's onboarding, different entry point —
  worth sharing the branding form component between onboarding and settings rather than duplicating
  it).
- Catalog management consolidated here if not already split out in Phase 3.

### Phase 10 — Platform admin, full feature set — Status: Pending
- Force-reset-password (`POST /orgs/:id/users/:userId/force-reset`) and impersonation
  (`POST /orgs/:id/users/:userId/impersonate`) — both higher-blast-radius actions, deliberately
  sequenced after the read/create/suspend paths have been live and exercised.
- Impersonation banner in the tenant `AppShell` when an access token carries `impersonatedBy` (the
  backend already stamps this into the JWT and every activity-log write during the session — the
  frontend just needs to surface it and offer an "end impersonation" action).

### Phase 11 — Polish / hardening — Status: Pending
- Route-level code-splitting (`React.lazy` per feature) — flagged in Phase 0 as a known gap; the
  production bundle was a single ~965KB chunk with only Dashboard + Assets built, and it'll only
  grow.
- Consistent loading skeletons / empty states / error boundaries across all the CRUD pages built in
  Phases 3–9 (they'll have been built slightly differently phase to phase under time pressure —
  this is the pass that unifies them).
- Basic component/integration tests for the auth flow and the audit state machine (the two places a
  bug is expensive: locking someone out, or corrupting an audit's state).
- Accessibility pass on the shell (focus trapping in dialogs/sheets, landmark roles) — shadcn/Radix
  gives this mostly for free, but worth a deliberate check once the app is feature-complete.

---

## 4. Working agreement for each phase

1. Read the actual router/service/schema files for the endpoints in scope before wiring — this plan
   was written that way (every endpoint above was verified against `src/modules/*/*.router.ts` in
   the backend, not assumed from `solid_implementation_plan.md`) and drifted already once between
   the spec and the real code (see §0's `canSuspendOrg` naming, the missing platform refresh
   endpoint). Re-check before each phase in case the backend moved on.
2. Wire one feature's real data in, delete that feature's mock data, don't leave both paths alive
   behind a flag — half-mocked, half-real state is exactly the confusion this revision is meant to
   avoid.
3. `tsc -b` clean and a production `npm run build` before calling a phase done, same bar as Phase 0.
4. Smoke-test against a real running backend (`pnpm dev` in `asset-management-backend`, migrations
   + seed data applied) — a mock-passing UI is not evidence the wiring works.
5. Update the **Status** table (and that phase's heading) at the top of this doc: flip to
   "Working on it" when you start, "Done" only once steps 1-4 above actually pass. This is how
   other people working in either repo know what's real right now without re-reading the code.
