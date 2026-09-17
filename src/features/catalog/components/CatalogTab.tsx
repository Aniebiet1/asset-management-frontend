import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/features/catalog/api";
import type { Category, Department, Location } from "@/types";

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

/**
 * Categories/locations/departments management, per BUILD_PLAN.md Phase 3's "shared Catalog tab
 * under Settings" layout choice. Vendors is deliberately excluded: it's Phase 7's write-UI to
 * build, and the asset form only needs a read-only vendor list (fetched directly there).
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

  return (
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
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
    </Tabs>
  );
}
