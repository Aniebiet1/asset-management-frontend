/**
 * Tecres's own logo, hosted on Cloudinary rather than bundled into the app — mirrors
 * `src/lib/brand.ts` in the backend repo (same asset, same URL) so there's one place either side
 * points to, not a local file here plus a separate upload the backend references for emails.
 */
export const TECRES_DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/ascquwtn/image/upload/v1789480325/tecres/brand-logo.png";

/**
 * Tecres's own brand colors — the same blue and red as the logo (extracted directly from the
 * logo asset, not guessed). Used for the Tecres platform admin surface, which is Tecres's own
 * internal tool and therefore always shows Tecres's own colors, never an org's.
 */
export const TECRES_BRAND_PRIMARY_COLOR = "#395fa6";
export const TECRES_BRAND_ACCENT_COLOR = "#ec1b24";
