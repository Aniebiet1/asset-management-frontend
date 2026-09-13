import { Boxes } from "lucide-react";
import { cn } from "cn";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Org name shown next to the mark once branding resolves — falls back to the platform name (plan §0). */
  orgName?: string;
}

const iconSizes = { sm: 22, md: 26, lg: 32 };
const textClasses = { sm: "text-xs", md: "text-sm", lg: "text-base" };

export function Logo({ variant = "full", size = "md", className, orgName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        style={{ width: iconSizes[size], height: iconSizes[size] }}
      >
        <Boxes className="size-[60%]" strokeWidth={2.25} />
      </div>
      {variant === "full" && (
        <div className={cn("flex items-baseline gap-1 font-semibold tracking-tight text-foreground", textClasses[size])}>
          {orgName ? (
            <span className="truncate max-w-[9rem]">{orgName}</span>
          ) : (
            <>
              <span className="font-bold">Tecres</span>
              <span className="font-normal text-muted-foreground">Asset Manager</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
