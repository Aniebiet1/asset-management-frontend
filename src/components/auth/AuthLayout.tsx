import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

interface AuthLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
  /** The org identified on the login form (by email lookup) — carried forward through TOTP
   * enroll/challenge via navigation state so the whole pre-auth flow stays on-brand, not just the
   * login form itself. Forwarded straight to `Logo`: pass a real URL once resolved, explicit
   * `null` to render no logo at all (login/forgot-password before an email resolves), or leave
   * unset to fall back to the Tecres mark (platform login, TOTP pages with nothing cached). */
  logoUrl?: string | null;
}

/** Shared centered-card shell for every standalone auth screen (login, TOTP, password reset —
 * tenant and platform alike). */
export function AuthLayout({ children, footer, logoUrl }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" logoUrl={logoUrl} />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
        {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
