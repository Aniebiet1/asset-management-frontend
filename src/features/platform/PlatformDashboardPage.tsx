import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

/** Tecres platform-admin surface (plan §I) — entirely separate auth/session from tenant routes. */
export function PlatformDashboardPage() {
  return <ComingSoon title="Tecres Platform Dashboard" description="Fleet-wide org monitoring, quota/plan alerts and remediation actions." icon={ShieldCheck} />;
}
