import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { OrgSwitcher } from "@/components/brand/OrgSwitcher";
import { hasPermission } from "@/lib/permissions";
import { roleLabelMap } from "@/lib/status";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { ShellSidebar } from "./shell/ShellSidebar";
import { SETTINGS_ITEM, canSeeSettings, tenantNavSections } from "./tenantNav";

export function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isCollapsed = useThemeStore((s) => s.isSidebarCollapsed);

  if (!currentUser) return null;
  const canCreate = hasPermission(currentUser.role, "canCreateAsset");

  return (
    <ShellSidebar
      brand={(collapsed) => <OrgSwitcher isCollapsed={collapsed} />}
      sections={tenantNavSections(currentUser.role)}
      bottomItems={canSeeSettings(currentUser.role) ? [SETTINGS_ITEM] : []}
      cta={
        canCreate && (
          <NavLink
            to="/assets/new"
            title={isCollapsed ? "New Asset" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-[opacity,transform] hover:opacity-95 active:scale-[0.98]",
              isCollapsed ? "h-11 w-full" : "w-full px-3 py-2.5 text-[13px]"
            )}
          >
            <Plus className={cn("shrink-0", isCollapsed ? "size-5" : "size-4")} />
            {!isCollapsed && <span>New Asset</span>}
          </NavLink>
        )
      }
      user={{ name: currentUser.name, subtitle: roleLabelMap[currentUser.role] }}
    />
  );
}
