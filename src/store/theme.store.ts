import { create } from "zustand";
import type { Organization } from "@/types";

interface ThemeState {
  isDark: boolean;
  isSidebarCollapsed: boolean;
  toggleDark: () => void;
  setDark: (isDark: boolean) => void;
  toggleSidebar: () => void;
  /**
   * Applies an org's primaryColor/accentColor/sidebarColor as CSS custom properties on
   * :root (plan §H "Live theme application"). Tailwind's tokens in index.css reference
   * --org-primary/--org-accent, so this is the only place per-tenant branding needs to
   * be wired — no component needs conditional styling for it.
   */
  applyOrgTheme: (org: Partial<Pick<Organization, "primaryColor" | "accentColor" | "sidebarColor">>) => void;
}

function readStoredDark(): boolean {
  try {
    const stored = localStorage.getItem("tecres_theme");
    return stored ? stored === "dark" : true;
  } catch {
    return true;
  }
}

function readStoredSidebar(): boolean {
  try {
    return localStorage.getItem("tecres_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: readStoredDark(),
  isSidebarCollapsed: readStoredSidebar(),

  setDark: (isDark) => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("tecres_theme", isDark ? "dark" : "light");
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
    set({ isDark });
  },

  toggleDark: () => get().setDark(!get().isDark),

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
    if (org.primaryColor) root.setProperty("--org-primary", org.primaryColor);
    if (org.accentColor) root.setProperty("--org-accent", org.accentColor);
    if (org.sidebarColor) root.setProperty("--sidebar", org.sidebarColor);
  },
}));
