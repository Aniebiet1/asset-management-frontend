import { create } from "zustand";
import type { Organization } from "@/types";
import { readableForeground } from "@/lib/color";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  isDark: boolean;
  /** Whether the current isDark came from an explicit user choice or is just following the
   * device's OS setting — the Settings page's Appearance tab surfaces this as a 3-way choice,
   * everywhere else only cares about the resolved `isDark` boolean. */
  themePreference: ThemePreference;
  isSidebarCollapsed: boolean;
  toggleDark: () => void;
  setDark: (isDark: boolean) => void;
  /** "system" clears the stored explicit choice and resumes following the OS setting; "light"/
   * "dark" is equivalent to `setDark` but also updates `themePreference` for display. */
  setThemePreference: (preference: ThemePreference) => void;
  toggleSidebar: () => void;
  /**
   * Applies an org's primaryColor/accentColor/sidebarColor as CSS custom properties on
   * :root (plan §H "Live theme application"), and its logoUrl as the browser tab favicon.
   * Tailwind's tokens in index.css reference --org-primary/--org-accent, so this is the
   * only place per-tenant branding needs to be wired — no component needs conditional
   * styling (or a separate favicon update) for it.
   */
  applyOrgTheme: (org: Partial<Pick<Organization, "primaryColor" | "accentColor" | "sidebarColor" | "logoUrl">>) => void;
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

/** No stored choice yet = follow the device's current light/dark setting, not a hardcoded default. */
function readStoredDark(): boolean {
  try {
    const stored = localStorage.getItem("tecres_theme");
    if (stored) return stored === "dark";
  } catch {
    // fall through to system preference
  }
  return systemPrefersDark();
}

function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem("tecres_theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // fall through to "system"
  }
  return "system";
}

function applyDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

function readStoredSidebar(): boolean {
  try {
    return localStorage.getItem("tecres_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

/** Tecres's own mark — the tab icon before any org is known (login, onboarding, platform
 * admin) and the reset target when an org has no usable logo of its own. */
const DEFAULT_FAVICON_HREF = "/favicon.png";

/** Swaps the browser tab icon for the current org's own logo, mirroring the generic-mark
 * fallback rule `Logo.tsx` uses: a real URL shows that logo, explicit `null` (or anything the
 * browser can't fetch on its own, like the relative `/files/:id` path `org.logoUrl` falls back to
 * against a local backend with no Cloudinary configured — a `<link>` fetch carries no auth header,
 * unlike the `<img>` tags that resolve it themselves) resets to the bundled Tecres mark. */
function applyFavicon(logoUrl: string | null) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (logoUrl && /^(https?:|data:)/.test(logoUrl)) {
    link.removeAttribute("type");
    link.href = logoUrl;
  } else {
    link.type = "image/png";
    link.href = DEFAULT_FAVICON_HREF;
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: readStoredDark(),
  themePreference: readThemePreference(),
  isSidebarCollapsed: readStoredSidebar(),

  setDark: (isDark) => {
    applyDarkClass(isDark);
    try {
      localStorage.setItem("tecres_theme", isDark ? "dark" : "light");
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
    set({ isDark, themePreference: isDark ? "dark" : "light" });
  },

  toggleDark: () => get().setDark(!get().isDark),

  setThemePreference: (preference) => {
    if (preference === "system") {
      try {
        localStorage.removeItem("tecres_theme");
      } catch {
        // ignore storage errors (private browsing, etc.)
      }
      const isDark = systemPrefersDark();
      applyDarkClass(isDark);
      set({ isDark, themePreference: "system" });
      return;
    }
    get().setDark(preference === "dark");
  },

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarCollapsed;
      try {
        localStorage.setItem("tecres_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return { isSidebarCollapsed: next };
    }),

  applyOrgTheme: (org) => {
    const root = document.documentElement.style;
    if (org.primaryColor) {
      root.setProperty("--org-primary", org.primaryColor);
      // Primary is user-chosen (or extracted from a logo) and can land anywhere on the
      // lightness scale — a fixed white foreground reads fine on the default blue but goes
      // invisible on a light pastel, so pick text-on-primary by actual contrast instead of
      // assuming a dark background. sidebar-primary mirrors org-primary (see index.css), so its
      // foreground needs the same treatment.
      const primaryForeground = readableForeground(org.primaryColor);
      root.setProperty("--primary-foreground", primaryForeground);
      root.setProperty("--sidebar-primary-foreground", primaryForeground);
    }
    if (org.accentColor) root.setProperty("--org-accent", org.accentColor);
    if (org.sidebarColor) root.setProperty("--sidebar", org.sidebarColor);
    if (org.logoUrl !== undefined) applyFavicon(org.logoUrl);
  },
}));

// Live-follow the device's light/dark setting for as long as the user hasn't made an explicit
// choice via the header toggle (setDark above persists that choice to tecres_theme, which is what
// makes this listener stand down for that browser from then on).
try {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const hasExplicitChoice = (() => {
      try {
        return localStorage.getItem("tecres_theme") !== null;
      } catch {
        return true;
      }
    })();
    if (hasExplicitChoice) return;
    applyDarkClass(e.matches);
    useThemeStore.setState({ isDark: e.matches });
  });
} catch {
  // matchMedia unavailable (very old browser / non-browser env) — initial readStoredDark() already
  // picked a sane default, nothing further to wire up
}
