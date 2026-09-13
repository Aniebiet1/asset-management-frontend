import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { getInitials } from "@/lib/format";

const TABS = [
  { name: "Dashboard", href: "/platform", icon: LayoutDashboard, end: true },
  { name: "Organizations", href: "/platform/orgs", icon: Building2 },
  { name: "Alerts", href: "/platform/alerts", icon: AlertTriangle },
] as const;

/**
 * Deliberately minimal — no sidebar, no command palette, no asset-management chrome. This is
 * Tecres's internal ops tool for managing customer workspaces, not the product itself. See
 * BUILD_PLAN.md §1.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const admin = usePlatformAuthStore((s) => s.admin);
  const clearSession = usePlatformAuthStore((s) => s.clearSession);

  if (!admin) return null;

  const handleLogout = () => {
    clearSession();
    navigate("/platform/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <ShieldCheck className="size-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Tecres Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                {getInitials(admin.name)}
              </div>
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{admin.name}</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.name}
              to={tab.href}
              end={"end" in tab ? tab.end : false}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
            >
              <tab.icon className="size-3.5" />
              {tab.name}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
