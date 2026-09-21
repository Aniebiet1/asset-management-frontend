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
}

const iconSizes = { sm: 22, md: 26, lg: 32, xl: 48 };
const fullHeights = { sm: 24, md: 30, lg: 46, xl: 64 };
const textClasses = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" };

export function Logo({ variant = "full", size = "md", className, logoUrl, orgName }: LogoProps) {
  if (logoUrl === null) return null;

  if (logoUrl) {
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

  if (variant === "icon") {
    return (
      <div className={cn("flex shrink-0 items-center justify-center", className)} style={{ width: iconSizes[size], height: iconSizes[size] }}>
        <img src={TECRES_DEFAULT_LOGO_URL} alt="Tecres" className="size-full object-contain" />
      </div>
    );
  }

  return (
    <div className={cn("flex max-w-full items-center select-none", className)} style={{ height: fullHeights[size] }}>
      <img src={TECRES_DEFAULT_LOGO_URL} alt="TecresTrackIT AMS" className="h-full w-auto max-w-full object-contain" />
    </div>
  );
}
