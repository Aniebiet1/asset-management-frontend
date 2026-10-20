import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { MaintenanceRecord, ServiceEntryType, ServiceHistory } from "@/types";

export interface ServiceEntryInput {
  date: string;
  type: ServiceEntryType;
  title: string;
  cost: number;
  comment?: string;
  vendorId?: string | null;
  technicianName?: string;
}

const historyKey = (assetId: string) => ["assets", "detail", assetId, "service-history"] as const;

export function useServiceHistoryQuery(assetId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: historyKey(assetId ?? ""),
    queryFn: () => apiFetch<{ data: ServiceHistory }>(`/assets/${assetId}/service-history`).then((r) => r.data),
    enabled: !!assetId && (options?.enabled ?? true),
  });
}

// Entries are maintenance records underneath, so the Maintenance page and dashboard refresh too.
function useInvalidateServiceHistory(assetId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: historyKey(assetId) });
    queryClient.invalidateQueries({ queryKey: ["assets", "detail", assetId, "maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateServiceEntryMutation(assetId: string) {
  const invalidate = useInvalidateServiceHistory(assetId);
  return useMutation({
    mutationFn: (input: ServiceEntryInput) =>
      apiFetch<{ data: MaintenanceRecord }>(`/assets/${assetId}/service-history`, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useUpdateServiceEntryMutation(assetId: string) {
  const invalidate = useInvalidateServiceHistory(assetId);
  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: Partial<ServiceEntryInput> }) =>
      apiFetch<{ data: MaintenanceRecord }>(`/assets/${assetId}/service-history/${entryId}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useDeleteServiceEntryMutation(assetId: string) {
  const invalidate = useInvalidateServiceHistory(assetId);
  return useMutation({
    mutationFn: (entryId: string) => apiFetch<void>(`/assets/${assetId}/service-history/${entryId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
