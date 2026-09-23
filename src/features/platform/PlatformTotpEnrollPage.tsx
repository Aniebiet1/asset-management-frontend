import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TotpEnrollForm } from "@/components/auth/TotpEnrollForm";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { useTecresBrandTheme } from "./useTecresBrandTheme";
import { platformHero, PLATFORM_AUTH_FOOTER } from "./platformHero";

export function PlatformTotpEnrollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const startTotpEnrollment = usePlatformAuthStore((s) => s.startTotpEnrollment);
  const verifyTotpEnrollment = usePlatformAuthStore((s) => s.verifyTotpEnrollment);
  useTecresBrandTheme();

  const enrollmentToken = (location.state as { enrollmentToken?: string } | null)?.enrollmentToken;
  if (!enrollmentToken) return <Navigate to="/platform/login" replace />;

  return (
    <AuthLayout hero={platformHero} footer={PLATFORM_AUTH_FOOTER}>
      <TotpEnrollForm
        enrollmentToken={enrollmentToken}
        startEnrollment={startTotpEnrollment}
        verifyEnrollment={verifyTotpEnrollment}
        onComplete={() => navigate("/platform", { replace: true })}
      />
    </AuthLayout>
  );
}
