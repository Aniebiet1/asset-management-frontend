import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthStore } from "@/store/auth.store";

export function ForgotPasswordPage() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [orgSlug, setOrgSlug] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Backend deliberately always responds 200 regardless of whether the account exists
      // (no enumeration) — so there's nothing to branch on here besides the request itself failing.
      await requestPasswordReset(orgSlug.trim().toLowerCase(), email.trim());
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
          <h1 className="text-lg font-semibold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for that organization and email, a reset link is on its way.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-2">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-5 text-center">
        <h1 className="text-lg font-semibold text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We'll email you a link to set a new one.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="orgSlug">Organization</Label>
          <Input id="orgSlug" placeholder="acme" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
