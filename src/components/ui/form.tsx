import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

/**
 * This project's shadcn CLI version has no standalone `form` registry component (checked via
 * `npx shadcn search` per CLAUDE.md) — this is the hand-built replacement it anticipated for
 * react-hook-form + zod wiring from Phase 3 onward. Deliberately minimal: react-hook-form's
 * `register`/`Controller` already do the state wiring, this just standardizes the
 * label/control/error layout around them.
 */
export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
