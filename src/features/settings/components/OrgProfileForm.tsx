import { useState } from "react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { WORLD_TIMEZONES } from "@/lib/timezones";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/http-error";
import type { Organization } from "@/types";

const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi" },
];

/**
 * Shared by onboarding's Org Profile step and the Settings page's Organization tab (same
 * `PATCH /organizations/me` endpoint, per BUILD_PLAN.md Phase 9's note to share the form rather
 * than duplicate it). Callers own the footer/actions via `renderActions` since onboarding needs a
 * "Continue" button and Settings needs a "Save changes" one.
 */
export function OrgProfileForm({
  org,
  onSaved,
  renderActions,
}: {
  org: Organization;
  onSaved: () => void | Promise<void>;
  renderActions: (state: { isSaving: boolean }) => ReactNode;
}) {
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const [currency, setCurrency] = useState(org.currency);
  const [timezone, setTimezone] = useState(org.timezone);
  const [dateFormat, setDateFormat] = useState(org.dateFormat);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const currencyMeta = CURRENCIES.find((c) => c.code === currency);
      await apiFetch("/organizations/me", {
        method: "PATCH",
        body: JSON.stringify({ currency, currencySymbol: currencyMeta?.symbol ?? org.currencySymbol, timezone, dateFormat }),
      });
      await refetchOrg();
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Organization profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sets how currency and dates appear throughout {org.name}.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.label} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {WORLD_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label} ({tz.offset})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dateFormat">Date format</Label>
        <Select value={dateFormat} onValueChange={setDateFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {renderActions({ isSaving })}
    </form>
  );
}
