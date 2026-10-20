import { useAuthStore } from "@/store/auth.store";
import { orgHasFeature } from "@/lib/features";
import type { OrgFeature } from "@/types";

/** Tenant app only: whether the signed-in user's workspace has this add-on switched on. */
export function useOrgFeature(feature: OrgFeature): boolean {
  return useAuthStore((s) => orgHasFeature(s.org, feature));
}
