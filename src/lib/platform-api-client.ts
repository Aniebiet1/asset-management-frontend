import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { ApiError } from "@/lib/http-error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Generic platform-admin API client. No refresh endpoint exists on the backend (see
 * platformAuth.store.ts) — a 401 here just clears the session so the platform route guard
 * redirects to `/platform/login`, it doesn't attempt a retry.
 */
export async function platformApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = usePlatformAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401) {
    usePlatformAuthStore.getState().clearSession();
    throw new ApiError(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.");
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
