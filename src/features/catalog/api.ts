import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Branch, Category, Department, Location, Subsidiary, Vendor } from "@/types";

/**
 * Catalog CRUD (categories/locations/departments/vendors/subsidiaries/branches), all backed by the
 * same `createCrudRouter` shape on the backend: `GET/POST /<resource>`, `PUT/DELETE /<resource>/:id`,
 * each returning `{ data: T }` (list) or `{ data: T }` (item), 204 on delete. Vendors only gets a
 * read hook here, per BUILD_PLAN.md Phase 3 (write UI for vendors is Phase 7's job) - this list is
 * only needed for the asset form's vendor dropdown. Branches has a hand-rolled router server-side
 * (it enforces the code lock), but its HTTP shape is identical, so it reuses this factory too.
 */

function catalogHooks<T extends { id: string }>(
  resource: "categories" | "locations" | "departments" | "vendors" | "subsidiaries" | "branches"
) {
  const queryKey = ["catalog", resource] as const;

  function useList() {
    return useQuery({
      queryKey,
      queryFn: () => apiFetch<{ data: T[] }>(`/${resource}`).then((r) => r.data),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: Record<string, unknown>) =>
        apiFetch<{ data: T }>(`/${resource}`, { method: "POST", body: JSON.stringify(input) }).then((r) => r.data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        apiFetch<{ data: T }>(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }).then((r) => r.data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => apiFetch<void>(`/${resource}/${id}`, { method: "DELETE" }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
  }

  return { useList, useCreate, useUpdate, useDelete };
}

const categoryHooks = catalogHooks<Category>("categories");
const locationHooks = catalogHooks<Location>("locations");
const departmentHooks = catalogHooks<Department>("departments");
const vendorHooks = catalogHooks<Vendor>("vendors");
const subsidiaryHooks = catalogHooks<Subsidiary>("subsidiaries");
const branchHooks = catalogHooks<Branch>("branches");

export const useCategoriesQuery = categoryHooks.useList;
export const useCreateCategoryMutation = categoryHooks.useCreate;
export const useUpdateCategoryMutation = categoryHooks.useUpdate;
export const useDeleteCategoryMutation = categoryHooks.useDelete;

export const useLocationsQuery = locationHooks.useList;
export const useCreateLocationMutation = locationHooks.useCreate;
export const useUpdateLocationMutation = locationHooks.useUpdate;
export const useDeleteLocationMutation = locationHooks.useDelete;

export const useDepartmentsQuery = departmentHooks.useList;
export const useCreateDepartmentMutation = departmentHooks.useCreate;
export const useUpdateDepartmentMutation = departmentHooks.useUpdate;
export const useDeleteDepartmentMutation = departmentHooks.useDelete;

/** Phase 7 (VendorsPage) builds vendor write UI on top of the same generic hooks used for
 * categories/locations/departments above; the read hook also still feeds the asset form's
 * vendor dropdown. */
export const useVendorsQuery = vendorHooks.useList;
export const useCreateVendorMutation = vendorHooks.useCreate;
export const useUpdateVendorMutation = vendorHooks.useUpdate;
export const useDeleteVendorMutation = vendorHooks.useDelete;

export const useSubsidiariesQuery = subsidiaryHooks.useList;
export const useCreateSubsidiaryMutation = subsidiaryHooks.useCreate;
export const useUpdateSubsidiaryMutation = subsidiaryHooks.useUpdate;
export const useDeleteSubsidiaryMutation = subsidiaryHooks.useDelete;

export const useBranchesQuery = branchHooks.useList;
export const useCreateBranchMutation = branchHooks.useCreate;
export const useUpdateBranchMutation = branchHooks.useUpdate;
export const useDeleteBranchMutation = branchHooks.useDelete;
