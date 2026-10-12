# TecresTrackIT AMS — Frontend Build Plan (Phased, Functionality-First)

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
| 1 — Auth foundation, platform admin (minimal), onboarding | Done | Real login, TOTP enroll/challenge, onboarding wizard, and the minimal platform app are committed and wired. **Login has since changed shape**: the org-slug field is gone (2026-09-21), email alone identifies the workspace, and the slug field's job is now done by an email-driven public branding lookup. See §3a before touching auth. |
| 2 — Dashboard (real data) | Done | Stats/charts/activity hit real endpoints (`features/dashboard/api.ts`); value-hiding confirmed for staff vs. admin; the Maintenance Due widget is still mock, which is expected, that's Phase 5's mock to remove, not this phase's. |
| 3 — Assets + catalog dependencies | Done | Catalog CRUD (categories/locations/departments) lives under Settings > Catalog (`features/catalog/`); vendors stays read-only here (Phase 7 owns its write UI). `AssetsListPage`/`AssetDetailPage`/`AssetCreatePage`/new `AssetEditPage` are wired to real endpoints (`features/assets/api.ts`), including image upload and joined category/location/department/vendor/custodian names (added LEFT JOINs to `assets.service.ts`, which had none before). `tsc -b`/`npm run build` both clean. **Live-verified 2026-09-18** against the k-cut org seeded with 80 real assets across 9 categories/6 locations: list (search/status/category/location filters, pagination), detail (tabs, QR label preview, joined names), edit and create forms all rendered correctly with no console errors. **Since documented (2026-09-23): structured asset tag generation is built** per the Asset Tagging System proposal — new backend `subsidiaries`/`branches`/`asset_tag_sequences` tables (atomic per-combo sequence via `INSERT ... ON CONFLICT DO UPDATE`, no read-then-write race), `GET /asset-tags/preview`, structured `POST /assets` (subsidiary/branch/type/date → `{SUB}-{TYPE}-{BRANCH}-{DDMMYY}-{index}[-{suffix}]`, batch items sharing one index with A-Z suffixes), tag-identity fields locked on `PUT /assets/:id` once set (admin-only `PATCH /assets/:id/identity` correction path instead, audit-logged via the existing `activityLogs` table), and a real `UNIQUE (org_id, asset_tag)` constraint (there wasn't one before). `AssetForm` shows the new cascading Subsidiary → Branch → Type → Date flow with a live advisory tag preview only for orgs with ≥1 subsidiary configured; orgs with none keep the prior free-text tag input unchanged. `tsc -b`/`npm run build` clean both repos. **Live-verified 2026-09-23** against the acme org via real UI interaction (Playwright, not just curl): created a subsidiary and branch through Settings > Catalog, created a structured asset end-to-end (`CCL-FF-09-210824-004`), and corrected an already-locked tag's purchase date via the new "Correct tag" dialog on the asset detail page (regenerated tag + confirmed activity-log entry), all with zero console errors. **Revised same day (2026-09-23), superseding the paragraph above**: the index is no longer scoped to (subsidiary, branch, type, date) - it's a running counter per **asset type alone**, org-wide, so it doesn't reset across branches/dates (`asset_tag_sequences` unique key is now just `(org_id, category_id)`; migration `0007`). Suffixing changed to match: a new asset only gets a letter when staff explicitly mark it as a duplicate of an existing item and pick that item via a new searchable combobox (`DuplicateAssetPicker`, `features/assets/components/`) - the picker isn't filtered by subsidiary/branch/date, any prior asset of that type can be picked, even one created long before. The first item of a group is always bare (no suffix); only items explicitly attached to it get `-A`, `-B`, etc. Backend's `assembleTag`/`nextSuffixFor` (`assetTags.service.ts`) validate that the picked index actually exists rather than requiring it be the most-recently-issued one. **Live-verified 2026-09-23**: index continuing across a different subsidiary/branch/date for the same type (curl), and the full picker flow through real UI (Playwright) - searched, selected a months-old sibling asset, got the correct next letter, zero console errors. **Branches decoupled from subsidiaries (2026-09-23)**: branches are now org-level, not owned by a subsidiary (any subsidiary can operate at any branch), so `branches.subsidiary_id` is gone and codes are unique per org rather than per subsidiary (migration `0008`, which renumbers any pre-existing duplicate codes - keeping the locked branch's code, since a locked code is already baked into issued tags and can't be edited back through the UI). The asset form's Branch dropdown no longer cascades off Subsidiary, Settings > Catalog > Branches is a flat list, and `useBranchesQuery()` folded back into the generic `catalogHooks` factory (which also retired `CatalogManager`'s short-lived `select` field type, now unused). |
| 4 — Check-Out / Return | Done | `CheckInOutPage` is wired to `features/check-in-out/api.ts`: search/scan (manual entry plus `html5-qrcode` camera scan) → checkout/checkin dialogs → active/overdue list with overdue highlighting → PDF receipt via `jspdf`. `tsc -b`/`npm run build` clean. **Live-verified 2026-09-18**: searched an asset by tag, checked it out to a custodian (toast + new row in Active check-outs), then checked in an existing overdue item (toast + row removed) — both real mutations against a running backend session on the k-cut org. |
| 5 — Maintenance | Done | `MaintenancePage` wired to `features/maintenance/api.ts`, full CRUD with status filter, asset picker, overdue highlighting; Dashboard's Maintenance Due widget switched off `mockMaintenanceRecords` (now deleted from `mock-data.ts`) onto the same query. **Actually smoke-tested end to end against a live backend session**: create → status change → confirmed the asset's status and the Dashboard's "In Maintenance" KPI/chart both flip in response, not just the local UI. |
| 6 — Audits | Working on it | Full assigner/assignee/verifier workflow built on a new `/audits/:id` (`AuditDetailPage`), ownership-checked assignee view, segregation-of-duties notice on the verifier view, history timeline, post-verification report panel. `mockAudits` deleted. `tsc -b`/`npm run build` clean. **Partially live-verified 2026-09-18**: list and detail pages (history timeline, verifier report panel, scoped items with joined asset names) render correctly against real seeded audits on k-cut, no console errors. Still not flipped to Done: the assign → start → submit → verify mutation sequence itself wasn't click-through exercised this pass (the seeded audits were inserted directly, not driven through the UI/API) — that's the remaining gap before this can close. |
| 7 — People + Vendors | Working on it | `PeoplePage` wired to `features/people/api.ts` (list/edit/deactivate/invite); new public `/invite/:token/accept` page; `VendorsPage` now reuses the existing `CatalogManager` component (categories/locations/departments' shared CRUD UI) with `canManageVendors`-gated fields matching the backend's `vendorCreateSchema`. `mockUsers` deleted. `tsc -b`/`npm run build` clean. Verified via a fully mocked Playwright pass, and **the list views were additionally live-verified 2026-09-18** against k-cut's real 12 people (including an inactive user rendering correctly) and 5 vendors. Still not Done: invite/edit/deactivate and vendor create/edit mutations weren't exercised against the live backend this pass. |
| 8 — Reports + Labels | Done | Labels is done (`LabelsPage`, real format picker, persists via `PATCH /organizations/me/label-format`). Reports is now built too: filter bar (category/location/custodian, purchase-date vs. depreciation-date mode matching the backend's real `dateField` param), server-side sort, client-side group-by (category/location/depreciation-bucket), CSV/Excel/PDF export, new shared `src/lib/depreciation.ts` (straight-line formula). The depreciation-range filter from this phase's original spec is deliberately **not built** since the backend doesn't support it yet (confirmed against `assetReportQuerySchema`/`buildAssetReportQuery`, only one `dateField` mode exists) — the UI has a visible notice explaining this instead of faking it client-side. `tsc -b`/`npm run build` clean. **Live-verified 2026-09-18** on k-cut's 80 seeded assets: Reports page rendered filtered/sorted real data with depreciation percentages; Labels format was selected and saved (real `PATCH` mutation), then a 22-asset selection generated correct barcode+QR label previews. Since documented (2026-09-22): print-sheet calibration is **built**, not just specified, as a Settings > Labels form persisting to `/organizations/me/label-sheet-layout`, and the default label size moved from 45×40mm to 63×25.4mm to match the org's real stock. See the Phase 8 section below. |
| 9 — Settings | Done | Org profile, branding/theme (logo + colors, shared components with onboarding), catalog (categories/locations/departments CRUD) and a personal Appearance tab (light/dark/system, sidebar collapse) are real and wired; the whole page (not just individual tabs) is gated to `canManageSettings`/`canManageOrg` roles. |
| 10 — Platform admin, full feature set | Done | Force-reset-password is wired end-to-end (`PlatformOrgDetailPage`'s new Users tab, gated to `platform_owner`). **Impersonation was built in this phase and removed again on 2026-09-19** at the product owner's call (legal exposure); see the Phase 10 section below for exactly what came out of each repo, and don't rebuild it. Dashboard rebuilt with real analytics (`GET /platform/analytics`): fleet growth chart, plan-status breakdown, a Risk & Health panel (suspended orgs, quota pressure, overdue maintenance, at-risk assets — each tile links into `/platform/orgs?risk=<filter>`), and a new "Detected login risk" panel (`GET /platform/security/login-risk`) showing which accounts are mid a failed-login spike, from where (IP, via a new per-attempt activity-log trail in `auth.service.ts`), and linking straight to that user in their org. New `GET /platform/orgs/:id/users` and `GET /platform/orgs/:id/activity` (already existed) back the Users/Activity tabs. `tsc -b`/`npm run build` both clean on the frontend, `tsc --noEmit` clean on the backend. **Live-verified 2026-09-18** via a throwaway `platform_owner` QA account (`platform.qa.tester@example.com`, seeded by the new `db/seedQaPlatformAdmin.ts`, same non-privileged-enrollment pattern as the k-cut tenant QA account): full click-through of login → TOTP enrollment → dashboard (all charts/panels rendering with real data, including a real 3-attempt login-risk entry generated against the k-cut QA tester) → org detail Users tab → Activity tab, platform session intact throughout. **Platform-admin invitations were added on top of this phase on 2026-09-22** (new `/platform/admins` page, public `/platform/invite/:token/accept`, `platform_admin_invites` table); see the Phase 10 section below. |
| 11 — Polish / hardening | Pending | No route-level code-splitting yet: the main chunk is now 2,644.87 kB (786 kB gzipped) as of 2026-09-22 and Vite warns on every build. No unified loading/empty/error states or tests yet. One free cleanup waiting here: `src/lib/mock-data.ts` is now imported by nothing at all and can simply be deleted (see §3a). **Shell + dashboard redesign (2026-10-12, uncommitted at time of writing)**: both apps now share `components/layout/shell/*` (ShellFrame/ShellSidebar/BottomDock/Topbar), the platform app gained a sidebar (reverses §1's "no sidebar", product owner's call), and both dashboards were rebuilt on `components/charts/*` + `components/common/DashboardCard.tsx`. The product owner picked the **framed** shell (deep brand frame, rounded canvas panel); the alternative "airy" style and its toggle were removed the same day. The rest of the app was then brought up to the same standard: summary tiles on Check-Out / Maintenance / Audits / Reports, loan-period and quota meters, a richer asset detail page, readable status badges (inset ring, darker light-mode text), and shell-scoped table/input styling in `index.css`. **Live click-through 2026-10-12** against the local backend with a throwaway `QA Barbers` workspace (public signup, then real login/TOTP enrollment/onboarding UI): assets CRUD, check-out/receipt/check-in, maintenance, audits (create/assign/start/scan/submit), people invites, vendors, reports filters + CSV, label PDF, settings, Ctrl+K, phone dock/drawer. Camera scanning was exercised through Chromium's fake camera playing app-rendered CODE-128 and QR labels; that found and fixed real bugs: dense CODE-128 tags never decoded (html5-qrcode decodes at the viewfinder's CSS size, so the scanner now lays out at 880px and scales down, and requests HD video), StrictMode double-mount could open two camera streams, and audit scanning restarted the camera after every item. Also fixed: assets with no recorded value showed ₦0.00 (now a straight-line estimate, and the backend dashboard total matches), new invites didn't appear until reload, Ctrl+K only searched the 6 newest assets, dashboard check-outs showed "Unknown" custodians. Not covered live: platform-admin mutations, and audit verification (needs a second user, since the submitter is blocked from verifying). |

**Why the remaining rows are "built, build-clean, not yet Done"**: Phases 6/7 were built and
verified by `tsc -b`/`npm run build`, and now have live-verified read paths too (see table above),
but their write/mutation flows (audit assign→submit→verify, people invite/edit/deactivate, vendor
create/edit) still haven't been click-through exercised against a running backend session. The
seeded demo tenant account already has TOTP enrolled from earlier phases' testing, and multiple
agents building these phases in parallel were hitting it concurrently — nobody held a valid 6-digit
code or recovery code for it, and correctly declined to read the secret out of the database or
otherwise force past the wall to get one (that's exactly the kind of thing this repo's auth model is
supposed to resist, see backend `CLAUDE.md`'s integration-test note). Workarounds that stayed inside
normal product flows have worked when tried: Phase 5's agent registered its own throwaway org via
the public signup endpoint and completed that org's own TOTP enrollment normally (the secret is
shown on-screen during enrollment, that's not privileged); Phase 7's agent got equivalent coverage
by mocking the network boundary in Playwright while exercising the real `apiFetch`/TanStack Query
code paths; most recently (2026-09-18) an agent seeded the real k-cut org with a full realistic
dataset (80 assets, 12 people, 5 vendors, 9 maintenance records, 4 audits, etc. — a barbershop-chain
domain matching k-cut's existing categories/locations) and added a dedicated non-TOTP-enrolled
`kcut.qa.tester@example.com` super_admin account *inside that org* (direct DB insert, same pattern
as `db/seed.ts`) specifically so agents can log in and click through the real app without touching
the actual admin's enrolled TOTP credential. That accomplished the "seed a dedicated non-TOTP-
enrolled test account" suggestion below and is why Phases 3/4/8 could move to Done this round — use
that same account for further live verification rather than re-deriving a workaround.

Status last verified against the working tree on **2026-09-22**. That pass was a *code-level*
audit (`npx tsc -b` clean, `npm run build` succeeds, every feature folder read against the row that
claims it) plus a reconciliation of the two commits that landed after the previous 2026-09-18
verify — `652f5c4` (a 52-file change that updated only the status rows, not the phase bodies) and
`42f0b22`. It was **not** a fresh live-backend click-through, so no row moved to Done on the
strength of it: Phases 6 and 7 still need the mutation flows exercised, exactly as described above.
What that pass did surface is a pile of shipped-but-undocumented work, now written up in
"Cross-phase work not owned by any phase" at the end of §3 and folded into the Phase 8 and Phase 11
sections. Re-check the actual code before trusting a row that looks old, the same caveat §4 applies
to the phase descriptions themselves.

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

Work that turned out to belong to no phase (auth's move to email-only login, pre-auth org
branding, notifications, branded PDF export, and a few shared utilities) is written up in **§3a**,
after Phase 11. Read that before auth or branding work in particular, since it supersedes parts of
Phase 1 below.

### Phase 1 — Auth foundation, platform admin (minimal), onboarding — Status: Done
The gate every other phase sits behind. Nothing past `/login` is real until this lands.

**Tenant auth**
- `/login` — **email + password only.** The org-slug field this phase originally specified was
  removed on 2026-09-21 (backend `c0f5276`): `users.email` is globally unique, so the email alone
  resolves the workspace. `POST /auth/login` no longer accepts `orgSlug`, and neither do the
  password-reset schemas. See §3a's "Pre-auth org branding" for what replaced the slug field in
  the UI. Branch on response `status`:
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
  Force-reset-password is Phase 10 (lower urgency, higher blast radius — get the read paths and
  org creation solid first).
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

### Phase 3 — Assets + catalog dependencies — Status: Done
Assets can't exist without categories/locations/departments/vendors, so this phase does both:
- Catalog CRUD pages (or a shared "Catalog" tab under Settings — decide layout when building):
  `GET/POST /categories`, `/locations`, `/departments`, `/vendors`, `PUT/DELETE /:id` each.
- `AssetsListPage` → `GET /assets` (filters: status, category, location, search — matches
  `assetListQuerySchema`), replacing `mockAssets`.
- `AssetDetailPage` → `GET /assets/:id`, `GET /assets/:id/history`, `GET /assets/:id/maintenance`.
- `AssetCreatePage` → real form (react-hook-form + zod, schema mirrors `assets.schema.ts`) →
  `POST /assets`. Edit reuses the same form → `PUT /assets/:id`.
- File/image upload on the asset form → `POST /files/upload`.

### Phase 4 — Check-Out / Return — Status: Done
- `GET /assignments` (active + overdue), `POST /assignments/checkout`, `POST /assignments/checkin`,
  `GET /assignments/:id/receipt` (render client-side via `jspdf`, per backend's "no server-side PDF
  rendering" note).
- Camera/barcode scan flow (`html5-qrcode`, already installed) wired to asset lookup by tag.

### Phase 5 — Maintenance — Status: Done
- `GET/POST /maintenance`, `PUT/DELETE /maintenance/:id`. Straightforward CRUD list/detail/modal,
  same pattern as Phase 3.

### Phase 6 — Audits (the workflow, not just a list) — Status: Working on it
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

### Phase 7 — People + Vendors — Status: Working on it
- `PeoplePage` (already stubbed with mock users) → `GET /people`, edit/deactivate
  (`PUT/DELETE /people/:id`), invite (`POST /people/invite`) + a public
  `/invite/:token/accept` page (no auth — this is the "additional staff" onboarding path, distinct
  from the first-admin flow in Phase 1).
- `VendorsPage` → real catalog CRUD, same pattern as Phase 3's catalog work.

### Phase 8 — Reports + Labels — Status: Done

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

Physical label size: **63mm × 25.4mm** (default), *changed from the 45×40mm this section
originally specified.* The near-square 45×40mm was a placeholder; the org's actual pre-printed
label stock is a short wide strip (logo + barcode left, QR right), and 63×25.4mm at 3 columns ×
10 rows is what fits it on A4. The default lives in the backend's
`DEFAULT_LABEL_SHEET_LAYOUT` (`organizations.service.ts`) and is editable per org via the
calibration form below, so the number above is a default, not a constant to hardcode against.
Three label format variants (choose per print run, not a global setting):

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

**Built (undocumented until 2026-09-22, shipped in `652f5c4`).** All of the above exists:

- `src/features/settings/components/LabelSettingsForm.tsx` — a new **Settings > Labels** section
  holding both the org-wide default format picker and the full sheet-calibration form (label
  width/height, columns, rows, four margins, both gaps, A4/Letter), with a live scaled preview of
  the resulting grid that refuses to render a geometry overflowing the page.
- Persisted via `GET`/`PATCH /organizations/me/label-sheet-layout`
  (`organizations.router.ts`, validated by `labelSheetLayoutSchema`), stored in `systemSettings`
  under `key: "label_sheet_layout"` exactly as specified above. Frontend hooks:
  `useLabelSheetLayoutQuery`/`useSaveLabelSheetLayoutMutation` in `src/features/labels/api.ts`.
- `src/features/labels/lib/labelPdf.ts` renders the actual multi-label print sheet from that
  geometry, paginating across pages. It deliberately mirrors `LabelPreview.tsx`'s zone layout so
  the on-screen preview and the printed sheet can't disagree.

Also added to Reports in the same commit: `depreciationDate` as a sort option (alongside
`purchaseDate`/`currentValue`/`name`/`assetTag`), and org branding (name + logo) on PDF exports
via `exportRowsToPdf`'s new `branding` argument. The depreciation-*range* filter is still
deliberately not built, for the backend reason given in the Status table.

### Phase 9 — Settings — Status: Done
- Org profile + branding re-edit (same endpoints as Phase 1's onboarding, different entry point —
  worth sharing the branding form component between onboarding and settings rather than duplicating
  it).
- Catalog management consolidated here if not already split out in Phase 3.

### Phase 10 — Platform admin, full feature set — Status: Done
- Force-reset-password (`POST /orgs/:id/users/:userId/force-reset`) is wired into a new Users tab
  on `PlatformOrgDetailPage`, behind a confirmation dialog and gated to `platform_owner` in the
  UI (the backend's `authorizePlatformAdmin` is still the real boundary).
- **Platform-admin invitations (added 2026-09-22, after the phase was first marked Done.)** Before
  this, the only way to create a Tecres platform admin was running `db/seedPlatformAdmin.ts`
  against the database. A `platform_owner` can now invite one from the console.
  - Backend: new `platform_admin_invites` table (migration `0004_icy_corsair.sql`), deliberately
    separate from `org_invites` since nothing in the platform identity space should reference a
    tenant table. New `canManagePlatformAdmins` permission on `platform_owner` only. Endpoints:
    `GET /platform/admins`, `POST /platform/admins/invite`, `PATCH /platform/admins/:id/role`
    (owner-gated), plus public `GET /platform/admins/invite/:token` and
    `POST /platform/admins/invite/:token/accept` registered *before* `authenticatePlatformAdmin`,
    because an invitee has no session yet. New `platform-admin-invite.html` email template, always
    rendered with Tecres branding (a platform invite has no org to brand with). Every action is
    written to `platformAdminActivityLogs`.
  - Accepting sets a password and returns an **enrollment token, not a session**, so the new
    account drops straight into the existing `/platform/auth/totp/enroll` flow. No platform
    account can reach a session without an authenticator.
  - Guards: you cannot change your own role, the last active `platform_owner` cannot be demoted,
    a duplicate pending invite is a 409, and a failed invite email rolls the invite row back and
    returns 502 `EMAIL_SEND_FAILED` (matching `people.service.ts`'s `inviteUser` — without the
    rollback the duplicate-pending guard would block every retry for that address).
  - Frontend: `PlatformAdminsPage` behind a new owner-only "Admins" tab in `PlatformShell`, and
    public `PlatformInviteAcceptPage` at `/platform/invite/:token/accept` (distinct from the
    tenant staff invite at `/invite/:token/accept`). The unauthenticated invite calls live on
    `platformAuth.store.ts`'s `rawFetch`, not `platformApiFetch`, which would read a bad token as
    an expired session.
  - **Deliberately not built**: revoking a pending invite, deactivating an admin, and resetting
    another admin's TOTP. A mistyped invite email therefore has to expire on its own (7 days) or
    be cleared in the database. Raised with the product owner and declined for now.
  - Verified 2026-09-22 against a live backend: 33 API assertions (invite → accept → enrollment
    handoff, token replay, role guards, `platform_support` lockout, tenant-token rejection,
    last-owner guard, send-failure rollback) and a 24-assertion Playwright click-through of both
    new pages. Both were run against a throwaway backend process with email disabled so testing
    the invite form sent no real mail; the QA accounts and invites were deleted afterwards.
- **Impersonation was built in this phase and has since been removed entirely, at the product
  owner's call, on the grounds that signing into a customer's account as them is a legal exposure
  no support convenience justifies.** Removed from both repos: the tenant banner, the
  `auth.store.ts` `impersonation` state and `startImpersonatedSession`, the org-detail action and
  dialog, and on the backend `POST /platform/orgs/:id/users/:userId/impersonate`,
  `impersonateOrgUser`, the `canImpersonate` permission and the `impersonatedBy` JWT claim. Don't
  reintroduce any of it without that decision being revisited; force-reset-password is the
  supported "get into a stuck account" path, because it's visible to the account's owner.
- Fleet-wide analytics (`GET /platform/analytics`): 6-month org/asset growth, plan-status
  breakdown, and a risk summary (suspended orgs, orgs near asset/user quota, fleet-wide overdue
  maintenance, damaged/lost/retired assets) — all real queries in `platform.service.ts`, no mock
  data. Each risk tile links into `/platform/orgs?risk=<filter>`; the two asset-level tiles are
  answered by the `orgIdsWithOverdueMaintenance` / `orgIdsWithRiskyAssets` lists the analytics
  payload carries for exactly that reason. The "plans expiring within 30 days" metric was dropped
  from both the tile row and the backend payload.
- Detected login risk (`GET /platform/security/login-risk`): surfaces which accounts are
  currently mid a failed-login spike (`users.failedLoginAttempts > 0`), which org they're in, and
  an IP trail — sourced from a new per-attempt `activityLogs` write in `auth.service.ts` (`login_failed`
  / `login_failed_lockout` / `login_blocked_locked`) that didn't exist before this phase; previously
  only the lockout *counter* existed, with no record of who attempted from where. Surfaced as its own
  dashboard panel and cross-linked from the existing `failed_login_spike` alerts (which now also carry
  `orgName`, via a join `listAlerts()` was missing).
- `GET /platform/orgs/:id/users` is new (needed to populate the force-reset picker);
  `GET /platform/orgs/:id/activity` already existed and is now surfaced in an Activity tab.

### Phase 11 — Polish / hardening — Status: Pending
- Route-level code-splitting (`React.lazy` per feature) — flagged in Phase 0 as a known gap, and
  it did grow as predicted: `src/app/router.tsx` still imports all 22 page components eagerly, and
  as of 2026-09-22 the production build emits a single **2,644.87 kB** main chunk (786 kB gzipped),
  up from the ~965KB measured when only Dashboard + Assets existed. Vite warns about it on every
  build. The heavy leaves are the obvious split candidates, since most sessions never open them:
  `jspdf`/`jspdf-autotable` + `html2canvas` (199 kB, already its own chunk), `xlsx`,
  `html5-qrcode`, and `recharts` — i.e. Reports, Labels, the audit/receipt PDF paths and the
  scanner.
- Consistent loading skeletons / empty states / error boundaries across all the CRUD pages built in
  Phases 3–9 (they'll have been built slightly differently phase to phase under time pressure —
  this is the pass that unifies them).
- Basic component/integration tests for the auth flow and the audit state machine (the two places a
  bug is expensive: locking someone out, or corrupting an audit's state).
- Accessibility pass on the shell (focus trapping in dialogs/sheets, landmark roles) — shadcn/Radix
  gives this mostly for free, but worth a deliberate check once the app is feature-complete.

---

## 3a. Cross-phase work not owned by any phase

Everything below is **built, committed and build-clean**, but belongs to no phase in §3, so it was
invisible in this doc until a 2026-09-22 audit reconciled the tree against it. Almost all of it
landed in `652f5c4` (2026-09-21), a 52-file commit whose own BUILD_PLAN.md edit updated only the
Status rows and Phase 10's body, leaving the rest unwritten. Recorded here so the next person
doesn't rediscover it by grep, or worse, rebuild it.

Same caveat as every row in the Status table: this is verified at the code level (`npx tsc -b`
clean, `npm run build` succeeds), not by a live-backend click-through.

### Login identity: email only, no org slug

The single biggest drift from §1/Phase 1, and the reason to read this section before touching auth.
Backend commit `c0f5276` (2026-09-21) **removed `orgSlug` from the login and password-reset
schemas**; `users.email` is globally unique, so one email maps to exactly one workspace, forever.
The frontend matches: `LoginPage` has an email field and a password field, nothing else.

Consequences worth knowing before you change anything here:

- The one-time "workspace created" handoff screen in Phase 1's `/platform/orgs/new` no longer needs
  to communicate a slug for *login* purposes. The slug still exists on the org record and still
  appears there; it just isn't a credential anymore.
- There is no org-picker or org-disambiguation UI anywhere, by design. If the backend ever allows
  one email across multiple orgs, this is the assumption that breaks first.

### Pre-auth org branding (login, forgot-password)

Replacing the slug field with something that still tells the user they're in the right place:

- `GET /organizations/public/lookup?email=` — public, unauthenticated, returns `{ slug, name,
  logoUrl, primaryColor, accentColor }`. Called directly with `fetch` in
  `src/features/auth/api.ts`, deliberately not through `apiFetch`, since there's no session yet and
  none of the bearer-token/refresh machinery applies.
- `src/features/auth/useOrgBranding.ts` — shared by every pre-auth screen with an email field.
  Debounces the lookup 400ms as the user types and routes the result through
  `useThemeStore().applyOrgTheme`, so the login screen repaints in the customer's own colors and
  logo. A 404 mid-typing is an expected outcome, not an error to surface. An unresolved email shows
  **no** logo rather than falling back to the generic Tecres mark.
- `src/lib/lastOrg.ts` — caches the last successfully-signed-into org's full branding in
  `localStorage.tecres_last_org_branding` (written on every session hydration in `auth.store.ts`,
  and deliberately **not** cleared on logout, since surviving logout is the entire point). Read
  synchronously on first render so a returning user gets their own branding with no network round
  trip and no flash of the generic mark. This is branding only, never a credential, which is why
  it's allowed in `localStorage` at all under the token rule in `CLAUDE.md`.
- `useOrgBranding` carries a deliberate three-layer autofill guard (native DOM listeners, a short
  post-mount poll, and a `getSubmitEmail()` that reads the live DOM value at submit time). It looks
  like belt-and-braces because it is: some mobile/WebView autofill paths set an input's value
  without dispatching anything React's synthetic event system sees, which left both the branding
  preview and the submitted value stuck on empty. Don't simplify it back to `onChange` alone.
- `src/components/brand/BrandedLoader.tsx` + `router.tsx`'s `FullScreenSpinner` use the same cache,
  so even the boot-time silent-refresh wait shows the customer's logo.

### Org logo as the browser tab favicon

`applyOrgTheme` in `src/store/theme.store.ts` now also swaps `<link rel="icon">` to the org's
`logoUrl`, on top of the CSS custom properties it already set. This keeps the "one place sets
per-tenant branding" rule in `CLAUDE.md` intact rather than adding a second branding path. It
falls back to the bundled Tecres mark when the org has no logo, and also when the URL is one the
browser can't fetch unaided (a `<link>` carries no auth header, unlike the `<img>` tags elsewhere
that resolve `/files/:id` themselves). Commit `42f0b22` replaced `public/favicon.svg` with
`public/favicon.png` for this.

### Notifications

A real, wired feature that appears in no phase of this plan. `src/features/notifications/api.ts`
consumes `GET /notifications`, `PUT /notifications/:id/read` and `PUT /notifications/read-all`
(which returns 204, so that mutation updates the cache locally rather than from a response body).
It **polls on a 60s interval** because the backend has no websocket/SSE channel. Surfaced as the
bell + unread badge + dropdown in `src/components/layout/Header.tsx`. The corresponding
`mockNotifications` was deleted from `mock-data.ts` in the same commit.

### Branded client-side PDFs, everywhere

`src/lib/pdfLogo.ts`'s `resolveLogoDataUrl` is the shared piece: jsPDF's `addImage` won't take a
Cloudinary http URL or a `blob:` object URL, so it fetches and re-reads as a data URL, which also
sidesteps canvas CORS tainting. Every client-side PDF generator now goes through it, so a
downloaded file carries the org's actual logo and not just its name in text:

- Reports export (`features/reports/lib/export.ts`, new `branding` argument)
- Label print sheets (`features/labels/lib/labelPdf.ts`)
- Audit reports (`AuditDetailPage`'s `downloadAuditReportPdf`)
- Check-out/return receipts (`CheckInOutPage`, whose header band is also tinted with the org's
  brand color so the receipt matches the app)

### Smaller cross-cutting additions

- `src/lib/compressImage.ts` — downscales and re-encodes image uploads (1280px max, JPEG q0.72)
  before they're sent, so asset photos don't land in storage at full camera resolution. Falls back
  to the original file on any failure rather than blocking the upload, and skips SVGs.
- `PermissionRoute` in `src/app/router.tsx` — gates a route on a `permissions.ts` key and bounces
  to `/` otherwise, so a role can't reach a page just by typing its URL. Currently applied to
  `/people` (`canManagePeople`). **UX only**, same caveat as the rest of `permissions.ts`: the
  backend's `authorize()` is the real boundary.
- `src/components/common/PasswordInput.tsx` — shared reveal-toggle password field, used across the
  auth screens.
- `src/lib/color.ts`'s `hexToRgb` (jsPDF needs RGB triples, not hex), `src/lib/format.ts`'s
  `formatRelativeTime`, `src/lib/extractLogoColors.ts` (suggests brand colors from an uploaded
  logo during onboarding/branding), and `src/features/not-found/NotFoundPage.tsx`.

### `src/lib/mock-data.ts` is now dead code

Nothing imports it. The phase-by-phase deletion described in the intro and §4.2 has run its course:
all that's left in the file is `mockOrg` and `mockCurrentUser`, unreferenced by any component or
store (the only remaining mention of "mock-data" anywhere in `src/` is a comment in
`ComingSoon.tsx`). **Deleting the file is a free cleanup for whoever next touches this area** — it
was left in place only because removing it wasn't any one phase's job. Note that `noUnusedLocals`
doesn't catch this, since unused *exports* are not unused locals, so the build won't flag it for
you.

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
