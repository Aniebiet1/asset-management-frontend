import { Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { useThemeStore } from "@/store/theme.store";

/** Light/dark switch for the pre-auth screens, pinned to the viewport's top-right corner. Same
 * store action as the header toggle, so the choice persists into the app after sign-in. */
export function AuthThemeToggle({ className }: { className?: string }) {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggleDark}
      aria-label={label}
      title={label}
      className={cn(
        "fixed top-4 right-4 z-50 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
