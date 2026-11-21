import { useState } from "react";
import { cn } from "cn";
import { TECRES_DEFAULT_LOGO_URL } from "@/lib/brand";
import { getInitials } from "@/lib/format";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** The current org's own uploaded logo (`org.logoUrl`). Three distinct states:
   *   - a real URL: renders that image.
   *   - `null` (explicit): renders nothing at all — used by the login/forgot-password screens
   *     before a typed email has resolved to a real org, so no placeholder brand shows at all.
   *   - `undefined` (unset): falls back to the Tecres mark — used everywhere branding is either
   *     genuinely Tecres's own (platform admin) or just hasn't been threaded through yet. */
  logoUrl?: string | null;
  /** Org name — paired with `logoUrl` for alt text, or used alone (as an initials badge) when an
   * org is known but hasn't uploaded a logo yet. Falls back to the Tecres wordmark when neither
   * `logoUrl` nor `orgName` is given (platform admin shell, or a login page before any org is
   * identified). */
  orgName?: string;
  /** Sits an uploaded `logoUrl` inside a white circular badge. Uploaded logos are often flat
   * images with an opaque backdrop baked in, which on a dark surface reads as a cropped square;
   * the circle gives that backdrop a deliberate shape instead. */
  circle?: boolean;
}

const circleSizes = { sm: 32, md: 40, lg: 64, xl: 80 };

/** Width/height ratio past which a logo counts as a wordmark: a circle would shrink it to an
 * unreadable sliver, so it gets a pill that grows sideways instead. */
const WIDE_RATIO = 1.4;

/** White badge behind an uploaded logo whose shape follows the image: a circle for square-ish
 * marks, a pill (same height, width from the image) for wide wordmarks, a taller badge for tall
 * ones. The ratio is only known once the image loads, so it starts as a circle. */
function BadgeLogo({ src, alt, size, className }: { src: string; alt: string; size: keyof typeof circleSizes; className?: string }) {
  const [ratio, setRatio] = useState(1);

  const box = circleSizes[size];
  const wide = ratio >= WIDE_RATIO;
  const tall = ratio <= 1 / WIDE_RATIO;
  const pad = Math.round(box * 0.18);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-black/5 select-none",
        wide || tall ? "rounded-2xl" : "rounded-full",
        className,
      )}
      style={
        wide
          ? // Width set explicitly from the ratio: left to auto, the box sizes to the image's
            // natural width before the height cap shrinks it, leaving a wide empty margin.
            { height: box, width: Math.min(box * 4, Math.round((box - pad * 2) * ratio + pad * 3)), paddingInline: pad * 1.5, paddingBlock: pad }
          : tall
            ? { width: box, height: box * 1.4, padding: pad }
            : { width: box, height: box, padding: pad }
      }
    >
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          if (w && h) setRatio(w / h);
        }}
        className={wide ? "h-full w-auto max-w-full object-contain" : "size-full object-contain"}
      />
    </div>
  );
}

const iconSizes = { sm: 22, md: 26, lg: 32, xl: 48 };
const fullHeights = { sm: 24, md: 30, lg: 46, xl: 64 };
const textClasses = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" };

export function Logo({ variant = "full", size = "md", className, logoUrl, orgName, circle = false }: LogoProps) {
  if (logoUrl === null) return null;

  if (logoUrl) {
    if (circle) {
      // Keyed on the URL so a different logo starts over from a circle and re-measures.
      return <BadgeLogo key={logoUrl} src={logoUrl} alt={orgName ?? "Organization logo"} size={size} className={className} />;
    }
    if (variant === "icon") {
      return (
        <div className={cn("flex shrink-0 items-center justify-center", className)} style={{ width: iconSizes[size], height: iconSizes[size] }}>
          <img src={logoUrl} alt={orgName ?? "Organization logo"} className="size-full object-contain" />
        </div>
      );
    }
    return (
      <div className={cn("flex max-w-full items-center select-none", className)} style={{ height: fullHeights[size] }}>
        <img src={logoUrl} alt={orgName ?? "Organization logo"} className="h-full w-auto max-w-full object-contain" />
      </div>
    );
  }

  if (orgName) {
    const badge = (
      <div
        className="flex shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground"
        style={{ width: iconSizes[size], height: iconSizes[size] }}
      >
        <span className={textClasses[size]}>{getInitials(orgName)}</span>
      </div>
    );
    if (variant === "icon") return <div className={className}>{badge}</div>;
    return (
      <div className={cn("flex items-center gap-2 select-none", className)}>
        {badge}
        <span className={cn("truncate max-w-[9rem] font-semibold tracking-tight text-foreground", textClasses[size])}>{orgName}</span>
      </div>
    );
  }

  // The Cloudinary asset is a flat PNG with an opaque white backdrop baked in, so on a dark
  // surface it reads as a stray rectangle rather than a logo. Giving it its own rounded, shadowed
  // chip owns that edge instead of hiding it, and keeps the mark in its real brand colors.
  if (variant === "icon") {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5", className)}
        style={{ width: iconSizes[size], height: iconSizes[size] }}
      >
        <img src={TECRES_DEFAULT_LOGO_URL} alt="Tecres" className="size-full object-contain" />
      </div>
    );
  }

  return (
    <div className={cn("flex w-fit max-w-full items-center rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 select-none", className)}>
      <img src={TECRES_DEFAULT_LOGO_URL} alt="TecresTrackIT AMS" className="w-auto max-w-full object-contain" style={{ height: fullHeights[size] }} />
    </div>
  );
}
