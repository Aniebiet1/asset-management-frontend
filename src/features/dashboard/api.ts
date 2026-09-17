import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DashboardStats, DashboardCharts, ActivityLogEntry } from "@/types";

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch<{ data: DashboardStats }>("/dashboard/stats").then((r) => r.data),
  });
}

export function useDashboardChartsQuery() {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: () => apiFetch<{ data: DashboardCharts }>("/dashboard/charts").then((r) => r.data),
  });
}

export function useDashboardActivityQuery() {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => apiFetch<{ data: ActivityLogEntry[] }>("/dashboard/activity").then((r) => r.data),
  });
}
