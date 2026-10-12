import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { BrandedAuthCard } from "@/components/auth/BrandedAuthCard";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/http-error";
import { useOrgBranding } from "./useOrgBranding";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const { email, setEmail, branding, emailInputRef, getSubmitEmail } = useOrgBranding();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(getSubmitEmail(), password);
      // Carries the org's full branding forward, not just the logo, so the TOTP enroll/challenge
      // screens can re-apply colors (and favicon) themselves rather than relying on the CSS
      // custom properties this page already set on documentElement staying put — those reset on a
      // hard reload of the next screen, since they're applied imperatively, not via a stylesheet.
      const navState = { logoUrl: branding?.logoUrl, primaryColor: branding?.primaryColor, accentColor: branding?.accentColor };
      if (result.status === "totp_enrollment_required") {
        navigate("/totp/enroll", { state: { enrollmentToken: result.enrollmentToken, ...navState } });
      } else {
        navigate("/totp/challenge", { state: { preAuthToken: result.preAuthToken, ...navState } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandedAuthCard
      logoUrl={branding ? branding.logoUrl : null}
      orgName={branding?.name}
      footer="New workspaces are set up by Tecres. Contact your account team if you need one."
    >
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {branding ? (
            <>
              Welcome back to <span className="font-medium text-foreground">{branding.name}</span>. Enter your details to continue.
            </>
          ) : (
            "Enter your work email and password to continue."
          )}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            ref={emailInputRef}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-brand-link text-xs font-medium underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-10"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </BrandedAuthCard>
  );
}