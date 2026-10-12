import { NavLink } from "react-router-dom";
import { cn } from "cn";
import type { NavSection } from "./types";

/** Grouped nav list for the phone drawer, styled from the same .shell-nav tokens as the sidebar. */
export function NavSheetBody({ sections, onNavigate }: { sections: NavSection[]; onNavigate: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {sections.map((section, i) => (
        <div key={section.label ?? i}>
          {section.label && (
            <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-nav-muted uppercase opacity-75">{section.label}</p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      isActive ? "bg-nav-active font-semibold text-nav-active-foreground" : "text-nav-muted hover:bg-nav-hover hover:text-nav-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("size-[18px] shrink-0", isActive && "text-nav-active-icon")} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
