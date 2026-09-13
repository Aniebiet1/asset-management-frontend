import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { ApiError } from "@/lib/http-error";
import { getInitials } from "@/lib/format";
import type { Organization } from "@/types";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

export function BrandingStep({ org, onNext, onBack }: { org: Organization; onNext: () => void; onBack: () => void }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const applyOrgTheme = useThemeStore((s) => s.applyOrgTheme);

  const [logoUrl, setLogoUrl] = useState(org.logoUrl);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor);
  const [accentColor, setAccentColor] = useState(org.accentColor ?? "#7c3aed");
  const [sidebarColor, setSidebarColor] = useState(org.sidebarColor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview — updates the CSS variables the whole app reads from, per plan §H, without
  // waiting for the "Continue" save.
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
      const res = await fetch(`${API_BASE_URL}/organizations/me/logo`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw await ApiError.fromResponse(res);
      const { data } = (await res.json()) as { data: Organization };
      setLogoUrl(data.logoUrl);
      toast.success("Logo uploaded");
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
      onNext();
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
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization logo" className="size-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">{getInitials(org.name)}</span>
          )}
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo}>
            {isUploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Upload logo
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG or JPG, up to 5MB.</p>
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
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </form>
  );
}
