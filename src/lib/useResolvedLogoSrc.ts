import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/env";

/**
 * `org.logoUrl` is a full Cloudinary URL when the backend has Cloudinary configured, but falls
 * back to a relative `/files/:id` path in local dev (no Cloudinary credentials) — and that
 * endpoint requires a bearer token, which a plain `<img src>` can never send. Fetch it ourselves
 * with the token we already have and hand the browser an object URL instead, so the preview
 * doesn't silently render as a broken image against an unconfigured local backend.
 *
 * Shared by anywhere that renders an org logo from a possibly-authenticated URL (Settings'
 * BrandingForm, the label previews) rather than duplicating this fetch-and-object-URL dance.
 */
export function useResolvedLogoSrc(logoUrl: string | null, accessToken: string | null) {
  const [src, setSrc] = useState<string | null>(logoUrl?.startsWith("http") ? logoUrl : null);

  useEffect(() => {
    if (!logoUrl) {
      setSrc(null);
      return;
    }
    if (logoUrl.startsWith("http")) {
      setSrc(logoUrl);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${logoUrl}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // leave src as-is (initials fallback) — not worth surfacing a toast for a preview image
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoUrl, accessToken]);

  return src;
}
