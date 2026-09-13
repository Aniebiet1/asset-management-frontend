import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpChallengeForm } from "@/components/auth/TotpChallengeForm";
import { useAuthStore } from "@/store/auth.store";

export function TotpChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.org);
  const completeTotpChallenge = useAuthStore((s) => s.completeTotpChallenge);

  const preAuthToken = (location.state as { preAuthToken?: string } | null)?.preAuthToken;
  if (!preAuthToken) return <Navigate to="/login" replace />;

  return (
    <AuthLayout>
      <TotpChallengeForm
        preAuthToken={preAuthToken}
        completeChallenge={completeTotpChallenge}
        onComplete={() => navigate(org?.onboardingCompletedAt ? "/" : "/onboarding", { replace: true })}
      />
    </AuthLayout>
  );
}
