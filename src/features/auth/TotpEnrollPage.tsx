import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpEnrollForm } from "@/components/auth/TotpEnrollForm";
import { useAuthStore } from "@/store/auth.store";

export function TotpEnrollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.org);
  const startTotpEnrollment = useAuthStore((s) => s.startTotpEnrollment);
  const verifyTotpEnrollment = useAuthStore((s) => s.verifyTotpEnrollment);

  const enrollmentToken = (location.state as { enrollmentToken?: string } | null)?.enrollmentToken;
  if (!enrollmentToken) return <Navigate to="/login" replace />;

  return (
    <AuthLayout>
      <TotpEnrollForm
        enrollmentToken={enrollmentToken}
        startEnrollment={startTotpEnrollment}
        verifyEnrollment={verifyTotpEnrollment}
        onComplete={() => navigate(org?.onboardingCompletedAt ? "/" : "/onboarding", { replace: true })}
      />
    </AuthLayout>
  );
}
