import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "@/store/theme.store";
import { readLastOrgBranding } from "@/lib/lastOrg";
import { getPublicOrgBrandingByEmail, type PublicOrgBranding } from "./api";

const DEFAULT_PRIMARY_COLOR = "#2563eb";
const DEFAULT_ACCENT_COLOR = "#7c3aed";

function brandingFromCache(): PublicOrgBranding | null {
  const cached = readLastOrgBranding();
  if (!cached) return null;
  return { slug: cached.slug, name: cached.name, logoUrl: cached.logoUrl, primaryColor: cached.primaryColor, accentColor: cached.accentColor };
}

/**
 * Debounced email→org-branding lookup shared by every pre-auth screen with an email field (login,
 * forgot-password) — shows that org's own logo/colors/name instead of the generic Tecres mark once
 * a typed email resolves to a real workspace. Email is globally unique per user (one email, one
 * org, forever — see the backend's `users.email` unique constraint), so it's the sole identifying
 * field on these forms; there's no separate org-slug field or lookup anymore.
 *
 * Pre-fills from the last org actually signed in to (persisted in `auth.store.ts` on every
 * successful session hydration, untouched by logout), applied synchronously on the very first
 * render — a returning user sees their own org's branding instantly, no network round trip. An
 * unresolved/unknown email shows *no* logo at all (see `Logo.tsx`'s explicit `null`-suppression
 * tier) rather than falling back to the generic Tecres mark.
 *
 * Also guards against autofill: confirmed in testing that some autofill paths (seen specifically
 * on mobile/WebView browsers) set an input's DOM value without ever dispatching an event React's
 * synthetic system picks up, leaving state — and therefore both the branding preview and the value
 * actually submitted — stuck on the empty string even though the field visibly shows a value.
 * Three independent layers close this, since no single one is reliable across every browser:
 *   1. Native 'input'/'change'/'blur' listeners attached directly to the DOM node (bypasses
 *      React's synthetic event system, unlike onChange).
 *   2. A short poll right after mount, since some autofill implementations set the value with no
 *      event at all.
 *   3. `getSubmitEmail()` reads the live DOM value at submit time regardless of state, so even if
 *      all of the above somehow missed it, the request itself can't go out with a stale value.
 */
export function useOrgBranding() {
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);
  const [email, setEmail] = useState("");
  const [branding, setBranding] = useState<PublicOrgBranding | null>(() => {
    const cached = brandingFromCache();
    if (cached) applyOrgTheme({ primaryColor: cached.primaryColor, accentColor: cached.accentColor, logoUrl: cached.logoUrl });
    return cached;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmedEmail = email.trim();
    // Empty means untouched (including the very first render) — leave whatever the cache seeded
    // alone rather than wiping a returning user's branding back to nothing before they've typed
    // anything. Only an actively-being-typed, not-yet-valid email clears it.
    if (!trimmedEmail) return;
    if (!trimmedEmail.includes("@")) {
      setBranding(null);
      applyOrgTheme({ primaryColor: DEFAULT_PRIMARY_COLOR, accentColor: DEFAULT_ACCENT_COLOR, logoUrl: null });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getPublicOrgBrandingByEmail(trimmedEmail);
      if (cancelled) return;
      setBranding(result);
      applyOrgTheme({
        primaryColor: result?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
        accentColor: result?.accentColor ?? DEFAULT_ACCENT_COLOR,
        logoUrl: result?.logoUrl ?? null,
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, applyOrgTheme]);

  useEffect(() => {
    const input = emailInputRef.current;
    if (!input) return;

    const syncFromDom = () => {
      setEmail((current) => (input.value !== current ? input.value : current));
    };

    input.addEventListener("input", syncFromDom);
    input.addEventListener("change", syncFromDom);
    input.addEventListener("blur", syncFromDom);

    // Covers autofill that sets .value with no event at all — checked a handful of times right
    // after mount, which is when autofill actually happens, then stops.
    let checks = 0;
    const poll = setInterval(() => {
      syncFromDom();
      checks += 1;
      if (checks >= 6) clearInterval(poll);
    }, 250);

    return () => {
      input.removeEventListener("input", syncFromDom);
      input.removeEventListener("change", syncFromDom);
      input.removeEventListener("blur", syncFromDom);
      clearInterval(poll);
    };
  }, []);

  /** The authoritative email to actually submit — reads the live DOM value rather than trusting
   * React state, as a last-resort guard even if every listener above somehow missed a change. */
  const getSubmitEmail = () => (emailInputRef.current?.value ?? email).trim();

  return { email, setEmail, branding, emailInputRef, getSubmitEmail };
}
