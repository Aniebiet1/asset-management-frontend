import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpEnrollForm } from "@/components/auth/TotpEnrollForm";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";

interface TotpEnrollState {
  enrollmentToken?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string | null;
}

export function TotpEnrollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.org);
  const startTotpEnrollment = useAuthStore((s) => s.startTotpEnrollment);
  const verifyTotpEnrollment = useAuthStore((s) => s.verifyTotpEnrollment);
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);

  const state = location.state as TotpEnrollState | null;

  // Re-applies the org's colors/logo/favicon here too — see TotpChallengePage for why a hard
  // reload of this page otherwise loses them.
  useEffect(() => {
    applyOrgTheme({ primaryColor: state?.primaryColor, accentColor: state?.accentColor, logoUrl: state?.logoUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enrollmentToken = state?.enrollmentToken;
  if (!enrollmentToken) return <Navigate to="/login" replace />;

  return (
    <AuthLayout logoUrl={state?.logoUrl}>
      <TotpEnrollForm
        enrollmentToken={enrollmentToken}
        startEnrollment={startTotpEnrollment}
        verifyEnrollment={verifyTotpEnrollment}
        onComplete={() => navigate(org?.onboardingCompletedAt ? "/" : "/onboarding", { replace: true })}
        logoUrl={state?.logoUrl}
      />
    </AuthLayout>
  );
}
