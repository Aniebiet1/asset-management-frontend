import { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Camera-based barcode/QR scan, decoding straight into the caller's search box - manual text
 * entry works regardless of whether this ever gets a usable camera (headless/CI environments,
 * denied permissions, no camera hardware). Mounted conditionally by the parent (rather than
 * staying mounted and toggling visibility) so the camera stream only opens while actually in use.
 */
export function BarcodeScanner({
  onDetected,
  onError,
}: {
  onDetected: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const rawId = useId();
  const elementId = `scanner-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let cancelled = false;
    let detected = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          if (detected || cancelled) return;
          detected = true;
          onDetected(decodedText);
        },
        undefined
      )
      .catch(() => {
        if (!cancelled) onError?.("Camera unavailable. Enter the asset tag manually below.");
      });

    return () => {
      cancelled = true;
      const activeScanner = scannerRef.current;
      if (activeScanner) {
        activeScanner
          .stop()
          .then(() => activeScanner.clear())
          .catch(() => {
            // Best-effort cleanup - start() may not have reached a running state yet.
          });
      }
    };
    // Intentionally mount-once: this component is only ever rendered while scanning is active,
    // so there is no prop change that should restart the camera mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  return <div id={elementId} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg [&_video]:rounded-lg" />;
}