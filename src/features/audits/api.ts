import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Audit, AuditReport, AuditScanResult, AuditScopeType, AuditStatusHistoryEntry, AuditWithItems } from "@/types";

/**
 * Audit workflow API hooks (assign -> scan -> submit -> verify, plan §D). Follows the same shape
 * as features/assets/api.ts: thin TanStack Query wrappers around apiFetch, invalidating the
 * ["audits", "list"] and ["audits", "detail", id] keys on every mutation so the list view and the
 * detail/workflow view both pick up the new state.
 */

export function useAuditsQuery() {
  return useQuery({
    queryKey: ["audits", "list"],
    queryFn: () => apiFetch<{ data: Audit[] }>("/audits").then((r) => r.data),
  });
}

export function useAuditQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["audits", "detail", id],
    queryFn: () => apiFetch<{ data: AuditWithItems }>(`/audits/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAuditHistoryQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["audits", "detail", id, "history"],
    queryFn: () => apiFetch<{ data: AuditStatusHistoryEntry[] }>(`/audits/${id}/history`).then((r) => r.data),
    enabled: !!id,
  });
}

/** Only reachable once the audit is verified; the backend 409s otherwise, so callers gate `enabled`. */
export function useAuditReportQuery(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["audits", "detail", id, "report"],
    queryFn: () => apiFetch<{ data: AuditReport }>(`/audits/${id}/report`).then((r) => r.data),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export interface CreateAuditInput {
  name: string;
  scopeType: AuditScopeType;
  scopeId?: string;
  notes?: string;
}

export function useCreateAuditMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAuditInput) =>
      apiFetch<{ data: Audit }>("/audits", { method: "POST", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["audits", "list"] }),
  });
}

function invalidateAudit(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ["audits", "list"] });
  queryClient.invalidateQueries({ queryKey: ["audits", "detail", id] });
}

export function useAssignAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assigneeId: string) =>
      apiFetch<{ data: Audit }>(`/audits/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assigneeId }) }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useStartAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ data: Audit }>(`/audits/${id}/start`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export interface ScanAuditInput {
  scannedTag: string;
  locationId?: string;
  condition?: string;
}

export function useScanAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScanAuditInput) =>
      apiFetch<{ data: AuditScanResult }>(`/audits/${id}/scan`, { method: "POST", body: JSON.stringify(input) }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useSubmitAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffRemark: string) =>
      apiFetch<{ data: Audit }>(`/audits/${id}/submit`, { method: "POST", body: JSON.stringify({ staffRemark }) }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useVerifyAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (verifierRemark: string | undefined) =>
      apiFetch<{ data: Audit }>(`/audits/${id}/verify`, { method: "POST", body: JSON.stringify({ verifierRemark }) }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useRejectAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rejectionReason: string) =>
      apiFetch<{ data: Audit }>(`/audits/${id}/reject`, { method: "POST", body: JSON.stringify({ rejectionReason }) }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useResumeAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ data: Audit }>(`/audits/${id}/resume`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}

export function useCancelAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ data: Audit }>(`/audits/${id}/cancel`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => invalidateAudit(queryClient, id),
  });
}
