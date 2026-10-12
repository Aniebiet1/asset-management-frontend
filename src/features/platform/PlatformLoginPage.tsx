import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Logo } from "@/components/brand/Logo";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { useThemeStore } from "@/store/theme.store";
import { ApiError } from "@/lib/http-error";
import { useTecresBrandTheme } from "./useTecresBrandTheme";
import { PlatformAuthIllustration } from "./PlatformAuthIllustration";
import { PLATFORM_AUTH_FOOTER } from "./platformHero";

const SLIDES = [
  {
    eyebrow: "Organizations",
    title: "Every organization on TecresTrackIT, in one place.",
    body: "Provision new organizations and subsidiaries and keep their setup consistent.",
  },
  {
    eyebrow: "Access",
    title: "Staff roles, managed centrally.",
    body: "Invite platform admins and decide who can act on which organizations.",
  },
  {
    eyebrow: "Oversight",
    title: "A platform-wide view of risk and activity.",
    body: "Follow sign-in alerts, quota pressure and changes across every tenant.",
  },
];

const SLIDE_INTERVAL_MS = 7000;

function HeroCaptions() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  // Re-armed on every index change, so picking a dot by hand restarts the countdown.
  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [index, reduceMotion]);

  const slide = SLIDES[index];

  return (
    <div>
      <div className="min-h-[132px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">{slide.eyebrow}</p>
            <h2 className="mt-3 max-w-[22rem] text-[1.6rem] font-semibold leading-[1.2] tracking-tight text-white">{slide.title}</h2>
            <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-white/70">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.eyebrow}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.eyebrow.toLowerCase()}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((s) => s.login);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  useTecresBrandTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.status === "totp_enrollment_required") {
        navigate("/platform/totp/enroll", { state: { enrollmentToken: result.enrollmentToken } });
      } else {
        navigate("/platform/totp/challenge", { state: { preAuthToken: result.preAuthToken } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="platform-auth relative flex min-h-svh flex-col bg-background">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[42svh] border-b border-border/70 bg-[var(--auth-band)]" />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Platform console
        </span>
        <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme" title="Toggle theme">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 sm:px-6">
        <div className="grid w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-30px_rgb(15_23_42/0.35)] md:min-h-[580px] md:grid-cols-[1.08fr_1fr] dark:shadow-none">
          <section className="relative hidden flex-col bg-[var(--auth-hero)] p-10 md:flex lg:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(0_0_0/0.14))]"
            />
            <Logo size="lg" className="relative" />
            <div className="relative flex flex-1 items-center justify-center py-6">
              <PlatformAuthIllustration className="h-auto w-full max-w-[420px]" />
            </div>
            <div className="relative">
              <HeroCaptions />
            </div>
          </section>

          <section className="flex flex-col justify-center px-6 py-10 sm:px-12 md:py-14">
            <div className="mx-auto w-full max-w-[340px]">
              <Logo size="md" className="mb-10 md:hidden" />
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Sign in</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Use your Tecres staff account to manage organizations on the platform.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-10"
                    placeholder="you@tecres.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    className="h-10"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="h-10 w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="size-4 animate-spin" />}
                  Sign in
                </Button>
              </form>

              <div className="mt-8 flex gap-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-px size-4 shrink-0" />
                <p>
                  Every sign-in is followed by a two-factor check. New admins join by invitation from an
                  existing platform admin.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-4 pb-6 text-center text-xs text-muted-foreground">{PLATFORM_AUTH_FOOTER}</footer>
    </div>
  );
}
