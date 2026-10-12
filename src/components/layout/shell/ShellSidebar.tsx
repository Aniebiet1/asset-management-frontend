import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "cn";
import { useThemeStore } from "@/store/theme.store";
import { getInitials } from "@/lib/format";
import type { NavItem, NavSection } from "./types";

interface ShellSidebarProps {
  /** Brand/workspace block at the top; receives the collapsed state so it can shrink to a mark. */
  brand: (isCollapsed: boolean) => ReactNode;
  sections: NavSection[];
  /** Pinned under the scrolling nav, above the CTA (e.g. Settings). */
  bottomItems?: NavItem[];
  cta?: ReactNode;
  user: { name: string; subtitle: string };
  /** Trailing control on the user row (the platform shell puts sign-out here). */
  userAction?: ReactNode;
}

export function ShellSidebar({ brand, sections, bottomItems = [], cta, user, userAction }: ShellSidebarProps) {
  const isCollapsed = useThemeStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

  return (
    <div
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 select-none transition-[width] duration-200 ease-in-out lg:block",
        isCollapsed ? "w-[76px]" : "w-64"
      )}
    >
      <aside className="shell-nav flex h-full flex-col bg-nav text-nav-foreground">
        <div className={cn("flex items-center gap-2 px-3 pt-4 pb-3", isCollapsed ? "flex-col" : "justify-between")}>
          <div className={cn("min-w-0", !isCollapsed && "flex-1")}>{brand(isCollapsed)}</div>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 rounded-lg p-1.5 text-nav-muted transition-colors hover:bg-nav-hover hover:text-nav-foreground"
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3 no-scrollbar">
          {sections.map((section, i) => (
            <div key={section.label ?? i} className={i > 0 ? "mt-1" : undefined}>
              {section.label &&
                (isCollapsed ? (
                  <div className="mx-auto my-3 h-px w-6 bg-nav-divider" />
                ) : (
                  <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-nav-muted uppercase opacity-75">
                    {section.label}
                  </p>
                ))}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.href} item={item} isCollapsed={isCollapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 px-3 pb-3">
          {bottomItems.map((item) => (
            <SidebarLink key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
          {cta}
          <div
            className={cn(
              "flex items-center rounded-xl border-t border-nav-divider pt-3",
              isCollapsed ? "flex-col gap-2" : "gap-2.5 px-1"
            )}
            title={isCollapsed ? `${user.name} (${user.subtitle})` : undefined}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
              {getInitials(user.name)}
            </div>
            {!isCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold text-nav-foreground">{user.name}</span>
                <span className="truncate text-[11px] text-nav-muted">{user.subtitle}</span>
              </div>
            )}
            {userAction}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SidebarLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end={item.end}
      title={isCollapsed ? item.name : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-xl text-[13px] font-medium transition-colors",
          isCollapsed ? "h-11 w-full justify-center" : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-nav-active font-semibold text-nav-active-foreground shadow-sm"
            : "text-nav-muted hover:bg-nav-hover hover:text-nav-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("shrink-0", isCollapsed ? "size-5" : "size-[18px]", isActive && "text-nav-active-icon")} />
          {!isCollapsed && <span className="truncate">{item.name}</span>}
        </>
      )}
    </NavLink>
  );
}
