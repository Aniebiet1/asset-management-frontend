import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/** Shared centered-card shell for every standalone auth screen (login, TOTP, password reset —
 * tenant and platform alike). */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
        {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
