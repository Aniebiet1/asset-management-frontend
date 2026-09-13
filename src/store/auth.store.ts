import { create } from "zustand";
import type { CurrentUser, Organization, UserRole } from "@/types";
import { ApiError } from "@/lib/http-error";
import { useThemeStore } from "@/store/theme.store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Shared across all `refresh()` callers — see the de-duplication note inside `refresh()` below. */
let refreshPromise: Promise<boolean> | null = null;

/**
 * This store owns the tenant auth primitives directly (its own `fetch` calls for login/TOTP/
 * refresh/logout/me) rather than routing through `src/lib/api-client.ts`. `api-client.ts` reads
 * this store to attach the bearer token and calls `refresh()` on a 401 — if this store also
 * imported api-client, that'd be an import cycle. Every *other* tenant endpoint (Phase 2+) goes
 * through api-client as normal; only the handful of endpoints this store itself needs are
 * duplicated here as plain fetches.
 */

interface SessionUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  totpEnabled: boolean;
}

interface TotpEnrollmentRequired {
  status: "totp_enrollment_required";
  enrollmentToken: string;
}
interface TotpChallengeRequired {
  status: "totp_challenge_required";
  preAuthToken: string;
}
export type LoginResult = TotpEnrollmentRequired | TotpChallengeRequired;

interface SessionResponse {
  accessToken: string;
  user: SessionUser;
}
interface EnrollmentStartResponse {
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}
interface EnrollmentVerifyResponse extends SessionResponse {
  recoveryCodes: string[];
}

async function rawFetch<T>(path: string, init: RequestInit = {}, accessToken?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface AuthState {
  accessToken: string | null;
  currentUser: CurrentUser | null;
  org: Organization | null;
  /** "booting" = the app-boot silent-refresh attempt hasn't resolved yet — render nothing behind
   * a guard until this leaves "booting", so a valid session doesn't flash a login screen. */
  status: "booting" | "signed-out" | "signed-in";

  login: (orgSlug: string, email: string, password: string) => Promise<LoginResult>;
  startTotpEnrollment: (enrollmentToken: string) => Promise<EnrollmentStartResponse>;
  verifyTotpEnrollment: (enrollmentToken: string, code: string) => Promise<{ recoveryCodes: string[] }>;
  completeTotpChallenge: (preAuthToken: string, code: string) => Promise<void>;
  requestPasswordReset: (orgSlug: string, email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;

  /** Called once on app mount: attempts a silent session restore from the httpOnly refresh cookie. */
  bootstrap: () => Promise<void>;
  /** Used both on boot and by api-client's 401 handler. Returns whether a session was restored. */
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  /** Clears local state without hitting the API — used when refresh is exhausted mid-session. */
  clearSession: () => void;
  /** Re-fetches org only (e.g. after the onboarding wizard or a settings change). */
  refetchOrg: () => Promise<void>;
}

async function hydrateFromToken(accessToken: string): Promise<{ currentUser: CurrentUser; org: Organization }> {
  const [{ user }, { data: org }] = await Promise.all([
    rawFetch<{ user: Omit<CurrentUser, "orgName"> }>("/auth/me", {}, accessToken),
    rawFetch<{ data: Organization }>("/organizations/me", {}, accessToken),
  ]);
  const currentUser: CurrentUser = { ...user, orgName: org.name };
  useThemeStore.getState().applyOrgTheme(org);
  return { currentUser, org };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  currentUser: null,
  org: null,
  status: "booting",

  login: (orgSlug, email, password) =>
    rawFetch<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify({ orgSlug, email, password }) }),

  startTotpEnrollment: (enrollmentToken) =>
    rawFetch<EnrollmentStartResponse>("/auth/totp/enroll", { method: "POST", body: JSON.stringify({ enrollmentToken }) }),

  verifyTotpEnrollment: async (enrollmentToken, code) => {
    const session = await rawFetch<EnrollmentVerifyResponse>("/auth/totp/verify-enroll", {
      method: "POST",
      body: JSON.stringify({ enrollmentToken, code }),
    });
    const { currentUser, org } = await hydrateFromToken(session.accessToken);
    set({ accessToken: session.accessToken, currentUser, org, status: "signed-in" });
    return { recoveryCodes: session.recoveryCodes };
  },

  completeTotpChallenge: async (preAuthToken, code) => {
    const session = await rawFetch<SessionResponse>("/auth/login/totp", {
      method: "POST",
      body: JSON.stringify({ preAuthToken, code }),
    });
    const { currentUser, org } = await hydrateFromToken(session.accessToken);
    set({ accessToken: session.accessToken, currentUser, org, status: "signed-in" });
  },

  requestPasswordReset: (orgSlug, email) =>
    rawFetch("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ orgSlug, email }) }),

  confirmPasswordReset: (token, newPassword) =>
    rawFetch("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ token, newPassword }) }),

  bootstrap: async () => {
    const restored = await get().refresh();
    if (!restored) set({ status: "signed-out" });
  },

  refresh: () => {
    // De-duplicated: the backend rotates the refresh token on every call and revokes the
    // presented one (theft-detection on reuse). Two calls in flight at once — React StrictMode's
    // dev-only double-effect-invoke today, or simply two API calls 401ing at the same moment once
    // Phase 2 has multiple parallel queries — would both present the same not-yet-rotated cookie
    // value, and the backend has no compare-and-swap against that: both can independently read the
    // token as still-valid and each mint a replacement, instead of the second one being caught as
    // reuse. Sharing one in-flight promise across all callers makes that race unreachable from this
    // client, rather than relying on the backend to guard against a concurrent-rotation race it
    // doesn't currently handle.
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const session = await rawFetch<SessionResponse>("/auth/refresh", { method: "POST" });
          const { currentUser, org } = await hydrateFromToken(session.accessToken);
          set({ accessToken: session.accessToken, currentUser, org, status: "signed-in" });
          return true;
        } catch {
          set({ accessToken: null, currentUser: null, org: null, status: "signed-out" });
          return false;
        } finally {
          refreshPromise = null;
        }
      })();
    }
    return refreshPromise;
  },

  logout: async () => {
    try {
      await rawFetch("/auth/logout", { method: "POST" });
    } catch {
      // best-effort — clear local state regardless
    }
    get().clearSession();
  },

  clearSession: () => set({ accessToken: null, currentUser: null, org: null, status: "signed-out" }),

  refetchOrg: async () => {
    const token = get().accessToken;
    if (!token) return;
    const { data: org } = await rawFetch<{ data: Organization }>("/organizations/me", {}, token);
    useThemeStore.getState().applyOrgTheme(org);
    set({ org });
  },
}));
