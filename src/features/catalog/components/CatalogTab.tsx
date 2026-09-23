import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogManager, type CatalogFieldConfig } from "@/features/catalog/components/CatalogManager";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useSubsidiariesQuery,
  useCreateSubsidiaryMutation,
  useUpdateSubsidiaryMutation,
  useDeleteSubsidiaryMutation,
  useBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from "@/features/catalog/api";
import type { Branch, Category, Department, Location, Subsidiary } from "@/types";

const categoryFields: CatalogFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "Laptops" },
  { name: "code", label: "Code", type: "text", required: true, placeholder: "LAP" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "usefulLifeMonths", label: "Useful life (months)", type: "number", hint: "Used for straight-line depreciation." },
  { name: "depreciationRate", label: "Depreciation rate (%)", type: "decimal" },
];

const locationFields: CatalogFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "Lagos HQ" },
  { name: "code", label: "Code", type: "text", required: true, placeholder: "LG-HQ" },
  { name: "address", label: "Address", type: "text", fullWidth: true },
  { name: "city", label: "City", type: "text" },
  { name: "state", label: "State", type: "text" },
  { name: "country", label: "Country", type: "text" },
  { name: "building", label: "Building", type: "text" },
  { name: "floor", label: "Floor", type: "text" },
  { name: "room", label: "Room", type: "text" },
  { name: "isActive", label: "Active", type: "switch" },
];

const departmentFields: CatalogFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "Information Technology" },
  { name: "code", label: "Code", type: "text", required: true, placeholder: "IT" },
  { name: "description", label: "Description", type: "textarea" },
];

const subsidiaryFields: CatalogFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "Coscharis Concept Ltd" },
  { name: "code", label: "Code", type: "text", required: true, placeholder: "CCL", hint: "Short, uppercase - embedded in every asset tag for this subsidiary." },
];

/**
 * Subsidiaries/branches drive the structured asset tag format (see AssetForm.tsx and the Asset
 * Tagging System proposal) - branch codes are scoped to a subsidiary (two subsidiaries can both
 * have a "09") and lock once a branch has been used to generate at least one tag.
 */
function BranchesManager({ canManage }: { canManage: boolean }) {
  const subsidiaries = useSubsidiariesQuery();
  const [subsidiaryId, setSubsidiaryId] = useState<string | undefined>(undefined);
  const effectiveSubsidiaryId = subsidiaryId ?? subsidiaries.data?.[0]?.id;

  const branches = useBranchesQuery(effectiveSubsidiaryId);
  const createBranch = useCreateBranchMutation();
  const updateBranch = useUpdateBranchMutation();
  const deleteBranch = useDeleteBranchMutation();

  const branchFields: CatalogFieldConfig[] = [
    { name: "subsidiaryId", label: "Subsidiary", type: "select", required: true, options: subsidiaries.data?.map((s) => ({ value: s.id, label: s.name })) ?? [] },
    { name: "name", label: "Name", type: "text", required: true, placeholder: "Festac" },
    {
      name: "code",
      label: "Code",
      type: "text",
      required: true,
      placeholder: "09",
      hint: "2 digits, e.g. 01-99. Locks once a tag has been generated for this branch.",
      disabledWhen: (item) => !!(item as Branch | null)?.codeLocked,
    },
  ];

  if (!subsidiaries.isLoading && subsidiaries.data?.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Add a subsidiary first, then branches can be created under it.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select value={effectiveSubsidiaryId} onValueChange={setSubsidiaryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select subsidiary" />
          </SelectTrigger>
          <SelectContent>
            {subsidiaries.data?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CatalogManager<Branch>
        resourceLabel="Branch"
        showHeading={false}
        items={branches.data}
        isLoading={branches.isLoading}
        fields={branchFields}
        canManage={canManage}
        renderSubtitle={(b) => (b.codeLocked ? "Code locked" : null)}
        onCreate={(input) => createBranch.mutateAsync(input)}
        onUpdate={(id, input) => updateBranch.mutateAsync({ id, data: input })}
        onDelete={(id) => deleteBranch.mutateAsync(id)}
      />
    </div>
  );
}

/**
 * Categories/locations/departments/subsidiaries/branches management, per BUILD_PLAN.md Phase 3's
 * "shared Catalog tab under Settings" layout choice. Vendors is deliberately excluded: it's Phase
 * 7's write-UI to build, and the asset form only needs a read-only vendor list (fetched directly
 * there).
 */
export function CatalogTab({ canManage }: { canManage: boolean }) {
  const categories = useCategoriesQuery();
  const createCategory = useCreateCategoryMutation();
  const updateCategory = useUpdateCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();

  const locations = useLocationsQuery();
  const createLocation = useCreateLocationMutation();
  const updateLocation = useUpdateLocationMutation();
  const deleteLocation = useDeleteLocationMutation();

  const departments = useDepartmentsQuery();
  const createDepartment = useCreateDepartmentMutation();
  const updateDepartment = useUpdateDepartmentMutation();
  const deleteDepartment = useDeleteDepartmentMutation();

  const subsidiaries = useSubsidiariesQuery();
  const createSubsidiary = useCreateSubsidiaryMutation();
  const updateSubsidiary = useUpdateSubsidiaryMutation();
  const deleteSubsidiary = useDeleteSubsidiaryMutation();

  return (
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="subsidiaries">Subsidiaries</TabsTrigger>
        <TabsTrigger value="branches">Branches</TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="pt-4">
        <CatalogManager<Category>
          resourceLabel="Category"
          description="Groups assets for reporting and drives default depreciation assumptions."
          items={categories.data}
          isLoading={categories.isLoading}
          fields={categoryFields}
          canManage={canManage}
          renderSubtitle={(c) => `${c.usefulLifeMonths} mo useful life · ${c.depreciationRate}% depreciation rate`}
          onCreate={(input) => createCategory.mutateAsync(input)}
          onUpdate={(id, input) => updateCategory.mutateAsync({ id, data: input })}
          onDelete={(id) => deleteCategory.mutateAsync(id)}
        />
      </TabsContent>

      <TabsContent value="locations" className="pt-4">
        <CatalogManager<Location>
          resourceLabel="Location"
          description="Physical sites and rooms assets can be assigned to."
          items={locations.data}
          isLoading={locations.isLoading}
          fields={locationFields}
          canManage={canManage}
          renderSubtitle={(l) => [l.city, l.state, l.country].filter(Boolean).join(", ") || null}
          onCreate={(input) => createLocation.mutateAsync(input)}
          onUpdate={(id, input) => updateLocation.mutateAsync({ id, data: input })}
          onDelete={(id) => deleteLocation.mutateAsync(id)}
        />
      </TabsContent>

      <TabsContent value="departments" className="pt-4">
        <CatalogManager<Department>
          resourceLabel="Department"
          description="Organizational units assets and staff can belong to."
          items={departments.data}
          isLoading={departments.isLoading}
          fields={departmentFields}
          canManage={canManage}
          renderSubtitle={(d) => d.description}
          onCreate={(input) => createDepartment.mutateAsync(input)}
          onUpdate={(id, input) => updateDepartment.mutateAsync({ id, data: input })}
          onDelete={(id) => deleteDepartment.mutateAsync(id)}
        />
      </TabsContent>

      <TabsContent value="subsidiaries" className="pt-4">
        <CatalogManager<Subsidiary>
          resourceLabel="Subsidiary"
          description="Top-level entities that generated asset tags are scoped under."
          items={subsidiaries.data}
          isLoading={subsidiaries.isLoading}
          fields={subsidiaryFields}
          canManage={canManage}
          onCreate={(input) => createSubsidiary.mutateAsync(input)}
          onUpdate={(id, input) => updateSubsidiary.mutateAsync({ id, data: input })}
          onDelete={(id) => deleteSubsidiary.mutateAsync(id)}
        />
      </TabsContent>

      <TabsContent value="branches" className="pt-4">
        <BranchesManager canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}
