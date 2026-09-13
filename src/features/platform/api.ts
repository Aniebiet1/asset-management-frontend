import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { Organization, PlanStatus, PlatformAlert, PlatformOrgSummary } from "@/types";

interface FleetStats {
  totalOrgs: number;
  totalUsers: number;
  totalAssets: number;
}

export function useFleetStatsQuery() {
  return useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => platformApiFetch<{ data: FleetStats }>("/platform/stats").then((r) => r.data),
  });
}

export function useOrgsQuery() {
  return useQuery({
    queryKey: ["platform", "orgs", "list"],
    queryFn: () => platformApiFetch<{ data: PlatformOrgSummary[] }>("/platform/orgs").then((r) => r.data),
  });
}

export function useOrgDetailQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: ["platform", "orgs", "detail", orgId],
    queryFn: () =>
      platformApiFetch<{ data: { org: Organization; usage: { userCount: number; assetCount: number } } }>(`/platform/orgs/${orgId}`).then(
        (r) => r.data
      ),
    enabled: !!orgId,
  });
}

interface CreateOrgInput {
  orgName: string;
  orgSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export function useCreateOrgMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrgInput) =>
      platformApiFetch<{ data: { org: Organization; enrollmentToken: string } }>("/platform/orgs", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "orgs", "list"] }),
  });
}

export function useUpdateOrgStatusMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planStatus: PlanStatus) =>
      platformApiFetch<{ data: Organization }>(`/platform/orgs/${orgId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ planStatus }),
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "orgs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "orgs", "detail", orgId] });
    },
  });
}

export function useUpdateOrgQuotasMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotas: { assetQuota?: number; userQuota?: number }) =>
      platformApiFetch<{ data: Organization }>(`/platform/orgs/${orgId}/quotas`, {
        method: "PATCH",
        body: JSON.stringify(quotas),
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "orgs", "list"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "orgs", "detail", orgId] });
    },
  });
}

export function useAlertsQuery() {
  return useQuery({
    queryKey: ["platform", "alerts"],
    queryFn: () => platformApiFetch<{ data: PlatformAlert[] }>("/platform/alerts").then((r) => r.data),
  });
}

export function useResolveAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => platformApiFetch<{ data: PlatformAlert }>(`/platform/alerts/${alertId}/resolve`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "alerts"] }),
  });
}
