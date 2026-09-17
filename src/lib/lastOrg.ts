const LAST_ORG_BRANDING_KEY = "tecres_last_org_branding";

export interface CachedOrgBranding {
  slug: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string | null;
}

/** Remembers the most recently signed-in-to org's full branding (written on every successful
 * session hydration in auth.store.ts) so the login/forgot-password screens can render that org's
 * own logo/colors synchronously on the very first paint — not just pre-fill the slug and wait on
 * a network round trip, which still flashed the generic Tecres mark for a beat. Not touched by
 * logout/clearSession, since the whole point is that it survives logging out. */
export function persistLastOrgBranding(branding: CachedOrgBranding): void {
  try {
    localStorage.setItem(LAST_ORG_BRANDING_KEY, JSON.stringify(branding));
  } catch {
    // ignore storage errors (private browsing, etc.) — worst case, no pre-fill
  }
}

export function readLastOrgBranding(): CachedOrgBranding | null {
  try {
    const raw = localStorage.getItem(LAST_ORG_BRANDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedOrgBranding;
  } catch {
    return null;
  }
}
