import { CatalogManager, type CatalogFieldConfig } from "@/features/catalog/components/CatalogManager";
import {
  useVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} from "@/features/catalog/api";
import { PageHeader } from "@/components/common/PageHeader";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";
import type { Vendor } from "@/types";

const vendorFields: CatalogFieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "Acme Supplies Ltd." },
  { name: "code", label: "Code", type: "text", required: true, placeholder: "ACME-SUP" },
  { name: "contactPerson", label: "Contact person", type: "text" },
  { name: "email", label: "Email", type: "text", placeholder: "sales@vendor.com" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "website", label: "Website", type: "text", placeholder: "https://vendor.com" },
  { name: "address", label: "Address", type: "textarea" },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "isActive", label: "Active", type: "switch" },
];

/**
 * Vendors' real write UI, per BUILD_PLAN.md Phase 7 (vendors was read-only in Phase 3's catalog
 * work, feeding the asset form's dropdown; this page owns create/edit/delete). Backend's
 * vendorsRouter gates writes on "canManageVendors" (catalog.router.ts), not canManageOrg.
 */
export function VendorsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManage = hasPermission(currentUser?.role, "canManageVendors");

  const vendors = useVendorsQuery();
  const createVendor = useCreateVendorMutation();
  const updateVendor = useUpdateVendorMutation();
  const deleteVendor = useDeleteVendorMutation();

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Suppliers and service providers used for asset purchases and maintenance."
      />
      <CatalogManager<Vendor>
        resourceLabel="Vendor"
        showHeading={false}
        items={vendors.data}
        isLoading={vendors.isLoading}
        fields={vendorFields}
        canManage={canManage}
        renderSubtitle={(v) => [v.contactPerson, v.email, v.phone].filter(Boolean).join(" \u00b7 ") || null}
        onCreate={(input) => createVendor.mutateAsync(input)}
        onUpdate={(id, input) => updateVendor.mutateAsync({ id, data: input })}
        onDelete={(id) => deleteVendor.mutateAsync(id)}
      />
    </div>
  );
}


