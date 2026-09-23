import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  ArrowLeftRight,
  Wrench,
  ClipboardCheck,
  Users,
  Building2,
  BarChart3,
  Tags,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/brand/Logo";
import { OrgSwitcher } from "@/components/brand/OrgSwitcher";
import { hasPermission } from "@/lib/permissions";
import { getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, end: true },
  { name: "All Assets", href: "/assets", icon: Box },
  { name: "Check-Out / Return", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "People", href: "/people", icon: Users, permission: "canManagePeople" },
  { name: "Vendors", href: "/vendors", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Labels", href: "/labels", icon: Tags },
] as const;

export function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const isCollapsed = useThemeStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

  if (!currentUser) return null;
  const canCreate = hasPermission(currentUser.role, "canCreateAsset");
  const canManageSettings = hasPermission(currentUser.role, "canManageSettings") || hasPermission(currentUser.role, "canManageOrg");

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-screen shrink-0 select-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex",
        isCollapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <NavLink to="/" className="flex items-center overflow-hidden">
          <Logo variant={isCollapsed ? "icon" : "full"} size="md" logoUrl={org?.logoUrl} orgName={org?.name} />
        </NavLink>
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse navigation sidebar"
            title="Collapse sidebar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {isCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand navigation sidebar"
          title="Expand sidebar"
          className="mx-auto mt-1.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      {/* Workspace */}
      <div className={cn("border-b border-sidebar-border", isCollapsed ? "flex justify-center p-1.5" : "p-2")}>
        {isCollapsed ? (
          <div
            className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-black text-sidebar-accent-foreground"
            title={`Workspace: ${currentUser.orgName}`}
          >
            {currentUser.orgName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <OrgSwitcher />
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto no-scrollbar", isCollapsed ? "p-1.5" : "p-2")}>
        {navigation
          .filter((item) => !("permission" in item) || hasPermission(currentUser.role, item.permission))
          .map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={"end" in item ? item.end : false}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg text-[13px] font-medium transition-colors",
                  isCollapsed ? "h-10 w-full justify-center px-0" : "gap-2.5 px-2.5 py-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn("shrink-0", isCollapsed ? "size-5" : "size-4", isActive ? "text-primary" : "text-muted-foreground")}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}

        {canManageSettings && (
          <NavLink
            to="/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg text-[13px] font-medium transition-colors",
                isCollapsed ? "h-10 w-full justify-center px-0" : "gap-2.5 px-2.5 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings className={cn("shrink-0", isCollapsed ? "size-5" : "size-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {!isCollapsed && <span className="truncate">Settings</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* New asset CTA */}
      {canCreate && (
        <div className={cn(isCollapsed ? "p-1.5 pt-0" : "p-2 pt-0")}>
          <NavLink
            to="/assets/new"
            title={isCollapsed ? "New Asset" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-full bg-gradient-brand font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-opacity hover:opacity-90",
              isCollapsed ? "h-10 w-full px-0" : "w-full px-3 py-2 text-xs"
            )}
          >
            <Plus className={cn("shrink-0", isCollapsed ? "size-5" : "size-3.5")} />
            {!isCollapsed && <span>New Asset</span>}
          </NavLink>
        </div>
      )}

      {/* User footer */}
      <div className={cn("border-t border-sidebar-border", isCollapsed ? "p-1.5" : "p-2")}>
        <div
          className={cn("flex items-center rounded-lg text-xs", isCollapsed ? "justify-center py-2" : "gap-2 px-2 py-1.5")}
          title={isCollapsed ? `${currentUser.name} (${roleLabelMap[currentUser.role]})` : undefined}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
            {getInitials(currentUser.name)}
          </div>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold text-sidebar-foreground">{currentUser.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">{roleLabelMap[currentUser.role]}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
