import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { OrgProfileForm } from "@/features/settings/components/OrgProfileForm";
import { BrandingForm } from "@/features/settings/components/BrandingForm";
import { AppearanceForm } from "@/features/settings/components/AppearanceForm";
import { CatalogTab } from "@/features/catalog/components/CatalogTab";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";

/**
 * Settings as a whole is admin-only, not just the org-editing tabs within it: the Sidebar already
 * hides the nav link for non-admins (canManageSettings / canManageOrg), this is the same check
 * enforced again at the page level so a direct /settings visit doesn't get further than this
 * message. This is UX gating only, per lib/permissions.ts's own caveat, not a security boundary,
 * the backend's authorize() middleware already rejects PATCH /organizations/me[/theme] from
 * anyone without the role for it.
 */
function SettingsAccessDenied() {
  return (
    <div>
      <PageHeader title="Settings" description="Organization profile, branding and theme." />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Admins only</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Only organization admins can view or change organization settings, including the theme colors and logo.
        </p>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const canManageOrgSettings = hasPermission(currentUser?.role, "canManageSettings") || hasPermission(currentUser?.role, "canManageOrg");

  if (!canManageOrgSettings || !org) return <SettingsAccessDenied />;

  return (
    <div>
      <PageHeader title="Settings" description="Organization profile, branding and theme." />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardContent className="p-6">
              <OrgProfileForm
                org={org}
                onSaved={() => {
                  toast.success("Organization profile updated");
                }}
                renderActions={({ isSaving }) => (
                  <Button type="submit" disabled={isSaving} className="gap-1.5">
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    Save changes
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardContent className="p-6">
              <BrandingForm
                org={org}
                onSaved={() => {
                  toast.success("Branding updated");
                }}
                renderActions={({ isSaving }) => (
                  <Button type="submit" disabled={isSaving} className="gap-1.5">
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    Save changes
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog">
          <Card>
            <CardContent className="p-6">
              <CatalogTab canManage={canManageOrgSettings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardContent className="p-6">
              <AppearanceForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
