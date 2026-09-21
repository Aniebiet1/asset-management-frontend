import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useQrCodeDataUrl } from "@/lib/useQrCodeDataUrl";
import type { LabelFormat } from "@/types";

/**
 * A physical printed sticker isn't theme-aware, so this deliberately renders on a plain white
 * background with black text/borders regardless of the app's dark/light mode, unlike everything
 * else in this app.
 */
export function LabelPreview({
  format,
  orgName,
  logoSrc,
  assetTag,
}: {
  format: LabelFormat;
  orgName: string;
  logoSrc: string | null;
  assetTag: string;
}) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const showBarcode = format === "barcode_qr" || format === "barcode_only";
  const showQr = format === "barcode_qr" || format === "qr_only";
  const qrDataUrl = useQrCodeDataUrl(showQr ? assetTag : null);

  useEffect(() => {
    if (!showBarcode || !barcodeRef.current) return;
    JsBarcode(barcodeRef.current, assetTag, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 40,
      width: 1.6,
    });
  }, [showBarcode, assetTag]);

  const header = (
    <div className="flex items-center gap-1.5">
      {logoSrc ? (
        <img src={logoSrc} alt="" className="size-6 shrink-0 object-contain" />
      ) : (
        <div className="size-6 shrink-0 rounded bg-black/10" />
      )}
      <div className="min-w-0 leading-tight">
        <p className="text-[7px] italic text-black/60">Property of</p>
        <p className="truncate text-xs font-bold uppercase tracking-wide">{orgName}</p>
      </div>
    </div>
  );

  const barcodeBlock = showBarcode && (
    <div className="mt-1 flex min-w-0 flex-col items-start gap-0.5">
      {/* CSS-scaled, not just the canvas's native raster width, so a long asset tag never pushes the QR code out of view next to it. */}
      <canvas ref={barcodeRef} className="h-8 w-full max-w-[200px]" />
      <p className="truncate font-mono text-[9px] tracking-wide">{assetTag}</p>
    </div>
  );

  const qrImage = showQr && (
    <div className="flex aspect-square h-full shrink-0 items-center justify-center">
      {qrDataUrl ? (
        <img src={qrDataUrl} alt={`QR code for ${assetTag}`} className="size-full object-contain" />
      ) : (
        <div className="size-full animate-pulse rounded bg-black/10" />
      )}
    </div>
  );

  return (
    <div className="flex aspect-[63/25.4] w-80 max-w-full items-stretch gap-2.5 rounded-xl border border-black/20 bg-white p-2.5 text-black">
      {/* Left zone: logo + org name, with the barcode (or, for QR-only, the tag) underneath - mirrors the
          physical label stock this org actually prints on (63mm x 25.4mm, logo/barcode left, QR right). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {header}
        {showBarcode && barcodeBlock}
        {!showBarcode && showQr && <p className="mt-1 font-mono text-[9px] tracking-wide">{assetTag}</p>}
      </div>
      {qrImage}
    </div>
  );
}
