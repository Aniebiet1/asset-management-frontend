import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { ApiError } from "@/lib/http-error";
import { getInitials } from "@/lib/format";
import { extractLogoColors } from "@/lib/extractLogoColors";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import type { Organization } from "@/types";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/env";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" maxLength={20} />
      </div>
    </div>
  );
}

/**
 * Shared by onboarding's Branding step and the Settings page's Branding tab (same
 * `PATCH /organizations/me/theme` + `POST /organizations/me/logo` endpoints, per BUILD_PLAN.md
 * Phase 9's note to share the form rather than duplicate it). Callers own the footer/actions via
 * `renderActions` since onboarding needs "Back"/"Continue" and Settings needs "Save changes".
 */
export function BrandingForm({
  org,
  onSaved,
  renderActions,
}: {
  org: Organization;
  onSaved: () => void | Promise<void>;
  renderActions: (state: { isSaving: boolean; isUploadingLogo: boolean }) => ReactNode;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);

  const [logoUrl, setLogoUrl] = useState(org.logoUrl);
  const resolvedLogoSrc = useResolvedLogoSrc(logoUrl, accessToken);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor);
  const [accentColor, setAccentColor] = useState(org.accentColor ?? "#7c3aed");
  const [sidebarColor, setSidebarColor] = useState(org.sidebarColor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview — updates the CSS variables the whole app reads from, per plan §H, without
  // waiting for the save.
  const handlePrimaryChange = (v: string) => {
    setPrimaryColor(v);
    applyOrgTheme({ primaryColor: v });
  };
  const handleAccentChange = (v: string) => {
    setAccentColor(v);
    applyOrgTheme({ accentColor: v });
  };
  const handleSidebarChange = (v: string) => {
    setSidebarColor(v);
    applyOrgTheme({ sidebarColor: v });
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const [uploadRes, extracted] = await Promise.all([
        fetch(`${API_BASE_URL}/organizations/me/logo`, {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          credentials: "include",
          body: form,
        }),
        extractLogoColors(file),
      ]);
      if (!uploadRes.ok) throw await ApiError.fromResponse(uploadRes);
      const { data } = (await uploadRes.json()) as { data: Organization };
      setLogoUrl(data.logoUrl);
      applyOrgTheme({ logoUrl: data.logoUrl });
      if (extracted) {
        handlePrimaryChange(extracted.primary);
        handleAccentChange(extracted.accent);
        toast.success("Logo uploaded, colors picked up from it");
      } else {
        toast.success("Logo uploaded");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't upload that logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await apiFetch("/organizations/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ primaryColor, accentColor, sidebarColor: sidebarColor || undefined }),
      });
      await refetchOrg();
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your branding. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your logo and colors, applied everywhere in your workspace.</p>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border"
          style={resolvedLogoSrc ? undefined : { backgroundColor: primaryColor }}
        >
          {resolvedLogoSrc ? (
            <img src={resolvedLogoSrc} alt="Organization logo" className="size-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-primary-foreground">{getInitials(org.name)}</span>
          )}
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo}>
            {isUploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Upload logo
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG or JPG, up to 5MB. We'll pick colors from it, adjustable below.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorField label="Primary color" value={primaryColor} onChange={handlePrimaryChange} />
        <ColorField label="Accent color" value={accentColor} onChange={handleAccentChange} />
        <ColorField label="Sidebar color (optional)" value={sidebarColor || "#111113"} onChange={handleSidebarChange} />
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Live preview</p>
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar p-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            {getInitials(org.name)}
          </div>
          <span className="text-sm font-medium text-sidebar-foreground">{org.name}</span>
          <Button type="button" size="sm" className="ml-auto h-7">
            Button
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {renderActions({ isSaving, isUploadingLogo })}
    </form>
  );
}
