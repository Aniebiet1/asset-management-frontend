import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const HERO_POINTS = [
  "Check-outs and returns without the chase",
  "A full history behind every item",
  "Maintenance, audits and reporting in one place",
];

interface AuthLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
  /** The org identified on the login form (by email lookup) — carried forward through TOTP
   * enroll/challenge via navigation state so the whole pre-auth flow stays on-brand, not just the
   * login form itself. Forwarded straight to `Logo`: pass a real URL once resolved, explicit
   * `null` to render no logo at all (login/forgot-password before an email resolves), or leave
   * unset to fall back to the Tecres mark (platform login, TOTP pages with nothing cached). */
  logoUrl?: string | null;
  /** Overrides the hero panel's marketing block entirely. The default below is the tenant
   * product pitch (customer-facing logins); the platform admin flow is Tecres's own internal
   * tool, not customer-facing, so it passes its own console-oriented content instead of reusing
   * SaaS ad copy on a staff-only screen. */
  hero?: ReactNode;
}

/** Shared shell for every standalone auth screen (login, TOTP, password reset — tenant and
 * platform alike): a branded hero panel next to the form on wide screens, just the centered form
 * on narrow ones. The hero is Tecres's own product branding (it advertises TecresTrackIT itself,
 * not the signing-in org), while the form-side logo keeps following `logoUrl` as before. */
export function AuthLayout({ children, footer, logoUrl, hero }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-center bg-brand-hero p-10 text-white lg:flex xl:p-14">
        {hero ?? (
          <div className="max-w-sm space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight">
                Track every asset<span className="text-gradient-brand">, effortlessly</span>.
              </h2>
              <p className="text-sm leading-relaxed text-white/55">
                One workspace for teams that need to always know what they own.
              </p>
            </div>
            <ul className="space-y-3.5 border-t border-white/10 pt-7">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/75">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "color-mix(in oklab, var(--org-accent) 22%, transparent)" }}
                  >
                    <Check className="size-3" style={{ color: "var(--org-accent)" }} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="absolute inset-x-10 bottom-10 text-xs text-white/40 xl:inset-x-14 xl:bottom-14">TecresTrackIT AMS</p>
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
