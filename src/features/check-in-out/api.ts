import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Asset, AssetAssignment, User } from "@/types";

/**
 * `GET /assignments` (assignments.router.ts) has no query params and returns the org's active
 * (not yet returned) assignments split into `active`/`overdue` server-side
 * (assignments.service.ts's `listActiveAndOverdue`) - not a flat list, despite the phase brief's
 * paraphrase. `overdue` is a subset of `active` (still unreturned, past `expectedReturnDate`).
 */
export interface AssignmentsListResult {
  active: AssetAssignment[];
  overdue: AssetAssignment[];
}

export interface CheckoutInput {
  assetId: string;
  userId: string;
  expectedReturnDate?: string;
  conditionOut?: string;
  notes?: string;
}

export interface CheckinInput {
  assignmentId: string;
  conditionIn: string;
  notes?: string;
}

export function useActiveAssignmentsQuery() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: () => apiFetch<{ data: AssignmentsListResult }>("/assignments").then((r) => r.data),
  });
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      apiFetch<{ data: AssetAssignment }>("/assignments/checkout", { method: "POST", body: JSON.stringify(input) }).then(
        (r) => r.data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useCheckinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckinInput) =>
      apiFetch<{ data: AssetAssignment }>("/assignments/checkin", { method: "POST", body: JSON.stringify(input) }).then(
        (r) => r.data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

/** Renders the receipt client-side via jspdf (no server-side PDF rendering, per BUILD_PLAN). */
export function fetchReceipt(assignmentId: string): Promise<AssetAssignment> {
  return apiFetch<{ data: AssetAssignment }>(`/assignments/${assignmentId}/receipt`).then((r) => r.data);
}

/**
 * `assetAssignments` rows returned by `GET /assignments` carry only `assetId`/`userId`, no joined
 * names (unlike `GET /assets/:id/history`, which the assets module joins separately). Resolve
 * display names by piggybacking on the same query keys `features/assets/api.ts`'s `useAssetQuery`
 * uses (`["assets", "detail", id]`), so results share cache entries with anyone who's already
 * opened that asset's detail page instead of re-fetching. Returns a lookup map rather than the
 * raw per-id query results so callers don't have to re-derive the id order themselves.
 */
export function useAssetsByIdsQuery(ids: string[]): { byId: Map<string, Asset>; isLoading: boolean } {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ["assets", "detail", id],
      queryFn: () => apiFetch<{ data: Asset }>(`/assets/${id}`).then((r) => r.data),
    })),
  });
  const byId = new Map<string, Asset>();
  let isLoading = false;
  results.forEach((result, index) => {
    if (result.data) byId.set(uniqueIds[index], result.data);
    if (result.isLoading) isLoading = true;
  });
  return { byId, isLoading };
}

/** No `features/people/api.ts` existed at the start of this phase (`PeoplePage` still rendered
 * mock users) - a minimal inline fetch here, per the phase brief, rather than coupling to another
 * feature's in-flight API layer being built in parallel elsewhere in this repo. */
export function usePeopleQuery() {
  return useQuery({
    queryKey: ["people", "list"],
    queryFn: () => apiFetch<{ data: User[] }>("/people").then((r) => r.data),
  });
}