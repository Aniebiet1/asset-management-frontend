import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpChallengeForm } from "@/components/auth/TotpChallengeForm";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { useTecresBrandTheme } from "./useTecresBrandTheme";

export function PlatformTotpChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const completeTotpChallenge = usePlatformAuthStore((s) => s.completeTotpChallenge);
  useTecresBrandTheme();

  const preAuthToken = (location.state as { preAuthToken?: string } | null)?.preAuthToken;
  if (!preAuthToken) return <Navigate to="/platform/login" replace />;

  return (
    <AuthLayout>
      <TotpChallengeForm
        preAuthToken={preAuthToken}
        completeChallenge={completeTotpChallenge}
        onComplete={() => navigate("/platform", { replace: true })}
        backHref="/platform/login"
      />
    </AuthLayout>
  );
}
