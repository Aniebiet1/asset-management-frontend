import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { useThemeStore } from "@/store/theme.store";

/** Sticky top bar. Colors come from .shell-topbar tokens, which switch to the frame on phones. */
export function Topbar({ start, end }: { start: ReactNode; end: ReactNode }) {
  return (
    <header className="shell-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 bg-tb px-4 text-tb-foreground backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{start}</div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">{end}</div>
    </header>
  );
}

export const TopbarIconButton = forwardRef<HTMLButtonElement, ComponentProps<"button">>(function TopbarIconButton(
  { className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-tb-muted transition-colors hover:bg-tb-hover hover:text-tb-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
});

export function ThemeToggleButton() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  return (
    <TopbarIconButton onClick={toggleDark} aria-label="Toggle theme" title="Toggle theme">
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </TopbarIconButton>
  );
}
