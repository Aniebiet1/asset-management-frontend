import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AppNotification } from "@/types";

const notificationsKey = ["notifications"] as const;

/** Polls rather than pushing - the backend has no websocket/SSE channel for notifications. */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => apiFetch<{ data: AppNotification[] }>("/notifications").then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: AppNotification }>(`/notifications/${id}/read`, { method: "PUT" }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<AppNotification[]>(notificationsKey, (prev) =>
        prev?.map((n) => (n.id === updated.id ? updated : n))
      );
    },
  });
}

/** `PUT /notifications/read-all` returns 204, so the cache is updated locally instead of from a response body. */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(notificationsKey, (prev) =>
        prev?.map((n) => ({ ...n, isRead: true }))
      );
    },
  });
}
