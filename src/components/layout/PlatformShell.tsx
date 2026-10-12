import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, AlertTriangle, ShieldCheck, LogOut, Bell, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { getInitials } from "@/lib/format";
import { TECRES_DEFAULT_LOGO_URL } from "@/lib/brand";
import { useTecresBrandTheme } from "@/features/platform/useTecresBrandTheme";
import { useAlertsQuery } from "@/features/platform/api";
import type { PlatformAdminRole } from "@/types";
import { ShellFrame } from "./shell/ShellFrame";
import { ShellSidebar } from "./shell/ShellSidebar";
import { BottomDock } from "./shell/BottomDock";
import { BrandMark } from "./shell/BrandMark";
import { ThemeToggleButton, Topbar, TopbarIconButton } from "./shell/Topbar";
import type { NavItem, NavSection } from "./shell/types";

const DASHBOARD: NavItem = { name: "Dashboard", href: "/platform", icon: LayoutDashboard, end: true };
const ORGS: NavItem = { name: "Organizations", href: "/platform/orgs", icon: Building2 };
const ALERTS: NavItem = { name: "Alerts", href: "/platform/alerts", icon: AlertTriangle };
// Managing the Tecres admin roster is owner-only on the backend too (`canManagePlatformAdmins`);
// hiding the item is a convenience, not the boundary.
const ADMINS: NavItem = { name: "Admins", href: "/platform/admins", icon: ShieldCheck };

const ROLE_LABELS: Record<PlatformAdminRole, string> = {
  platform_owner: "Platform owner",
  platform_support: "Platform support",
};

/**
 * Tecres's internal ops tool for managing customer workspaces. Shares the tenant app's visual
 * shell (ShellFrame/ShellSidebar) but nothing stateful: its own auth store, API client and nav,
 * and no command palette or asset-management chrome. See BUILD_PLAN.md §1.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const admin = usePlatformAuthStore((s) => s.admin);
  const clearSession = usePlatformAuthStore((s) => s.clearSession);
  const { data: alerts } = useAlertsQuery();
  useTecresBrandTheme();

  if (!admin) return null;

  const isOwner = admin.role === "platform_owner";
  const openAlertCount = alerts?.filter((a) => a.status === "open").length ?? 0;
  const sections: NavSection[] = [
    { items: [DASHBOARD] },
    { label: "Customers", items: [ORGS, ALERTS] },
    ...(isOwner ? [{ label: "Team", items: [ADMINS] }] : []),
  ];

  const handleLogout = () => {
    clearSession();
    navigate("/platform/login", { replace: true });
  };

  return (
    <ShellFrame
      sidebar={
        <ShellSidebar
          brand={(collapsed) => (
            <Link to="/platform" className="flex min-w-0 items-center gap-2.5 p-1" title={collapsed ? "TecresTrackIT Platform" : undefined}>
              <BrandMark logoUrl={TECRES_DEFAULT_LOGO_URL} name="Tecres" />
              {!collapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold tracking-tight text-nav-foreground">TecresTrackIT</span>
                  <span className="truncate text-[11px] text-nav-muted">Platform admin</span>
                </span>
              )}
            </Link>
          )}
          sections={sections}
          user={{ name: admin.name, subtitle: ROLE_LABELS[admin.role] }}
          userAction={
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-nav-muted transition-colors hover:bg-nav-hover hover:text-nav-foreground"
            >
              <LogOut className="size-4" />
            </button>
          }
        />
      }
      header={
        <Topbar
          start={
            <>
              <BrandMark logoUrl={TECRES_DEFAULT_LOGO_URL} name="Tecres" className="size-8 rounded-lg lg:hidden" />
              <div className="min-w-0 lg:hidden">
                <p className="truncate text-sm font-semibold text-tb-foreground">TecresTrackIT</p>
                <p className="truncate text-[11px] text-tb-muted">Platform admin</p>
              </div>
            </>
          }
          end={
            <>
              <ThemeToggleButton />
              <TopbarIconButton onClick={() => navigate("/platform/alerts")} aria-label="Open alerts" title="Open alerts">
                <Bell className="size-[18px]" />
                {openAlertCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-tb">
                    {openAlertCount}
                  </span>
                )}
              </TopbarIconButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-tb-hover sm:pr-2.5"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
                      {getInitials(admin.name)}
                    </span>
                    <span className="hidden min-w-0 flex-col text-left leading-tight md:flex">
                      <span className="max-w-[10rem] truncate text-[13px] font-semibold text-tb-foreground">{admin.name}</span>
                      <span className="text-[11px] text-tb-muted">{ROLE_LABELS[admin.role]}</span>
                    </span>
                    <ChevronDown className="hidden size-3.5 text-tb-muted sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs">
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="truncate font-semibold text-foreground">{admin.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{admin.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 size-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      }
      dock={<BottomDock items={[{ ...DASHBOARD, name: "Overview" }, { ...ORGS, name: "Orgs" }, ALERTS, ...(isOwner ? [ADMINS] : [])]} />}
    >
      {children}
    </ShellFrame>
  );
}
