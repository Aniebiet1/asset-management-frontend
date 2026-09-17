import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Generates a QR code data URL for the given value, keyed on that value. Shared by
 * AssetDetailPage's QR preview and the label-format previews so both use identical
 * generation/staleness-guard logic instead of copy-pasted `useEffect`s.
 */
export function useQrCodeDataUrl(value: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value).then((url: string) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return dataUrl;
}
