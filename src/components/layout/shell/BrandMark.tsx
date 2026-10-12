import { cn } from "cn";
import { getInitials } from "@/lib/format";

interface BrandMarkProps {
  logoUrl?: string | null;
  name: string;
  className?: string;
}

/**
 * Square brand tile for the shell. An uploaded logo always sits on its own white tile: org logos
 * are arbitrary uploads (often dark marks on transparent or white backgrounds) and the framed
 * style puts them on a deep frame where they would vanish or show a stray white box. With no logo,
 * initials on the brand color, which applyOrgTheme already pairs with a readable foreground.
 */
export function BrandMark({ logoUrl, name, className }: BrandMarkProps) {
  if (logoUrl) {
    return (
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5", className)}>
        <img src={logoUrl} alt={name} className="size-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-xs font-bold text-primary-foreground shadow-sm",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
