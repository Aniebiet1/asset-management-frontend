import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useThemeStore, type ThemePreference } from "@/store/theme.store";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Personal, device-local appearance settings, not org branding — every role gets this tab
 * regardless of `canManageSettings` (see SettingsPage.tsx). Backed by theme.store.ts, which is
 * also what index.html's pre-paint script and the header's quick toggle read from.
 */
export function AppearanceForm() {
  const themePreference = useThemeStore((s) => s.themePreference);
  const setThemePreference = useThemeStore((s) => s.setThemePreference);
  const isSidebarCollapsed = useThemeStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal to this device. Doesn't change what your teammates see.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Theme</Label>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setThemePreference(value)}
              aria-pressed={themePreference === value}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors",
                themePreference === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-input hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {themePreference === "system"
            ? "Follows your device's light/dark setting automatically."
            : `Always ${themePreference}, regardless of your device's setting.`}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Collapsed sidebar</p>
          <p className="text-[11px] text-muted-foreground">Start with the navigation sidebar collapsed to icons only.</p>
        </div>
        <Switch checked={isSidebarCollapsed} onCheckedChange={toggleSidebar} aria-label="Collapsed sidebar" />
      </div>
    </div>
  );
}
