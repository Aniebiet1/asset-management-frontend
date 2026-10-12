import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import type { NavItem } from "./types";

interface BottomDockProps {
  items: NavItem[];
  /** Optional trailing button (the tenant shell's "More", which opens the full drawer). */
  more?: { label: string; icon: LucideIcon; onClick: () => void };
}

/** Phone-only floating bottom navigation, a slab of the brand frame (same .shell-nav tokens as the
 * sidebar). */
export function BottomDock({ items, more }: BottomDockProps) {
  const itemClass = "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10.5px] font-medium transition-colors";

  return (
    <nav
      className={cn(
        "shell-nav fixed inset-x-3 z-30 flex h-16 items-center gap-1 rounded-2xl bg-nav/95 p-1.5 text-nav-foreground shadow-(--card-shadow) ring-1 ring-foreground/5 backdrop-blur-xl lg:hidden",
        "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(itemClass, isActive ? "bg-nav-active text-nav-active-foreground" : "text-nav-muted hover:text-nav-foreground")
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("size-5", isActive && "text-nav-active-icon")} />
                <span className="max-w-full truncate px-1">{item.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
      {more && (
        <button type="button" onClick={more.onClick} className={cn(itemClass, "text-nav-muted hover:text-nav-foreground")}>
          <more.icon className="size-5" />
          {more.label}
        </button>
      )}
    </nav>
  );
}
