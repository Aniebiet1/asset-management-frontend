import { NavLink } from "react-router-dom";
import { LayoutDashboard, Box, ArrowLeftRight, ClipboardCheck, MoreHorizontal } from "lucide-react";
import { cn } from "cn";

const items = [
  { name: "Home", href: "/", icon: LayoutDashboard, end: true },
  { name: "Assets", href: "/assets", icon: Box },
  { name: "Check-Out", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
] as const;

export function MobileNav({ onOpenMore }: { onOpenMore: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-background lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.href}
            end={"end" in item ? item.end : false}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="size-5" />
            {item.name}
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
      >
        <MoreHorizontal className="size-5" />
        More
      </button>
    </nav>
  );
}
