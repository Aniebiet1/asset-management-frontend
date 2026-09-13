import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Stepper } from "@/components/common/Stepper";
import { Logo } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/auth.store";
import { apiFetch } from "@/lib/api-client";
import { OrgProfileStep } from "./steps/OrgProfileStep";
import { BrandingStep } from "./steps/BrandingStep";
import { SeedDataStep } from "./steps/SeedDataStep";
import { FinishStep } from "./steps/FinishStep";

const STEPS = [
  { key: "profile", label: "Profile" },
  { key: "branding", label: "Branding" },
  { key: "seed", label: "Seed data" },
  { key: "finish", label: "Finish" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

/**
 * Revised per BUILD_PLAN.md §0 / §1: starts at Org Profile, not account creation — the org and
 * its first admin already exist by the time anyone reaches this page (created by a Tecres
 * platform admin). Gated purely on `organizations.onboardingCompletedAt IS NULL`.
 */
export function OnboardingPage() {
  const org = useAuthStore((s) => s.org);
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const navigate = useNavigate();
  const [step, setStep] = useState<StepKey>("profile");

  if (!org) return null; // AppShell-level guard already ensures a session exists before this renders
  if (org.onboardingCompletedAt) return <Navigate to="/" replace />;

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const handleFinish = async () => {
    await apiFetch("/organizations/me/onboarding-complete", { method: "PATCH" });
    await refetchOrg();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <Stepper steps={STEPS as unknown as { key: string; label: string }[]} currentIndex={stepIndex} />
        <Card>
          <CardContent className="p-6">
            {step === "profile" && <OrgProfileStep org={org} onNext={() => setStep("branding")} />}
            {step === "branding" && <BrandingStep org={org} onNext={() => setStep("seed")} onBack={() => setStep("profile")} />}
            {step === "seed" && <SeedDataStep onNext={() => setStep("finish")} onBack={() => setStep("branding")} />}
            {step === "finish" && <FinishStep org={org} onBack={() => setStep("seed")} onFinish={handleFinish} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
