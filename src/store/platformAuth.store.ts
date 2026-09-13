import { create } from "zustand";
import type { PlatformAdmin, PlatformAdminRole } from "@/types";
import { ApiError } from "@/lib/http-error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fully separate from `auth.store.ts` on purpose — mirrors the backend's separate identity space
 * for platform admins (own JWT secret, own tables). Never share a token or store instance between
 * this and the tenant auth store. See BUILD_PLAN.md §1 and the frontend CLAUDE.md.
 *
 * Unlike the tenant store, there is no `/platform/auth/refresh` endpoint on the backend yet —
 * platform-admin sessions are a single non-rotating JWT held in memory. A page reload means
 * re-login; this is a known, accepted gap (see backend CLAUDE.md), not a bug in this store.
 */

interface AdminSummary {
  id: string;
  name: string;
  email: string;
  role: PlatformAdminRole;
}

interface TotpEnrollmentRequired {
  status: "totp_enrollment_required";
  enrollmentToken: string;
}
interface TotpChallengeRequired {
  status: "totp_challenge_required";
  preAuthToken: string;
}
export type PlatformLoginResult = TotpEnrollmentRequired | TotpChallengeRequired;

interface SessionResponse {
  accessToken: string;
  admin: AdminSummary;
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

interface PlatformAuthState {
  accessToken: string | null;
  admin: PlatformAdmin | null;
  status: "signed-out" | "signed-in";

  login: (email: string, password: string) => Promise<PlatformLoginResult>;
  startTotpEnrollment: (enrollmentToken: string) => Promise<EnrollmentStartResponse>;
  verifyTotpEnrollment: (enrollmentToken: string, code: string) => Promise<{ recoveryCodes: string[] }>;
  completeTotpChallenge: (preAuthToken: string, code: string) => Promise<void>;
  clearSession: () => void;
}

function toAdmin(summary: AdminSummary): PlatformAdmin {
  return {
    id: summary.id,
    name: summary.name,
    email: summary.email,
    role: summary.role,
    totpEnabled: true, // reaching a session at all means enrollment already completed
    isActive: true,
    createdAt: "",
    updatedAt: "",
  };
}

export const usePlatformAuthStore = create<PlatformAuthState>((set) => ({
  accessToken: null,
  admin: null,
  status: "signed-out",

  login: (email, password) =>
    rawFetch<PlatformLoginResult>("/platform/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  startTotpEnrollment: (enrollmentToken) =>
    rawFetch<EnrollmentStartResponse>("/platform/auth/totp/enroll", { method: "POST", body: JSON.stringify({ enrollmentToken }) }),

  verifyTotpEnrollment: async (enrollmentToken, code) => {
    const session = await rawFetch<EnrollmentVerifyResponse>("/platform/auth/totp/verify-enroll", {
      method: "POST",
      body: JSON.stringify({ enrollmentToken, code }),
    });
    set({ accessToken: session.accessToken, admin: toAdmin(session.admin), status: "signed-in" });
    return { recoveryCodes: session.recoveryCodes };
  },

  completeTotpChallenge: async (preAuthToken, code) => {
    const session = await rawFetch<SessionResponse>("/platform/auth/login/totp", {
      method: "POST",
      body: JSON.stringify({ preAuthToken, code }),
    });
    set({ accessToken: session.accessToken, admin: toAdmin(session.admin), status: "signed-in" });
  },

  clearSession: () => set({ accessToken: null, admin: null, status: "signed-out" }),
}));
