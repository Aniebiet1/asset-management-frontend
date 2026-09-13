# CLAUDE.md — asset-management-frontend

Tecres Asset Manager's frontend: a Vite + React 19 SPA. See `BUILD_PLAN.md` for the phased build
order (start there — it's the current source of truth for "what's real vs. mock right now") and
`solid_implementation_plan.md` for the full technical spec it's sequenced against. The backend
lives in the sibling repo `asset-management-backend`; its `CLAUDE.md` documents the API this app
consumes.

## Stack

Vite + React 19 + TypeScript, React Router v7, TanStack Query (server state), Zustand (client/UI
state), Tailwind v4, shadcn/ui, TanStack Table, react-hook-form + zod, recharts, framer-motion,
sonner, jspdf/xlsx, jsbarcode/qrcode/html5-qrcode.

**Package manager is npm** (this repo — the backend uses pnpm; don't cross the streams).

```bash
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build — this is the real gate, see below
npx tsc -b       # type-check only, faster than a full build
```

## Before considering any change done

`npx tsc -b` must be clean and `npm run build` must succeed. `noUnusedLocals`/`noUnusedParameters`
are on — an unused import fails the build, not just a lint warning. If you touched a page that
renders real data (not a `ComingSoon` stub), smoke-test it: run `npm run dev`, and drive it with a
headless browser rather than trusting the type-checker alone — a page can type-check and still
render blank if a hook throws. The pattern that worked in this repo: `npx playwright install
chromium` once, then a small `.mjs` script using `chromium.launch()` → `page.goto()` →
`page.screenshot()` → check `console` events for errors. Playwright isn't a project dependency —
install it with `npm install --no-save playwright` for a one-off check and don't let it end up in
`package.json`/`package-lock.json` (it has before; `git diff package.json` before committing if
you've done any ad hoc verification installs).

## shadcn/ui conventions (this project's CLI version, not the older docs)

- Components live in `src/components/ui/*`, added via `npx shadcn@latest add <name>` — don't
  hand-write a primitive that already exists in the registry.
- Class merging is the **`cn` npm package** (`import { cn } from "cn"`), not a hand-rolled
  `clsx`+`tailwind-merge` combo — that's what `src/lib/utils.ts` re-exports. Match it in new
  components rather than importing `clsx`/`tailwind-merge` directly (both are still installed as
  transitive deps but aren't the project's convention).
- Radix primitives come from the unified `radix-ui` package, not individual `@radix-ui/react-*`
  packages.
- Style preset is **Nova** (`components.json` → `"style": "radix-nova"`, base color `neutral`).
  It's what gives the monochrome dark aesthetic — don't fight it with ad hoc colors; extend the
  token set in `src/index.css` instead (see theming below).
- This CLI version has no standalone `form` registry component. React Hook Form + zod wiring
  (needed from Phase 3 onward per `BUILD_PLAN.md`) needs a small hand-built `FormField` wrapper —
  check `npx shadcn search` again before building one from scratch in case that's changed.

## Theming — this is load-bearing, not cosmetic

`src/index.css` defines `--org-primary`/`--org-accent` as the only two color tokens meant to vary
per tenant; every other token (`--primary`, `--sidebar-primary`, `--ring`, ...) derives from them.
`useThemeStore().applyOrgTheme(org)` (`src/store/theme.store.ts`) is the **only** place that should
call `documentElement.style.setProperty` on these — don't add per-component conditional styling for
org branding, route the color through these variables instead. This is what
`solid_implementation_plan.md` §H's "live theme application" actually means in this codebase.

Dark is the default theme (`index.html` sets `.dark` on `<html>` before paint via an inline script
reading `localStorage.tecres_theme`, to avoid a light-mode flash). Both light and dark palettes are
fully defined in `index.css` — don't assume dark-only when adding new tokens.

## Path alias & structure

`@/*` → `src/*` (configured in both `tsconfig.app.json` and `vite.config.ts` — if you add a new
path alias, both files need it, plus `tsconfig.json`'s root `compilerOptions.paths` for editor
tooling). Layout:

```
src/
  app/router.tsx       route tree — tenant routes behind ProtectedRoute/AppShell,
                        /platform/* behind a separate guard (Phase 1), see BUILD_PLAN.md §1
  features/<domain>/   one folder per domain: pages + (from Phase 1 on) api.ts TanStack Query hooks
  components/ui/       shadcn primitives, CLI-managed — don't hand-edit beyond what `add` generates
  components/layout/   AppShell, Sidebar, Header, MobileNav/Drawer, CommandPalette
  components/common/   StatusBadge family, PageHeader, ComingSoon
  components/brand/    Logo, OrgSwitcher
  lib/                 format.ts (formatters), status.ts (color maps), permissions.ts (frontend
                        nav-convenience only — see below), mock-data.ts (shrinking as phases land),
                        api-client.ts (Phase 1+)
  store/                auth.store.ts, theme.store.ts, platformAuth.store.ts (Phase 1+)
  types/                domain types — kept hand-in-sync with the backend's Drizzle schema
                        (asset-management-backend/src/db/schema/*), not generated
```

## Two separate identities: tenant vs. Tecres platform admin

The backend treats these as fully separate auth (different JWT secret, different tables — see
backend `CLAUDE.md`). Mirror that split here, not just in routing:

- Tenant: `src/store/auth.store.ts`, `src/lib/api-client.ts`, full `AppShell`.
- Platform: `src/store/platformAuth.store.ts`, `src/lib/platform-api-client.ts`, a deliberately
  minimal shell (no sidebar, no command palette — see `BUILD_PLAN.md` §1).

**Never** share a token/store/API-client instance between the two. A bug that lets a platform-admin
token flow into a tenant request (or vice versa) defeats the entire point of the backend's
separation.

## `src/lib/permissions.ts` is UX only

It's a hand-ported copy of the backend's role → permission matrix, used to hide/disable nav items
and buttons for roles that can't use them. It is **not** a security boundary — the backend's
`authorize()` middleware is, and it doesn't trust this file at all. If the backend's
`src/lib/permissions.ts` changes, update this copy to match, but never treat "the button is hidden"
as equivalent to "the API is protected."

## Auth token storage

Access tokens live in memory (Zustand), never `localStorage` — refresh happens via an httpOnly
cookie the backend sets, so there's nothing to persist client-side. On app boot, silently attempt a
refresh before deciding whether to show `/login`. See `BUILD_PLAN.md` §2 for the full API-client
contract once Phase 1 builds it.

## No em dashes in the UI, ever

Every piece of user-visible text — JSX copy, `placeholder`/`title`/`description`/`label` props,
toast messages, empty-state fallbacks like `value ?? "—"`, mock data that stands in for real
copy — must not contain an em dash (`—`). Rewrite the sentence, or use a period, comma, colon, or
a plain hyphen (`-`) instead. This applies to `src/lib/mock-data.ts` too, since it renders into
real UI even though it's fake data. For an empty/missing-value placeholder specifically, use `"-"`
(plain hyphen), not `"—"`.

This rule is about rendered UI text only — code comments and this file's own prose are exempt.

## Mock data is temporary, tracked, and phase-scoped

`src/lib/mock-data.ts` exists so pages can be built and reviewed before their backend wiring lands.
Per `BUILD_PLAN.md`, each phase replaces one feature's mock reads with real `TanStack Query` calls
and **deletes that feature's mock usage** in the same phase — don't leave a flag or fallback path
that silently serves mock data if a real call fails. If you're not sure whether a page you're
touching is still mock-backed, check `BUILD_PLAN.md`'s phase list before assuming either way.
