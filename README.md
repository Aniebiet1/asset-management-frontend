# Tecres Asset Manager — Frontend

The web app for Tecres Asset Manager (TecresTrackIT AMS): a Vite + React 19 + TypeScript SPA. It
covers the tenant app (assets, check-in/out, maintenance, audits, people, reports, labels,
settings) and a separate, minimal platform-admin area under `/platform/*` for the Tecres team.

It talks to the API in the sibling repo **`asset-management-backend`**. That repo has to be
running for anything past the login screen to work, so set it up first.

## Stack

Vite, React 19, TypeScript, React Router v7, TanStack Query (server state), Zustand (client
state), Tailwind v4, shadcn/ui (Nova preset), TanStack Table, react-hook-form + zod, recharts,
framer-motion, sonner, jspdf/xlsx, jsbarcode/qrcode/html5-qrcode.

**Package manager: npm.** (The backend uses pnpm. Don't mix them up.)

## Running locally

### Prerequisites

- **Node.js 20+**
- **The backend running** on `http://localhost:4000`. Follow "Running locally" in
  `asset-management-backend/README.md`: Postgres, `.env`, `pnpm db:migrate`, `pnpm db:seed`,
  `pnpm dev`. Check it with `curl http://localhost:4000/health`.
- **An authenticator app** on your phone. Every account has mandatory TOTP, so the first login
  makes you enroll one.

The repos are expected side by side:

```
asset-management-frontend/
asset-management-backend/
```

`asset-management-workspace.code-workspace` opens both in one VS Code window.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. It has one variable:

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | The backend's base URL, **including `/api`**. |

This value ships to the browser, so never put a secret in it. If the variable is missing, the app
renders a blank page (`src/lib/env.ts` throws on load), so check this first if you see a white
screen.

### 3. Start the dev server

```bash
npm run dev       # http://localhost:5173
```

Open **`http://localhost:5173`**, not `127.0.0.1:5173`. The backend's `CORS_ALLOWED_ORIGINS`
defaults to `http://localhost:5173`, and the browser treats the two hosts as different origins.

### 4. Log in

- **Tenant app:** `http://localhost:5173/login`. With the backend's `pnpm db:seed` data, sign in as
  **`ada@acme.test` / `Password123!`**. On first login you're taken to `/totp/enroll`: scan the
  QR code, enter the 6-digit code, and keep the recovery codes. After that each login asks for a
  code at `/totp/challenge`.
- **Platform admin:** `http://localhost:5173/platform/login`, using the account created by the
  backend's `pnpm db:seed-platform-admin` (credentials are set in
  `asset-management-backend/src/db/seedPlatformAdmin.ts`).

Password-reset and invite emails are only printed to the backend's console unless the backend
has email configured, so copy links from the `pnpm dev` output there.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR on port 5173 |
| `npm run build` | `tsc -b && vite build`, output in `dist/` |
| `npx tsc -b` | Type-check only (faster than a full build) |
| `npm run lint` | Oxlint |
| `npm run preview` | Serve the built `dist/` locally to check a production build |

`npm run build` is the real gate. `noUnusedLocals` / `noUnusedParameters` are on, so an unused
import fails the build.

## Production build

```bash
npm run build
```

`dist/` is a static SPA. Host it on any static host, but configure it to serve `index.html` for
every unknown path, or deep links like `/assets/123` will 404 on refresh. Set
`VITE_API_BASE_URL` at **build time** (in the host's build env or `.env.production`), since
Vite inlines it into the bundle. The deployed origin also has to be in the backend's
`CORS_ALLOWED_ORIGINS`, and the backend's `COOKIE_DOMAIN` has to match for refresh to work.

## Troubleshooting

- **Blank white page:** `VITE_API_BASE_URL` isn't set. Create `.env.local` (step 2) and restart
  `npm run dev`. Vite only reads env files on startup.
- **Login fails, with network or CORS errors in the browser console:** the
  backend isn't running, or isn't on the URL in `VITE_API_BASE_URL`, or this origin isn't in the
  backend's `CORS_ALLOWED_ORIGINS`.
- **Signed in, but signed out again after reloading:** the refresh cookie isn't reaching the
  backend. Use `localhost` for both apps, and make sure `VITE_API_BASE_URL` matches the backend's
  host exactly.
- **Port 5173 already in use:** Vite picks the next free port. That new origin isn't in the
  backend's CORS list by default, so either free 5173 or add the new origin there.

## Project layout

```
src/
  app/router.tsx      route tree: tenant routes behind ProtectedRoute/AppShell,
                      /platform/* behind its own guard
  features/<domain>/  one folder per domain: pages + api.ts (TanStack Query hooks)
  components/ui/      shadcn primitives (CLI-managed, add with `npx shadcn@latest add <name>`)
  components/layout/  AppShell, Sidebar, Header, mobile nav, command palette
  components/common/  shared building blocks (StatusBadge, PageHeader, ...)
  lib/                api clients, formatters, status colors, permissions (UX only)
  store/              Zustand stores: auth, platformAuth, theme
  types/              domain types, kept in sync with the backend's Drizzle schema
```

## Further reading

- `CLAUDE.md`: conventions (theming tokens, shadcn setup, the tenant vs. platform auth split, UI
  copy rules).
- `BUILD_PLAN.md`: phased build order and what's real vs. still mock-backed.
- `solid_implementation_plan.md`: the full technical spec.
- `asset-management-backend/README.md`: API, auth model, and backend setup.
