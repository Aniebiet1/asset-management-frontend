import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { Logo } from "@/components/brand/Logo";
import { AssetIllustration } from "./AssetIllustration";

interface BrandedAuthCardProps {
  children: ReactNode;
  footer?: ReactNode;
  /** Same three-state contract as `AuthLayout`/`Logo`: a URL shows it, `null` shows nothing
   * (email not resolved yet), unset falls back to the Tecres mark. Only ever rendered on the form
   * side; the brand panel stays logo-free on purpose. */
  logoUrl?: string | null;
  /** Resolved org name, woven into the panel's welcome copy once the email lookup finds one. */
  orgName?: string;
}

interface Slide {
  title: string;
  body: string;
}

function slidesFor(orgName?: string): Slide[] {
  return [
    {
      title: "Welcome back!",
      body: orgName
        ? `Everything ${orgName} owns, tracked in one place. Sign in to pick up where you left off.`
        : "Everything your team owns, tracked in one place. Sign in to pick up where you left off.",
    },
    {
      title: "Know where every asset is",
      body: "Tag, locate and track equipment across every branch, with a full history for each item.",
    },
    {
      title: "Check-outs without the chase",
      body: "Scan a QR label to hand out or return an item, with overdue reminders built in.",
    },
  ];
}

const SLIDE_INTERVAL_MS = 6000;

/**
 * Tenant login shell: a floating two-panel card. The left panel is painted entirely from the
 * org's `--org-primary`/`--org-accent` (via `.bg-auth-panel` in `index.css`), so it re-tints the
 * moment `useOrgBranding` resolves an email, and carries an asset-management illustration plus a
 * short rotating welcome carousel. The right panel holds the org logo and the form. Below `md`
 * the brand panel is dropped and only the form card shows.
 */
export function BrandedAuthCard({ children, footer, logoUrl, orgName }: BrandedAuthCardProps) {
  const slides = slidesFor(orgName);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  // Re-armed on every index change, so a manual dot click gets a full interval before the next
  // auto-advance instead of jumping again almost immediately.
  useEffect(() => {
    if (isPaused || reduceMotion) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, isPaused, reduceMotion, slides.length]);

  const slide = slides[index];

  return (
    <div className="bg-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 md:min-h-[560px] md:grid-cols-[1.08fr_1fr] dark:shadow-black/50">
        <aside
          className="bg-auth-panel relative hidden flex-col justify-between gap-6 p-10 md:flex"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          // Keyboard focus only: a mouse click on a dot also focuses it, and pausing on that would
          // freeze the carousel until the user happened to click somewhere else.
          onFocus={(e) => e.target.matches(":focus-visible") && setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <AssetIllustration className="mx-auto w-full max-w-[400px]" />

          <div className="space-y-5">
            {/* Sized for a two-line title and bottom-aligned, so slides of different lengths don't
                resize the whole card as the carousel rotates. */}
            <div className="flex min-h-[148px] flex-col justify-end" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <h2 className="text-3xl font-semibold leading-tight">{slide.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed opacity-80">{slide.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2.5">
              {slides.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1} of ${slides.length}`}
                  aria-current={i === index}
                  className={cn(
                    "h-2.5 rounded-full border-2 border-current transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
                    i === index ? "w-6 bg-current" : "w-2.5 bg-transparent opacity-70 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>
        </aside>

        <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            {logoUrl !== null && (
              <div className="mb-8">
                <Logo size="lg" logoUrl={logoUrl} orgName={orgName} />
              </div>
            )}
            {children}
            {footer && <div className="mt-8 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
