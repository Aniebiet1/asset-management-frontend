import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { useAuthStore } from "@/store/auth.store";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { readLastOrgBranding } from "@/lib/lastOrg";
import { hasPermission } from "@/lib/permissions";
import type { PermissionSet } from "@/types";

import { LoginPage } from "@/features/auth/LoginPage";
import { TotpEnrollPage } from "@/features/auth/TotpEnrollPage";
import { TotpChallengePage } from "@/features/auth/TotpChallengePage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AssetsListPage } from "@/features/assets/AssetsListPage";
import { AssetDetailPage } from "@/features/assets/AssetDetailPage";
import { AssetCreatePage } from "@/features/assets/AssetCreatePage";
import { AssetEditPage } from "@/features/assets/AssetEditPage";
import { CheckInOutPage } from "@/features/check-in-out/CheckInOutPage";
import { MaintenancePage } from "@/features/maintenance/MaintenancePage";
import { AuditsListPage } from "@/features/audits/AuditsListPage";
import { AuditDetailPage } from "@/features/audits/AuditDetailPage";
import { PeoplePage } from "@/features/people/PeoplePage";
import { InviteAcceptPage } from "@/features/people/InviteAcceptPage";
import { VendorsPage } from "@/features/vendors/VendorsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { LabelsPage } from "@/features/labels/LabelsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { PlatformLoginPage } from "@/features/platform/PlatformLoginPage";
import { PlatformTotpEnrollPage } from "@/features/platform/PlatformTotpEnrollPage";
import { PlatformTotpChallengePage } from "@/features/platform/PlatformTotpChallengePage";
import { PlatformDashboardPage } from "@/features/platform/PlatformDashboardPage";
import { PlatformOrgsListPage } from "@/features/platform/PlatformOrgsListPage";
import { PlatformOrgCreatePage } from "@/features/platform/PlatformOrgCreatePage";
import { PlatformOrgDetailPage } from "@/features/platform/PlatformOrgDetailPage";
import { PlatformAlertsPage } from "@/features/platform/PlatformAlertsPage";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

function FullScreenSpinner() {
  // The silent-refresh boot attempt doesn't know the session yet, but the last org this browser
  // signed into is already cached (see lastOrg.ts) — shows that org's own logo pulsing instead of
  // a generic spinner or a flash of the Tecres mark for someone who's clearly already a customer.
  const cached = readLastOrgBranding();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <BrandedLoader size="xl" logoUrl={cached?.logoUrl} orgName={cached?.name} />
    </div>
  );
}

/** Tenant route guard: waits out the silent-refresh boot attempt, then gates on session +
 * onboarding completion, per BUILD_PLAN.md §0/§1. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const org = useAuthStore((s) => s.org);

  if (status === "booting") return <FullScreenSpinner />;
  if (status === "signed-out") return <Navigate to="/login" replace />;
  if (org && !org.onboardingCompletedAt) return <Navigate to="/onboarding" replace />;

  return <AppShell>{children}</AppShell>;
}

/** Same as ProtectedRoute, but also redirects home when the signed-in role lacks the given
 * nav-convenience permission (see permissions.ts) — this is UX only, the backend's authorize()
 * middleware is still the real boundary, but it keeps roles like staff from reaching pages their
 * nav doesn't link to just by typing the URL. */
function PermissionRoute({ permission, children }: { permission: keyof PermissionSet; children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const org = useAuthStore((s) => s.org);
  const currentUser = useAuthStore((s) => s.currentUser);

  if (status === "booting") return <FullScreenSpinner />;
  if (status === "signed-out") return <Navigate to="/login" replace />;
  if (org && !org.onboardingCompletedAt) return <Navigate to="/onboarding" replace />;
  if (!hasPermission(currentUser?.role, permission)) return <Navigate to="/" replace />;

  return <AppShell>{children}</AppShell>;
}

/** The onboarding route itself must NOT redirect-to-onboarding-again — it only needs a session. */
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === "booting") return <FullScreenSpinner />;
  if (status === "signed-out") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Platform sessions are memory-only with no refresh endpoint (see platformAuth.store.ts) — no
 * boot-time bootstrap to wait on, just a synchronous check. */
function PlatformProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = usePlatformAuthStore((s) => s.status);
  if (status === "signed-out") return <Navigate to="/platform/login" replace />;
  return <PlatformShell>{children}</PlatformShell>;
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          {/* Tenant auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/totp/enroll" element={<TotpEnrollPage />} />
          <Route path="/totp/challenge" element={<TotpChallengePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite/:token/accept" element={<InviteAcceptPage />} />

          {/* Onboarding — session required, deliberately not wrapped in AppShell */}
          <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

          {/* Tenant app */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><AssetsListPage /></ProtectedRoute>} />
          <Route path="/assets/new" element={<ProtectedRoute><AssetCreatePage /></ProtectedRoute>} />
          <Route path="/assets/:id/edit" element={<ProtectedRoute><AssetEditPage /></ProtectedRoute>} />
          <Route path="/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
          <Route path="/check-in-out" element={<ProtectedRoute><CheckInOutPage /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
          <Route path="/audits" element={<ProtectedRoute><AuditsListPage /></ProtectedRoute>} />
          <Route path="/audits/:id" element={<ProtectedRoute><AuditDetailPage /></ProtectedRoute>} />
          <Route path="/people" element={<PermissionRoute permission="canManagePeople"><PeoplePage /></PermissionRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><VendorsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/labels" element={<ProtectedRoute><LabelsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Tecres platform admin — fully separate auth/session, see BUILD_PLAN.md §1 */}
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route path="/platform/totp/enroll" element={<PlatformTotpEnrollPage />} />
          <Route path="/platform/totp/challenge" element={<PlatformTotpChallengePage />} />
          <Route path="/platform" element={<PlatformProtectedRoute><PlatformDashboardPage /></PlatformProtectedRoute>} />
          <Route path="/platform/orgs" element={<PlatformProtectedRoute><PlatformOrgsListPage /></PlatformProtectedRoute>} />
          <Route path="/platform/orgs/new" element={<PlatformProtectedRoute><PlatformOrgCreatePage /></PlatformProtectedRoute>} />
          <Route path="/platform/orgs/:id" element={<PlatformProtectedRoute><PlatformOrgDetailPage /></PlatformProtectedRoute>} />
          <Route path="/platform/alerts" element={<PlatformProtectedRoute><PlatformAlertsPage /></PlatformProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  );
}
