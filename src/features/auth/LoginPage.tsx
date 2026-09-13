import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/auth.store";
import { mockCurrentUser } from "@/lib/mock-data";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const [isLoading, setIsLoading] = useState(false);

  // Phase 1: no real auth wired up yet (plan §C — org-scoped login → TOTP challenge →
  // access/refresh tokens lands in Phase 2). This just simulates the round trip so the
  // rest of the app's guarded routes are reachable.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setCurrentUser(mockCurrentUser);
      setIsLoading(false);
      toast.success("Signed in");
      navigate("/");
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 text-center">
              <h1 className="text-lg font-semibold text-foreground">Sign in to your workspace</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your organization, email and password to continue.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org">Organization</Label>
                <Input id="org" placeholder="acme-logistics" defaultValue="acme-logistics" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" defaultValue="emmanuelekopimo@gmail.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" defaultValue="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Forgot your password?{" "}
              <span className="cursor-pointer font-medium text-primary hover:underline">Reset it</span>
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          New organization? <span className="cursor-pointer font-medium text-primary hover:underline">Start onboarding</span>
        </p>
      </div>
    </div>
  );
}
