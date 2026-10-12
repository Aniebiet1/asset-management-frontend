import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Download, Loader2, ScanLine, ShieldCheck, UserCheck, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditItemStatusBadge, AuditStatusBadge, ConditionBadge } from "@/components/common/StatusBadge";
import { BarcodeScanner } from "@/features/check-in-out/components/BarcodeScanner";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { resolveLogoDataUrl } from "@/lib/pdfLogo";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import {
  useAssignAuditMutation,
  useAuditHistoryQuery,
  useAuditQuery,
  useAuditReportQuery,
  useCancelAuditMutation,
  useRejectAuditMutation,
  useResumeAuditMutation,
  useScanAuditMutation,
  useStartAuditMutation,
  useSubmitAuditMutation,
  useVerifyAuditMutation,
} from "@/features/audits/api";
import { useCategoriesQuery, useDepartmentsQuery, useLocationsQuery } from "@/features/catalog/api";
import { useAuthStore } from "@/store/auth.store";
import type { AssetCondition, AuditItem, AuditReport, User } from "@/types";

const NONE = "__none__";

const conditionOptions: { value: AssetCondition; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
];

function itemLabel(item: AuditItem): string {
  return item.assetName ?? item.assetTag ?? item.assetId;
}

/**
 * The audit workflow (plan §D / BUILD_PLAN.md Phase 6): a single page that renders different
 * action panels depending on what the signed-in user can do on THIS audit specifically -
 * `canAssignAudits`/`canVerifyAudits` are role permissions, but the assignee side
 * (`canPerformAssignedAudit`) is ownership-checked against `audit.assignedTo`, not role-checked,
 * matching how the backend enforces it (any holder of the permission who happens to be the
 * assignee can act, nobody else can, and the server re-checks this regardless of what we show).
 */
export function AuditDetailPage() {
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);

  const { data, isLoading, isError } = useAuditQuery(id);
  const history = useAuditHistoryQuery(id);
  const audit = data?.audit;
  const items = data?.items ?? [];

  const canAssign = hasPermission(currentUser?.role, "canAssignAudits");
  const canVerify = hasPermission(currentUser?.role, "canVerifyAudits");
  const canPerform = hasPermission(currentUser?.role, "canPerformAssignedAudit");
  const isAssignee = !!audit && canPerform && audit.assignedTo === currentUser?.id;
  const isSubmitter = !!audit && audit.submittedBy === currentUser?.id;

  const report = useAuditReportQuery(id, { enabled: audit?.status === "verified" });

  const locations = useLocationsQuery();
  const departments = useDepartmentsQuery();
  const categories = useCategoriesQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !audit) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">Audit not found.</p>
        <Button variant="link" asChild>
          <Link to="/audits">Back to audits</Link>
        </Button>
      </div>
    );
  }

  const scopeTargetName =
    audit.scopeType === "location"
      ? locations.data?.find((l) => l.id === audit.scopeId)?.name
      : audit.scopeType === "department"
        ? departments.data?.find((d) => d.id === audit.scopeId)?.name
        : audit.scopeType === "category"
          ? categories.data?.find((c) => c.id === audit.scopeId)?.name
          : undefined;
  const scopeDescription = audit.scopeType === "all" ? "All assets" : (scopeTargetName ?? "Scoped target");

  const canCancel = canAssign && ["draft", "assigned", "in_progress", "submitted", "rejected"].includes(audit.status);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to="/audits">
          <ArrowLeft className="size-3.5" />
          Back to Audits
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{audit.name}</h1>
            <AuditStatusBadge status={audit.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {audit.code} · {scopeDescription} · Assigned to {audit.assignedToName ?? (audit.assignedTo ? "a team member" : "nobody yet")}
          </p>
        </div>
        {canCancel && <CancelAuditButton auditId={audit.id} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
              <Stat label="Expected" value={audit.totalExpected} />
              <Stat label="Scanned" value={audit.totalScanned} />
              <Stat label="Matched" value={audit.totalMatched} className="text-emerald-600 dark:text-emerald-400" />
              <Stat label="Missing" value={audit.totalMissing} className="text-rose-600 dark:text-rose-400" />
              <Stat label="Discrepant" value={audit.totalDiscrepant} className="text-amber-600 dark:text-amber-400" />
            </CardContent>
          </Card>

          {audit.rejectionReason && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
              <p className="font-medium">Rejected: {audit.rejectionReason}</p>
            </div>
          )}
          {audit.staffRemark && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Staff remark</p>
              <p className="mt-0.5 text-foreground">{audit.staffRemark}</p>
            </div>
          )}
          {audit.verifierRemark && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Verifier remark</p>
              <p className="mt-0.5 text-foreground">{audit.verifierRemark}</p>
            </div>
          )}

          {canAssign && audit.status === "draft" && <AssignPanel auditId={audit.id} />}
          {isAssignee && audit.status === "assigned" && <StartPanel auditId={audit.id} />}
          {isAssignee && audit.status === "in_progress" && (
            <ScanAndSubmitPanel auditId={audit.id} locationOptions={locations.data ?? []} />
          )}
          {isAssignee && audit.status === "rejected" && <ResumePanel auditId={audit.id} reason={audit.rejectionReason} />}
          {canVerify && audit.status === "submitted" && (
            <VerifyPanel auditId={audit.id} blockedBySelf={isSubmitter} />
          )}
          {audit.status === "verified" && (
            <ReportPanel isLoading={report.isLoading} report={report.data} orgName={org?.name} logoSrc={logoSrc} />
          )}

          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border p-4">
                <h2 className="text-sm font-semibold text-foreground">Scoped items ({items.length})</h2>
              </div>
              {items.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No assets are in scope for this audit.</p>
              ) : (
                <div className="max-h-96 divide-y divide-border overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{itemLabel(item)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.scannedAt ? `Scanned ${formatDateTime(item.scannedAt)}` : "Not scanned yet"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.conditionFound && <ConditionBadge condition={item.conditionFound} />}
                        <AuditItemStatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="p-0">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-foreground">History</h2>
            </div>
            {history.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : history.data && history.data.length > 0 ? (
              <div className="space-y-0 divide-y divide-border">
                {history.data.map((h) => (
                  <div key={h.id} className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <AuditStatusBadge status={h.toStatus} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.actorName ?? "System"} · {formatDateTime(h.createdAt)}
                    </p>
                    {h.remark && <p className="mt-1 text-xs text-foreground">{h.remark}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No history yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-semibold text-foreground ${className ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function AssignPanel({ auditId }: { auditId: string }) {
  const [assigneeId, setAssigneeId] = useState<string>("");
  const people = useQuery({
    queryKey: ["people", "list"],
    queryFn: () => apiFetch<{ data: User[] }>("/people").then((r) => r.data),
  });
  const assignAudit = useAssignAuditMutation(auditId);

  async function handleAssign() {
    if (!assigneeId) return;
    try {
      await assignAudit.mutateAsync(assigneeId);
      toast.success("Audit assigned");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't assign this audit.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <UserCheck className="size-4" />
          Assign this audit
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {people.data?.filter((p) => p.isActive).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" disabled={!assigneeId || assignAudit.isPending} onClick={handleAssign}>
            {assignAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Assign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StartPanel({ auditId }: { auditId: string }) {
  const startAudit = useStartAuditMutation(auditId);

  async function handleStart() {
    try {
      await startAudit.mutateAsync();
      toast.success("Audit started");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start this audit.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">You've been assigned this audit</h2>
          <p className="text-xs text-muted-foreground">Start it when you're ready to begin scanning.</p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={startAudit.isPending} onClick={handleStart}>
          {startAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Start audit
        </Button>
      </CardContent>
    </Card>
  );
}

function ScanAndSubmitPanel({
  auditId,
  locationOptions,
}: {
  auditId: string;
  locationOptions: { id: string; name: string }[];
}) {
  const [scannedTag, setScannedTag] = useState("");
  const [locationId, setLocationId] = useState(NONE);
  const [condition, setCondition] = useState(NONE);
  const [staffRemark, setStaffRemark] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const scanAudit = useScanAuditMutation(auditId);
  const submitAudit = useSubmitAuditMutation(auditId);

  async function performScan(tag: string) {
    try {
      const result = await scanAudit.mutateAsync({
        scannedTag: tag,
        locationId: locationId === NONE ? undefined : locationId,
        condition: condition === NONE ? undefined : condition,
      });
      toast.success(`${result.asset.name}: ${result.status}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't scan that asset tag.");
    }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const tag = scannedTag.trim();
    if (!tag) return;
    await performScan(tag);
    setScannedTag("");
    tagInputRef.current?.focus();
  }

  // The scanner runs in continuous mode (audits are scanned item by item in one sitting): it
  // pauses while this resolves, then resumes for the next label without restarting the camera.
  async function handleCameraDetected(text: string) {
    const tag = text.trim();
    if (!tag) return;
    await performScan(tag);
  }

  async function handleSubmit() {
    const remark = staffRemark.trim();
    if (!remark) return;
    try {
      await submitAudit.mutateAsync(remark);
      toast.success("Audit submitted for verification");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit this audit.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ScanLine className="size-4" />
          Scan assets
        </h2>
        <form onSubmit={handleScan} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <Input
            ref={tagInputRef}
            autoFocus
            placeholder="Scan or type an asset tag"
            value={scannedTag}
            onChange={(e) => setScannedTag(e.target.value)}
          />
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Same location</SelectItem>
              {locationOptions.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unchanged</SelectItem>
              {conditionOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setScannerOpen((v) => !v)}
          >
            <Camera className="size-3.5" />
            {scannerOpen ? "Close Camera" : "Use Camera"}
          </Button>
          <Button type="submit" size="sm" className="gap-1.5" disabled={!scannedTag.trim() || scanAudit.isPending}>
            {scanAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Scan
          </Button>
        </form>

        {scannerOpen && (
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Point the camera at a barcode or QR code</p>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setScannerOpen(false)}>
                <X className="size-3.5" />
              </Button>
            </div>
            <BarcodeScanner
              continuous
              onDetected={handleCameraDetected}
              onError={(message) => {
                toast.error(message);
                setScannerOpen(false);
              }}
            />
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Submit for verification once every asset has been scanned or accounted for.
          </p>
          <Textarea
            placeholder="Summarize what you found (required before submitting)."
            value={staffRemark}
            onChange={(e) => setStaffRemark(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" className="gap-1.5" disabled={!staffRemark.trim() || submitAudit.isPending} onClick={handleSubmit}>
              {submitAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Submit for verification
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumePanel({ auditId, reason }: { auditId: string; reason: string | null }) {
  const resumeAudit = useResumeAuditMutation(auditId);

  async function handleResume() {
    try {
      await resumeAudit.mutateAsync();
      toast.success("Audit resumed. Keep scanning and resubmit when ready.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resume this audit.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">This audit was rejected</h2>
          <p className="text-xs text-muted-foreground">{reason ?? "No reason was given."}</p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={resumeAudit.isPending} onClick={handleResume}>
          {resumeAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Resume audit
        </Button>
      </CardContent>
    </Card>
  );
}

function VerifyPanel({ auditId, blockedBySelf }: { auditId: string; blockedBySelf: boolean }) {
  const [verifierRemark, setVerifierRemark] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const verifyAudit = useVerifyAuditMutation(auditId);
  const rejectAudit = useRejectAuditMutation(auditId);

  async function handleVerify() {
    try {
      await verifyAudit.mutateAsync(verifierRemark.trim() || undefined);
      toast.success("Audit verified");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't verify this audit.");
    }
  }

  async function handleReject() {
    const reason = rejectionReason.trim();
    if (!reason) return;
    try {
      await rejectAudit.mutateAsync(reason);
      toast.success("Audit rejected and sent back to the assignee");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reject this audit.");
    }
  }

  if (blockedBySelf) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          You submitted this audit, so you can't also verify it. Another verifier needs to review it.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4" />
          Verify this submission
        </h2>
        <div>
          <Textarea
            placeholder="Optional verifier remark"
            value={verifierRemark}
            onChange={(e) => setVerifierRemark(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" className="gap-1.5" disabled={verifyAudit.isPending} onClick={handleVerify}>
              {verifyAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <Textarea
            placeholder="Reason for rejecting (required)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={!rejectionReason.trim() || rejectAudit.isPending}
              onClick={handleReject}
            >
              {rejectAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const AUDIT_ITEM_STATUS_LABEL: Record<AuditItem["status"], string> = {
  pending: "Pending",
  matched: "Matched",
  missing: "Missing",
  relocated: "Relocated",
  damaged: "Damaged",
};

/** Every verified audit gets a downloadable record: header facts, both required remarks, the
 * summary tally and the full item roster, generated client-side (see CLAUDE.md's "no server-side
 * PDF rendering" rule) the same way Check-Out/Return builds its receipt. Carries the org's own
 * logo (not just its name) so a downloaded report is branded to whichever org produced it. */
async function downloadAuditReportPdf(report: AuditReport, orgName: string | undefined, logoSrc: string | null) {
  const { audit, items } = report;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await resolveLogoDataUrl(logoSrc);

  const logoSize = 12;
  let titleX = 14;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 14, 10, logoSize, logoSize);
      titleX = 14 + logoSize + 4;
    } catch {
      // Unsupported image encoding for jsPDF - fall back to a text-only header.
    }
  }

  doc.setFontSize(14);
  doc.text(orgName ?? "TecresTrackIT AMS", titleX, 16);
  doc.setFontSize(11);
  doc.text("Physical Inventory Audit Report", titleX, 23);

  doc.setFontSize(9);
  const infoRows: [string, string][] = [
    ["Audit Code", audit.code],
    ["Audit Name", audit.name],
    ["Scope", audit.scopeType === "all" ? "All assets" : audit.scopeType],
    ["Assigned To", audit.assignedToName ?? "-"],
    ["Assigned By", audit.assignedByName ?? "-"],
    ["Submitted By", audit.submittedByName ?? "-"],
    ["Submitted At", formatDateTime(audit.submittedAt)],
    ["Verified By", audit.verifiedByName ?? "-"],
    ["Verified At", formatDateTime(audit.verifiedAt)],
    ["Staff Remark", audit.staffRemark ?? "-"],
    ["Verifier Remark", audit.verifierRemark ?? "-"],
  ];
  let y = 31;
  infoRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 55, y, { maxWidth: 140 });
    y += 6;
  });

  y += 2;
  autoTable(doc, {
    startY: y,
    head: [["Expected", "Scanned", "Matched", "Missing", "Discrepant"]],
    body: [[audit.totalExpected, audit.totalScanned, audit.totalMatched, audit.totalMissing, audit.totalDiscrepant].map(String)],
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [38, 38, 38] },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [["Asset", "Tag", "Status", "Condition", "Scanned At"]],
    body: items.map((item) => [
      item.assetName ?? item.assetId,
      item.assetTag ?? "-",
      AUDIT_ITEM_STATUS_LABEL[item.status],
      item.conditionFound ?? "-",
      item.scannedAt ? formatDateTime(item.scannedAt) : "Not scanned",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [38, 38, 38] },
  });

  doc.save(`audit-report-${audit.code}.pdf`);
}

function ReportPanel({
  isLoading,
  report,
  orgName,
  logoSrc,
}: {
  isLoading: boolean;
  report: AuditReport | undefined;
  orgName: string | undefined;
  logoSrc: string | null;
}) {
  const summary = report?.summary;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4" />
            Audit report
          </h2>
          {report && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void downloadAuditReportPdf(report, orgName, logoSrc)}
            >
              <Download className="size-3.5" />
              Download report (PDF)
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Verified by {report?.audit.verifiedByName ?? "a verifier"} on {formatDate(report?.audit.verifiedAt ?? null)}
          {report?.audit.verifierRemark ? `: "${report.audit.verifierRemark}"` : "."}
        </p>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : summary ? (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-center text-sm sm:grid-cols-5">
            <div>
              <p className="font-semibold text-foreground">{summary.totalExpected}</p>
              <p className="text-[11px] text-muted-foreground">Expected</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{summary.totalScanned}</p>
              <p className="text-[11px] text-muted-foreground">Scanned</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.totalMatched}</p>
              <p className="text-[11px] text-muted-foreground">Matched</p>
            </div>
            <div>
              <p className="font-semibold text-rose-600 dark:text-rose-400">{summary.totalMissing}</p>
              <p className="text-[11px] text-muted-foreground">Missing</p>
            </div>
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">{summary.totalDiscrepant}</p>
              <p className="text-[11px] text-muted-foreground">Discrepant</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CancelAuditButton({ auditId }: { auditId: string }) {
  const [open, setOpen] = useState(false);
  const cancelAudit = useCancelAuditMutation(auditId);

  async function handleCancel() {
    try {
      await cancelAudit.mutateAsync();
      toast.success("Audit cancelled");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't cancel this audit.");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setOpen(true)}>
        <XCircle className="size-3.5" />
        Cancel audit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this audit?</DialogTitle>
            <DialogDescription>This stops the workflow immediately. It can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep audit
            </Button>
            <Button variant="destructive" disabled={cancelAudit.isPending} className="gap-1.5" onClick={handleCancel}>
              {cancelAudit.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Cancel audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
