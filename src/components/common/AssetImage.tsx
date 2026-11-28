import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import { cn } from "cn";
import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/store/auth.store";

/**
 * Asset photos are full Cloudinary URLs when the backend has Cloudinary configured, but a
 * relative `/files/:id` path otherwise (local dev). That endpoint needs a bearer token a plain
 * `<img src>` can't send, so those are fetched with the token and shown from an object URL.
 * Stored files never change, so each one is fetched once per page load and shared by every
 * place that shows it (a list of 25 rows doesn't re-download the same photo).
 */
const resolved = new Map<string, Promise<string | null>>();

function resolveProtected(path: string, token: string | null): Promise<string | null> {
  let pending = resolved.get(path);
  if (!pending) {
    pending = fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    })
      .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : null))
      .catch(() => null)
      .then((url) => {
        if (!url) resolved.delete(path); // let a later render retry instead of caching a failure
        return url;
      });
    resolved.set(path, pending);
  }
  return pending;
}

const needsAuth = (url: string) => url.startsWith("/");

/** A displayable src for an asset photo URL, or null while it loads / if it can't be loaded. */
export function useAssetImageSrc(url: string | null | undefined): string | null {
  const token = useAuthStore((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(url && !needsAuth(url) ? url : null);

  useEffect(() => {
    if (!url) return setSrc(null);
    if (!needsAuth(url)) return setSrc(url);
    let cancelled = false;
    setSrc(null);
    resolveProtected(url, token).then((u) => !cancelled && setSrc(u));
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  return src;
}

interface AssetImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Size of the placeholder icon shown when there's no photo or it can't be loaded. */
  iconClassName?: string;
  loading?: "lazy" | "eager";
}

/**
 * An asset photo that fills its container (object-cover), with a quiet box icon in its place when
 * there is no photo, while a protected one loads, or when it fails to load - never the browser's
 * broken-image icon and alt text.
 */
export function AssetImage({ src, alt, className, iconClassName = "size-4", loading = "lazy" }: AssetImageProps) {
  const resolvedSrc = useAssetImageSrc(src);
  const [failed, setFailed] = useState<string | null>(null);

  if (!resolvedSrc || failed === resolvedSrc) {
    return (
      <span className={cn("flex size-full items-center justify-center bg-muted", className)}>
        <Box className={cn("text-muted-foreground", iconClassName)} aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      draggable={false}
      onError={() => setFailed(resolvedSrc)}
      className={cn("size-full object-cover", className)}
    />
  );
}
