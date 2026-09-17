import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Clock } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TotpCodeInput } from "@/components/auth/TotpCodeInput";
import { ApiError } from "@/lib/http-error";

interface TotpChallengeFormProps {
  preAuthToken: string;
  completeChallenge: (preAuthToken: string, code: string) => Promise<void>;
  onComplete: () => void;
  /** Where "Back to sign in" returns to, and also where an expired challenge redirects — tenant
   * and platform each land on their own /login. Both cases abandon the current pre-auth challenge
   * (the preAuthToken it holds just goes unused; there's no session yet to tear down). */
  backHref: string;
}

/** The challenge screen's own countdown, deliberately shorter than the backend's actual
 * preAuthToken TTL (5 minutes as of writing — see `signPreAuthToken` in the backend's `lib/jwt.ts`)
 * so a stale tab always sends the user back to a fresh login rather than letting them discover the
 * token died server-side only after they've typed a code. */
const CHALLENGE_TIMEOUT_SECONDS = 120;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Shared between tenant and platform TOTP-challenge steps — see TotpEnrollForm for why. */
export function TotpChallengeForm({ preAuthToken, completeChallenge, onComplete, backHref }: TotpChallengeFormProps) {
  const navigate = useNavigate();
  // Recovery codes (10 hex chars) don't fit the 6-slot boxed input, so this toggles between the
  // large segmented input for the common case and a plain text field for the fallback.
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CHALLENGE_TIMEOUT_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    toast.error("That code has expired. Please sign in again.");
    navigate(backHref, { replace: true });
  }, [secondsLeft, backHref, navigate]);

  const toggleMode = () => {
    setMode((m) => (m === "totp" ? "recovery" : "totp"));
    setCode("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await completeChallenge(preAuthToken, code);
      onComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Enter your authentication code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "totp" ? "Open your authenticator app and enter the 6-digit code." : "Enter one of the recovery codes you saved at enrollment."}
        </p>
        <p
          className={cn(
            "mt-2 flex items-center justify-center gap-1 text-xs tabular-nums",
            secondsLeft <= 30 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <Clock className="size-3.5" />
          Expires in {formatCountdown(secondsLeft)}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "totp" ? (
          <div className="space-y-2">
            <Label htmlFor="challenge-code" className="block text-center">
              6-digit code
            </Label>
            <TotpCodeInput id="challenge-code" value={code} onChange={setCode} autoFocus />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="challenge-code">Recovery code</Label>
            <Input
              id="challenge-code"
              autoComplete="one-time-code"
              autoFocus
              maxLength={64}
              placeholder="e.g. 9e05baac37"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              className="text-center font-mono text-base"
              required
            />
          </div>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>
      <button type="button" onClick={toggleMode} className="block w-full text-center text-xs font-medium text-primary hover:underline">
        {mode === "totp" ? "Use a recovery code instead" : "Use your authenticator app instead"}
      </button>
      <Link to={backHref} className="block w-full text-center text-xs font-medium text-muted-foreground hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
