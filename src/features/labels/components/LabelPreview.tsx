import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { cn } from "cn";
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
      height: 32,
      width: 1.4,
    });
  }, [showBarcode, assetTag]);

  const header = (
    <div className="flex items-center gap-1.5">
      {logoSrc && <img src={logoSrc} alt="" className="size-6 shrink-0 object-contain" />}
      <span className="truncate text-xs font-semibold">Property of {orgName}</span>
    </div>
  );

  const barcodeBlock = showBarcode && (
    <div className="flex flex-col items-center">
      <canvas ref={barcodeRef} />
      <p className="mt-0.5 font-mono text-[10px] tracking-wide">{assetTag}</p>
    </div>
  );

  const qrBlock = showQr && (
    <div className="flex flex-col items-center">
      {qrDataUrl ? (
        <img src={qrDataUrl} alt={`QR code for ${assetTag}`} className="size-14 object-contain" />
      ) : (
        <div className="size-14 animate-pulse rounded bg-black/10" />
      )}
      {format === "qr_only" && <p className="mt-0.5 font-mono text-[10px] tracking-wide">{assetTag}</p>}
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-black/20 bg-white p-3 text-black",
        format === "barcode_only" ? "flex h-24 w-56 flex-col justify-between" : "flex w-full flex-col gap-2"
      )}
    >
      {header}
      {format === "barcode_qr" && (
        <div className="flex items-center justify-between gap-3">
          {barcodeBlock}
          {qrBlock}
        </div>
      )}
      {format === "barcode_only" && barcodeBlock}
      {format === "qr_only" && <div className="flex justify-center">{qrBlock}</div>}
    </div>
  );
}
