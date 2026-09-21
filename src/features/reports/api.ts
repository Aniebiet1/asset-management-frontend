import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Asset, User } from "@/types";

/**
 * Phase 8 Reports. `GET /reports/assets` shares its filter shape with Labels (`GET /labels/assets`)
 * per BUILD_PLAN.md plan §G, but only supports ONE date filter mode at a time via `dateField`
 * ("purchaseDate" | "depreciationDate") - there is no separate depreciation-percent/book-value
 * range filter on the backend yet (`assetReportQuerySchema` in
 * asset-management-backend/src/modules/reports/reports.schema.ts has no
 * depreciationFrom/depreciationTo, confirmed against the router and buildAssetReportQuery too).
 * This hook only sends what the backend actually accepts; percent-depreciated is computed
 * client-side (see src/lib/depreciation.ts) for display and for the "depreciation bucket"
 * group-by mode, not as a server-side filter. Flagged as a backend follow-up in BUILD_PLAN.md's
 * Phase 8 section already - do not fake a depreciation-range filter here by over-fetching and
 * filtering in JS, that breaks the `page`/`pageSize` contract this hook shares with every other
 * caller of `buildAssetReportQuery`.
 */
export interface AssetReportFilters {
  dateFrom?: string;
  dateTo?: string;
  dateField?: "purchaseDate" | "depreciationDate";
  categoryId?: string;
  custodianId?: string;
  auditAssigneeId?: string;
  locationId?: string;
  sortBy?: "purchaseDate" | "depreciationDate" | "currentValue" | "name" | "assetTag";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AssetReportRow extends Asset {
  /** Live-computed `purchaseDate + category.usefulLifeMonths`, per assetReportQuery.ts - not a
   * stored column, so it always reflects the asset's current category. */
  depreciationDate: string;
}

function buildQuery(filters: AssetReportFilters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.dateField) params.set("dateField", filters.dateField);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.custodianId) params.set("custodianId", filters.custodianId);
  if (filters.auditAssigneeId) params.set("auditAssigneeId", filters.auditAssigneeId);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDir) params.set("sortDir", filters.sortDir);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 50));
  return params.toString();
}

/** `GET /reports/assets` returns only `{ data: [...] }` - unlike `/assets`, there's no `pagination`
 * envelope with a total count, so the page infers "more rows exist" from whether a full page came
 * back rather than rendering a page count. */
export function useAssetReportQuery(filters: AssetReportFilters) {
  return useQuery({
    queryKey: ["reports", "assets", filters],
    queryFn: () => apiFetch<{ data: AssetReportRow[] }>(`/reports/assets?${buildQuery(filters)}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export interface ValuationDepreciationRow {
  categoryId: string;
  categoryName: string;
  usefulLifeMonths: number;
  depreciationRate: string;
  assetId: string;
  assetName: string;
  purchaseDate: string | null;
  purchasePrice: string | null;
  currentValue: string | null;
  salvageValue: string | null;
}

/** Org-wide, unfiltered - the backend route takes no query params. Requires `canViewAssetValuation`
 * on the backend too, so callers must gate `enabled` on that permission (see ReportsPage.tsx) so a
 * staff-role user never even issues this request. */
export function useValuationDepreciationReportQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["reports", "valuation-depreciation"],
    queryFn: () =>
      apiFetch<{ data: ValuationDepreciationRow[] }>("/reports/valuation-depreciation").then((r) => r.data),
    enabled: options?.enabled,
  });
}

/**
 * `src/features/people/api.ts` doesn't exist in this worktree yet (Phase 7 is being built by
 * another agent in parallel, per BUILD_PLAN.md's Working on it row). This is a minimal inline read
 * used only to resolve custodian names for the report table and to populate the custodian filter
 * dropdown, not a general people-domain hook. `GET /people` has no query params and no pagination
 * envelope (`{ data: User[] }`, everyone in the org). Once Phase 7 lands a real `usePeopleQuery`,
 * this can be deleted in favor of that.
 */
export function usePeopleForReportsQuery() {
  return useQuery({
    queryKey: ["reports", "people"],
    queryFn: () => apiFetch<{ data: User[] }>("/people").then((r) => r.data),
  });
}
