import type { ReactNode } from "react";
import { cn } from "cn";
import { Building2, FolderTree, Loader2, Lock, Monitor, Palette, QrCode, ToggleRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { OrgProfileForm } from "@/features/settings/components/OrgProfileForm";
import { BrandingForm } from "@/features/settings/components/BrandingForm";
import { AppearanceForm } from "@/features/settings/components/AppearanceForm";
import { FeaturesForm } from "@/features/settings/components/FeaturesForm";
import { CatalogTab } from "@/features/catalog/components/CatalogTab";
import { LabelSettingsForm } from "@/features/settings/components/LabelSettingsForm";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";

const PAGE_DESCRIPTION = "Organization profile, branding, catalog, label defaults and features.";

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
      <PageHeader title="Settings" description={PAGE_DESCRIPTION} />
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

const SECTIONS = [
  { value: "organization", label: "Organization", icon: Building2 },
  { value: "branding", label: "Branding", icon: Palette },
  { value: "catalog", label: "Catalog", icon: FolderTree },
  { value: "labels", label: "Labels", icon: QrCode },
  { value: "features", label: "Features", icon: ToggleRight },
  { value: "appearance", label: "Appearance", icon: Monitor },
] as const;

const TAB_VALUES = SECTIONS.map((s) => s.value);

/**
 * The Card owns its own padding via --card-spacing rather than a `p-*` override on CardContent,
 * which would stack on top of the Card's own `py-` and leave the panel vertically lopsided.
 */
function SettingsPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn("[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]", className)}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SaveAction({ isSaving }: { isSaving: boolean }) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button type="submit" disabled={isSaving} className="w-full gap-1.5 sm:w-auto">
        {isSaving && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const canManageOrgSettings = hasPermission(currentUser?.role, "canManageSettings") || hasPermission(currentUser?.role, "canManageOrg");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_VALUES.find((t) => t === searchParams.get("tab")) ?? "organization";

  if (!canManageOrgSettings || !org) return <SettingsAccessDenied />;

  return (
    <div>
      <PageHeader title="Settings" description={PAGE_DESCRIPTION} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams(v === "organization" ? {} : { tab: v })}
        className="gap-4"
      >
        {/* h-auto! beats TabsList's own group-data-horizontal h-8, which would otherwise clip the
            second row of pills once they wrap on narrow screens. */}
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-1.5 p-1 sm:w-fit">
          {SECTIONS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="h-8 flex-none gap-1.5 px-3">
              <Icon className="hidden sm:block" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="organization">
          <SettingsPanel className="max-w-2xl">
            <OrgProfileForm
              org={org}
              onSaved={() => {
                toast.success("Organization profile updated");
              }}
              renderActions={({ isSaving }) => <SaveAction isSaving={isSaving} />}
            />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="branding">
          <SettingsPanel className="max-w-2xl">
            <BrandingForm
              org={org}
              onSaved={() => {
                toast.success("Branding updated");
              }}
              renderActions={({ isSaving }) => <SaveAction isSaving={isSaving} />}
            />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="catalog">
          <SettingsPanel>
            <CatalogTab canManage={canManageOrgSettings} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="labels">
          <SettingsPanel>
            <LabelSettingsForm org={org} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="features">
          <SettingsPanel className="max-w-2xl">
            <FeaturesForm org={org} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="appearance">
          <SettingsPanel className="max-w-2xl">
            <AppearanceForm />
          </SettingsPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
