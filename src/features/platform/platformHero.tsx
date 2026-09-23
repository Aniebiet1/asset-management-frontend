import { Check } from "lucide-react";

const CONSOLE_CAPABILITIES = ["Organizations and subsidiaries", "Staff roles and permissions", "Platform-wide audit trail"];

/**
 * Shared hero content for every pre-auth screen under `/platform/*` (login, TOTP enroll/
 * challenge, invite accept). Passed to `AuthLayout`'s `hero` override so this internal ops
 * console gets restrained, factual copy instead of the tenant login's customer-facing pitch.
 */
export const platformHero = (
  <div className="space-y-5">
    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Platform console</span>
    <h2 className="max-w-sm text-3xl font-semibold leading-tight text-white">
      One console for every organization on TecresTrackIT.
    </h2>
    <p className="max-w-sm text-sm text-white/60">
      Provision organizations, manage staff access and keep an eye on activity across the whole
      platform.
    </p>
    <ul className="space-y-2.5 pt-1">
      {CONSOLE_CAPABILITIES.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
          <Check className="size-4 shrink-0 text-white/40" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const PLATFORM_AUTH_FOOTER = "Tecres internal, not for customer use.";
