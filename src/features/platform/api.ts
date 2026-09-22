import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApiFetch } from "@/lib/platform-api-client";
import type {
  ActivityLogEntry,
  FleetAnalytics,
  LoginRiskEntry,
  Organization,
  PlanStatus,
  PlatformAdmin,
  PlatformAdminInvite,
  PlatformAdminRole,
  PlatformAlert,
  PlatformOrgSummary,
  PlatformOrgUser,
} from "@/types";

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

export function useFleetAnalyticsQuery() {
  return useQuery({
    queryKey: ["platform", "analytics"],
    queryFn: () => platformApiFetch<{ data: FleetAnalytics }>("/platform/analytics").then((r) => r.data),
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

export function useOrgUsersQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: ["platform", "orgs", "users", orgId],
    queryFn: () => platformApiFetch<{ data: PlatformOrgUser[] }>(`/platform/orgs/${orgId}/users`).then((r) => r.data),
    enabled: !!orgId,
  });
}

export function useOrgActivityQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: ["platform", "orgs", "activity", orgId],
    queryFn: () => platformApiFetch<{ data: ActivityLogEntry[] }>(`/platform/orgs/${orgId}/activity`).then((r) => r.data),
    enabled: !!orgId,
  });
}

export function useForceResetPasswordMutation(orgId: string) {
  return useMutation({
    mutationFn: (userId: string) =>
      platformApiFetch<{ message: string }>(`/platform/orgs/${orgId}/users/${userId}/force-reset`, { method: "POST" }),
  });
}

export function useLoginRiskQuery() {
  return useQuery({
    queryKey: ["platform", "security", "login-risk"],
    queryFn: () => platformApiFetch<{ data: LoginRiskEntry[] }>("/platform/security/login-risk").then((r) => r.data),
    // Live risk state moves as attempts happen — refresh in the background while the dashboard's open.
    refetchInterval: 60_000,
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

// --- Platform admin management (platform_owner only) -----------------------

interface PlatformAdminsResponse {
  admins: PlatformAdmin[];
  invites: PlatformAdminInvite[];
}

export function usePlatformAdminsQuery(enabled = true) {
  return useQuery({
    queryKey: ["platform", "admins"],
    queryFn: () => platformApiFetch<{ data: PlatformAdminsResponse }>("/platform/admins").then((r) => r.data),
    enabled,
  });
}

export function useInvitePlatformAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; role: PlatformAdminRole }) =>
      platformApiFetch<{ data: PlatformAdminInvite }>("/platform/admins/invite", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "admins"] }),
  });
}

export function useUpdatePlatformAdminRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adminId, role }: { adminId: string; role: PlatformAdminRole }) =>
      platformApiFetch<{ data: PlatformAdmin }>(`/platform/admins/${adminId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "admins"] }),
  });
}
