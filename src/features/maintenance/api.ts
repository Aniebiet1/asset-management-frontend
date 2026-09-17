import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { MaintenanceRecord } from "@/types";

/**
 * Maintenance CRUD, following the same `{ data }` envelope pattern as src/features/assets/api.ts.
 * `GET /maintenance` lists org-wide with no query params or pagination (per the backend router),
 * so this is a single flat list query rather than the paginated shape assets/api.ts uses.
 *
 * Completing or cancelling a record flips the underlying asset's status (see
 * asset-management-backend maintenance.service.ts's updateMaintenance: "in_progress" -> asset
 * goes to in_maintenance, "completed"/"cancelled" -> asset goes back to available), so every
 * mutation here invalidates ["assets"] defensively alongside ["maintenance"].
 */

function invalidateMaintenance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["maintenance"] });
  queryClient.invalidateQueries({ queryKey: ["assets"] });
}

export function useMaintenanceQuery() {
  return useQuery({
    queryKey: ["maintenance"],
    queryFn: () => apiFetch<{ data: MaintenanceRecord[] }>("/maintenance").then((r) => r.data),
  });
}

export function useCreateMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<{ data: MaintenanceRecord }>("/maintenance", { method: "POST", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiFetch<{ data: MaintenanceRecord }>(`/maintenance/${id}`, { method: "PUT", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useDeleteMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/maintenance/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}
