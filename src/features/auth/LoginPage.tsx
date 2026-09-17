import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
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
    <AuthLayout
      logoUrl={branding ? branding.logoUrl : null}
      footer="New workspaces are set up by Tecres. Contact your account team if you need one."
    >
      <div className="mb-5 text-center">
        <h1 className="text-lg font-semibold text-foreground">Sign in to your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and password to continue.</p>
        {branding && (
          <p className="mt-2 text-xs text-muted-foreground">
            Signing in to <span className="font-medium text-foreground">{branding.name}</span>
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            ref={emailInputRef}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Forgot your password?{" "}
        <span className="cursor-pointer font-medium text-primary hover:underline" onClick={() => navigate("/forgot-password")}>
          Reset it
        </span>
      </p>
    </AuthLayout>
  );
}
