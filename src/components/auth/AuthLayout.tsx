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

/** Shared shell for every standalone auth screen (login, TOTP, password reset — tenant and
 * platform alike): a branded hero panel next to the form on wide screens, just the centered form
 * on narrow ones. The hero is Tecres's own product branding (it advertises TecresTrackIT itself,
 * not the signing-in org), while the form-side logo keeps following `logoUrl` as before. */
export function AuthLayout({ children, footer, logoUrl }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between bg-brand-hero p-10 text-white lg:flex xl:p-14">
        <Logo variant="full" size="md" className="brightness-0 invert" />
        <div className="space-y-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--org-accent)" }} />
            ASSET MANAGEMENT, SIMPLIFIED
          </span>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            Track every asset<span className="text-gradient-brand">, effortlessly</span>.
          </h2>
          <p className="max-w-sm text-sm text-white/60">
            Check-outs, maintenance, audits and reporting in one workspace built for teams that
            need to always know what they own.
          </p>
        </div>
        <p className="text-xs text-white/40">TecresTrackIT AMS</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" logoUrl={logoUrl} />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
          {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
