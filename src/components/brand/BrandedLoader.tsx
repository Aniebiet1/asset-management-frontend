import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "cn";
import { Logo } from "./Logo";
import { TECRES_DEFAULT_LOGO_URL } from "@/lib/brand";

interface BrandedLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Same contract as `Logo` — the current org's logo/name when known, so a loading state reads
   * as "this workspace is loading" rather than a generic spinner. Falls back to the Tecres mark
   * when neither is given (platform admin pages, or before any org is identified). */
  logoUrl?: string | null;
  orgName?: string;
  /** Screen-reader label — loading states convey nothing visually to assistive tech otherwise. */
  label?: string;
}

const iconSizes = { sm: 22, md: 26, lg: 32, xl: 48 };

/**
 * A branded stand-in for a generic spinner icon, used for the loading moments substantial enough
 * to warrant it (full-page/section loads, app boot) — small inline button spinners stay plain
 * icons, since a whole logo pulsing inside a compact button would look cramped, not polished.
 *
 * Preloads whichever logo image is actually in play (the org's own, or Tecres's default) and
 * shows a plain pulsing placeholder until it's ready — confirmed in testing that the logo image
 * itself can take a couple of seconds over the network, and a *loading indicator* that's blank
 * while its own image loads is worse than the generic spinner it's replacing. An org-name-only
 * initials badge has no image to wait on, so it animates immediately.
 */
export function BrandedLoader({ size = "md", className, logoUrl, orgName, label = "Loading" }: BrandedLoaderProps) {
  const effectiveImageUrl = logoUrl || (orgName ? null : TECRES_DEFAULT_LOGO_URL);
  const [imageReady, setImageReady] = useState(!effectiveImageUrl);

  useEffect(() => {
    if (!effectiveImageUrl) {
      setImageReady(true);
      return;
    }
    setImageReady(false);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setImageReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setImageReady(true); // don't get stuck forever on a broken URL either
    };
    img.src = effectiveImageUrl;
    return () => {
      cancelled = true;
    };
  }, [effectiveImageUrl]);

  const dimension = iconSizes[size];

  return (
    <div className={cn("flex items-center justify-center", className)} role="status" aria-label={label}>
      {imageReady ? (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo variant="icon" size={size} logoUrl={logoUrl} orgName={orgName} />
        </motion.div>
      ) : (
        <motion.div
          className="rounded-md bg-muted"
          style={{ width: dimension, height: dimension }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
