import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Asset, AssetAssignment, AssetStatus, MaintenanceRecord } from "@/types";

export interface AssetListFilters {
  status?: AssetStatus;
  categoryId?: string;
  locationId?: string;
  departmentId?: string;
  custodianId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface AssetListResult {
  data: Asset[];
  pagination: { page: number; pageSize: number; total: number };
}

function buildQuery(filters: AssetListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.custodianId) params.set("custodianId", filters.custodianId);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  return params.toString();
}

export function useAssetsQuery(filters: AssetListFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["assets", "list", filters],
    queryFn: () => apiFetch<AssetListResult>(`/assets?${buildQuery(filters)}`),
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}

export function useAssetQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["assets", "detail", id],
    queryFn: () => apiFetch<{ data: Asset }>(`/assets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAssetHistoryQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["assets", "detail", id, "history"],
    queryFn: () => apiFetch<{ data: AssetAssignment[] }>(`/assets/${id}/history`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAssetMaintenanceQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["assets", "detail", id, "maintenance"],
    queryFn: () => apiFetch<{ data: MaintenanceRecord[] }>(`/assets/${id}/maintenance`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<{ data: Asset }>("/assets", { method: "POST", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAssetMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<{ data: Asset }>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      queryClient.invalidateQueries({ queryKey: ["assets", "detail", id] });
    },
  });
}

export function useDeleteAssetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets", "list"] }),
  });
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export function useUploadFileMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<{ data: UploadedFile }>("/files/upload", { method: "POST", body: form }).then((r) => r.data);
    },
  });
}
