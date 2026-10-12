import { useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";
import { TECRES_BRAND_PRIMARY_COLOR, TECRES_BRAND_ACCENT_COLOR, TECRES_DEFAULT_LOGO_URL } from "@/lib/brand";

/**
 * The Tecres platform admin surface is Tecres's own internal ops tool, not a customer org's — it
 * always shows Tecres's own blue/red brand colors and logo (also as the tab favicon), routed
 * through the same `applyOrgTheme` mechanism org branding uses (see theme.store.ts) rather than a
 * separate styling path. Called once per platform page (both the pre-auth login/TOTP screens and
 * the authenticated shell), so a fresh page load always lands on Tecres's branding regardless of
 * whatever a tenant login screen last applied to this same browser tab.
 */
export function useTecresBrandTheme() {
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);
  useEffect(() => {
    applyOrgTheme({
      primaryColor: TECRES_BRAND_PRIMARY_COLOR,
      accentColor: TECRES_BRAND_ACCENT_COLOR,
      // Clears any sidebar override a tenant session left on this tab, so the frame is Tecres's.
      sidebarColor: null,
      logoUrl: TECRES_DEFAULT_LOGO_URL,
    });
  }, [applyOrgTheme]);
}
