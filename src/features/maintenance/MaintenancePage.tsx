import { Wrench } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export function MaintenancePage() {
  return <ComingSoon title="Maintenance" description="Schedule, track and complete preventive and corrective maintenance work." icon={Wrench} />;
}
