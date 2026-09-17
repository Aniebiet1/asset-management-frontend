import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpChallengeForm } from "@/components/auth/TotpChallengeForm";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";

interface TotpChallengeState {
  preAuthToken?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string | null;
}

export function TotpChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.org);
  const completeTotpChallenge = useAuthStore((s) => s.completeTotpChallenge);
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);

  const state = location.state as TotpChallengeState | null;

  // Re-applies the org's colors/logo/favicon here too, not just on the login screen that
  // navigated here — those are set imperatively on documentElement, not via a stylesheet, so a
  // hard reload of this page wipes them and nothing else re-derives them from this route's state.
  useEffect(() => {
    applyOrgTheme({ primaryColor: state?.primaryColor, accentColor: state?.accentColor, logoUrl: state?.logoUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preAuthToken = state?.preAuthToken;
  if (!preAuthToken) return <Navigate to="/login" replace />;

  return (
    <AuthLayout logoUrl={state?.logoUrl}>
      <TotpChallengeForm
        preAuthToken={preAuthToken}
        completeChallenge={completeTotpChallenge}
        onComplete={() => navigate(org?.onboardingCompletedAt ? "/" : "/onboarding", { replace: true })}
        backHref="/login"
      />
    </AuthLayout>
  );
}
