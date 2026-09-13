import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth.store";

import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AssetsListPage } from "@/features/assets/AssetsListPage";
import { AssetDetailPage } from "@/features/assets/AssetDetailPage";
import { AssetCreatePage } from "@/features/assets/AssetCreatePage";
import { CheckInOutPage } from "@/features/check-in-out/CheckInOutPage";
import { MaintenancePage } from "@/features/maintenance/MaintenancePage";
import { AuditsListPage } from "@/features/audits/AuditsListPage";
import { PeoplePage } from "@/features/people/PeoplePage";
import { VendorsPage } from "@/features/vendors/VendorsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { LabelsPage } from "@/features/labels/LabelsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { PlatformDashboardPage } from "@/features/platform/PlatformDashboardPage";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

/**
 * Route tree per plan §L. `/onboarding/*` and full `/platform/*` guards are stubbed for
 * now — Phase 1 wires the tenant tree end-to-end first since it's the bulk of the UI.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetsListPage /></ProtectedRoute>} />
        <Route path="/assets/new" element={<ProtectedRoute><AssetCreatePage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/check-in-out" element={<ProtectedRoute><CheckInOutPage /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
        <Route path="/audits" element={<ProtectedRoute><AuditsListPage /></ProtectedRoute>} />
        <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><VendorsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/labels" element={<ProtectedRoute><LabelsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="/platform" element={<ProtectedRoute><PlatformDashboardPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
