import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { ApiError } from "@/lib/http-error";
import { useTecresBrandTheme } from "./useTecresBrandTheme";

const CONSOLE_CAPABILITIES = ["Organizations and subsidiaries", "Staff roles and permissions", "Platform-wide audit trail"];

// The platform hero is Tecres's own internal ops console, not a customer-facing product, so it
// gets restrained, factual copy here rather than the tenant login's marketing pitch.
const platformHero = (
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

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((s) => s.login);
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
    <AuthLayout hero={platformHero} footer="Tecres internal, not for customer use.">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-4 text-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">TecresTrackIT AMS platform admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with your Tecres staff account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@tecres.internal" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
