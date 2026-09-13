import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/http-error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function doFetch(path: string, init: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
}

/**
 * Generic tenant API client for every endpoint that isn't one of the auth primitives
 * `auth.store.ts` owns directly. Retries once on a 401 via the tenant refresh cookie; if that
 * fails too, clears the session so route guards redirect to `/login`.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await doFetch(path, init);

  if (res.status === 401) {
    const restored = await useAuthStore.getState().refresh();
    if (restored) {
      res = await doFetch(path, init);
    } else {
      useAuthStore.getState().clearSession();
      throw new ApiError(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.");
    }
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
