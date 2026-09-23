import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ActivityLogEntry, PersonInvite, User } from "@/types";

/** Actions logged around a login attempt (`auth.service.ts`) - what the login-activity panel shows. */
export const LOGIN_ACTIVITY_ACTIONS = [
  "login_success",
  "login_failed",
  "login_failed_lockout",
  "login_blocked_locked",
  "totp_challenge_failed",
] as const;

/**
 * People (`/people`) TanStack Query hooks, following the same shape as `features/assets/api.ts`.
 * `DELETE /people/:id` deactivates rather than hard-deletes (see people.router.ts's comment), so
 * the mutation here is named accordingly and the UI labels the action "Deactivate".
 */

export function usePeopleQuery() {
  return useQuery({
    queryKey: ["people"],
    queryFn: () => apiFetch<{ data: User[] }>("/people").then((r) => r.data),
  });
}

export function usePersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["people", "detail", id],
    queryFn: () => apiFetch<{ data: User }>(`/people/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdatePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch<{ data: User }>(`/people/${id}`, { method: "PUT", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useDeactivatePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/people/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useInvitePersonMutation() {
  return useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      apiFetch<{ message: string }>("/people/invite", { method: "POST", body: JSON.stringify(input) }),
  });
}

export function useAcceptInviteMutation() {
  return useMutation({
    mutationFn: ({ token, name, password }: { token: string; name: string; password: string }) =>
      apiFetch<{ data: User }>(`/people/invite/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      }).then((r) => r.data),
  });
}

export function usePendingInvitesQuery() {
  return useQuery({
    queryKey: ["people", "invites"],
    queryFn: () => apiFetch<{ data: PersonInvite[] }>("/people/invites").then((r) => r.data),
  });
}

export function useResendInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch<{ data: PersonInvite }>(`/people/invites/${inviteId}/resend`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people", "invites"] }),
  });
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => apiFetch<void>(`/people/invites/${inviteId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people", "invites"] }),
  });
}

/** A person's own login history (successes, failures, lockouts) - fetched on demand per row. */
export function useLoginActivityQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["people", "login-activity", userId],
    queryFn: () =>
      apiFetch<{ data: ActivityLogEntry[] }>(
        `/activity?userId=${encodeURIComponent(userId!)}&actions=${LOGIN_ACTIVITY_ACTIONS.join(",")}`
      ).then((r) => r.data),
    enabled: !!userId,
  });
}
