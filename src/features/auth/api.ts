import { API_BASE_URL } from "@/lib/env";

export interface PublicOrgBranding {
  slug: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string | null;
}

/**
 * Public, unauthenticated lookup the login/forgot-password forms debounce as the user types their
 * email — no apiFetch/bearer-token machinery needed since there's no session yet. Email is
 * globally unique per user (one email, one org, forever), so this resolves at most one workspace.
 * A 404/400 (unknown or incomplete email) is an expected outcome mid-typing, not an error to
 * surface.
 */
export async function getPublicOrgBrandingByEmail(email: string): Promise<PublicOrgBranding | null> {
  const res = await fetch(`${API_BASE_URL}/organizations/public/lookup?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  const { data } = (await res.json()) as { data: PublicOrgBranding };
  return data;
}
