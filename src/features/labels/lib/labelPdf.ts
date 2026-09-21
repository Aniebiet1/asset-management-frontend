import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { resolveLogoDataUrl } from "@/lib/pdfLogo";
import type { LabelFormat, LabelSheetLayout } from "@/types";

const PAGE_SIZES_MM: Record<LabelSheetLayout["pageSize"], [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
};

export interface LabelPrintAsset {
  assetTag: string;
}

function barcodeDataUrl(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, { format: "CODE128", displayValue: false, margin: 0, height: 80, width: 2.2 });
  return canvas.toDataURL("image/png");
}

/**
 * Mirrors LabelPreview.tsx's layout: logo + "Property of {org}" top-left, the barcode (or, for
 * QR-only, the tag text) underneath it, and the QR code as its own zone on the right spanning
 * nearly the full label height - matching the org's actual pre-printed label stock (63mm x
 * 25.4mm, logo/barcode left, QR right), not a generic centered card.
 */
function drawLabel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    format: LabelFormat;
    orgName: string;
    logoDataUrl: string | null;
    assetTag: string;
    barcodeUrl: string;
    qrUrl: string;
  }
) {
  const showBarcode = opts.format === "barcode_qr" || opts.format === "barcode_only";
  const showQr = opts.format === "barcode_qr" || opts.format === "qr_only";
  const radius = Math.min(w, h) * 0.1;

  doc.setDrawColor(215);
  doc.setLineWidth(0.1);
  doc.roundedRect(x, y, w, h, radius, radius);

  const pad = Math.min(w, h) * 0.12;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerH = h - pad * 2;
  const innerW = w - pad * 2;

  const qrSize = showQr ? innerH : 0;
  const rightGap = showQr ? pad : 0;
  const leftW = showQr ? innerW - qrSize - rightGap : innerW;

  const logoSize = innerH * 0.28;
  if (opts.logoDataUrl) {
    try {
      doc.addImage(opts.logoDataUrl, innerX, innerY, logoSize, logoSize);
    } catch {
      // Unsupported image encoding for jsPDF - skip the logo rather than fail the whole export.
    }
  }
  const textX = opts.logoDataUrl ? innerX + logoSize + pad * 0.6 : innerX;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(Math.max(4, innerH * 0.16));
  doc.setTextColor(130);
  doc.text("Property of", textX, innerY + innerH * 0.16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(5, innerH * 0.26));
  doc.setTextColor(0);
  doc.text(opts.orgName.toUpperCase(), textX, innerY + innerH * 0.36, { maxWidth: Math.max(innerX + leftW - textX, 1) });

  const contentY = innerY + innerH * 0.46;
  doc.setFont("courier", "normal");
  doc.setTextColor(0);
  doc.setFontSize(Math.max(4, innerH * 0.16));

  if (showBarcode) {
    const barcodeH = innerH * 0.32;
    doc.addImage(opts.barcodeUrl, innerX, contentY, Math.max(leftW, 1), barcodeH);
    doc.text(opts.assetTag, innerX, contentY + barcodeH + innerH * 0.16);
  } else if (showQr) {
    doc.text(opts.assetTag, innerX, contentY + innerH * 0.16);
  }

  if (showQr) {
    doc.addImage(opts.qrUrl, innerX + leftW + rightGap, innerY, qrSize, qrSize);
  }
}

interface GenerateOpts {
  assets: LabelPrintAsset[];
  format: LabelFormat;
  orgName: string;
  logoSrc: string | null;
  layout: LabelSheetLayout;
  filename: string;
}

/** Renders every asset's label into a grid PDF, calibrated to the org's saved sheet layout. */
export async function generateLabelSheetPdf({ assets, format, orgName, logoSrc, layout, filename }: GenerateOpts) {
  if (assets.length === 0) return;

  const [logoDataUrl, qrUrls] = await Promise.all([
    resolveLogoDataUrl(logoSrc),
    Promise.all(assets.map((a) => QRCode.toDataURL(a.assetTag))),
  ]);
  const barcodeUrls = assets.map((a) => barcodeDataUrl(a.assetTag));

  const [pageW, pageH] = PAGE_SIZES_MM[layout.pageSize];
  const doc = new jsPDF({ unit: "mm", format: layout.pageSize === "a4" ? "a4" : "letter" });

  const perPage = layout.columns * layout.rows;

  assets.forEach((asset, i) => {
    const posInPage = i % perPage;
    if (i > 0 && posInPage === 0) doc.addPage();

    const col = posInPage % layout.columns;
    const row = Math.floor(posInPage / layout.columns);
    const x = layout.marginLeftMm + col * (layout.labelWidthMm + layout.gapHorizontalMm);
    const y = layout.marginTopMm + row * (layout.labelHeightMm + layout.gapVerticalMm);

    if (x + layout.labelWidthMm > pageW || y + layout.labelHeightMm > pageH) return;

    drawLabel(doc, x, y, layout.labelWidthMm, layout.labelHeightMm, {
      format,
      orgName,
      logoDataUrl,
      assetTag: asset.assetTag,
      barcodeUrl: barcodeUrls[i],
      qrUrl: qrUrls[i],
    });
  });

  doc.save(filename);
}

/** A single-label PDF, page-sized to the label itself (no grid, no calibration), for one-off reprints. */
export async function generateSingleLabelPdf({
  asset,
  format,
  orgName,
  logoSrc,
  layout,
}: {
  asset: LabelPrintAsset;
  format: LabelFormat;
  orgName: string;
  logoSrc: string | null;
  layout: LabelSheetLayout;
}) {
  const [logoDataUrl, qrUrl] = await Promise.all([resolveLogoDataUrl(logoSrc), QRCode.toDataURL(asset.assetTag)]);
  const barcodeUrl = barcodeDataUrl(asset.assetTag);

  const doc = new jsPDF({
    unit: "mm",
    format: [layout.labelWidthMm, layout.labelHeightMm],
    orientation: layout.labelWidthMm >= layout.labelHeightMm ? "landscape" : "portrait",
  });
  drawLabel(doc, 0, 0, layout.labelWidthMm, layout.labelHeightMm, {
    format,
    orgName,
    logoDataUrl,
    assetTag: asset.assetTag,
    barcodeUrl,
    qrUrl,
  });
  doc.save(`label-${asset.assetTag}.pdf`);
}
