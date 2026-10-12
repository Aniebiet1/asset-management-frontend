import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Loader2, ScanLine } from "lucide-react";

// Labels print the asset tag as CODE-128 and/or QR (see labelPdf.ts); the rest cover tags that
// came from older stock or a manufacturer sticker.
const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

/** How long continuous mode ignores a re-read of the same code, so one label held in front of the
 * camera doesn't count twice. */
const SAME_CODE_COOLDOWN_MS = 2500;
/** Pause after a read in continuous mode, so the person can move to the next label. */
const RESUME_DELAY_MS = 700;

/**
 * The width the scanner is laid out at, before being scaled down to fit the screen.
 *
 * html5-qrcode decodes each frame from a canvas the size of the scan box *in CSS pixels*, not the
 * camera's native resolution. In a phone-width viewfinder (~330px) a CODE-128 asset tag of 20-30
 * characters (~250-350 bar modules) gets under one pixel per bar and never decodes, however good
 * the camera. Laying the scanner out at this width and shrinking it with a CSS transform keeps the
 * same on-screen viewfinder while the decoder works on a ~760px-wide region: 2-3 pixels per bar.
 */
const VIRTUAL_WIDTH = 880;

/**
 * Only one scanner may own the camera at a time. React StrictMode mounts, unmounts and remounts
 * effects in development, and a parent can swap one scanner for another; without this queue the
 * next instance would start while the previous one is still starting or stopping, leaving two
 * streams on the camera (or html5-qrcode refusing with "already under transition").
 */
let cameraQueue: Promise<void> = Promise.resolve();

function describeCameraError(err: unknown): string {
  const text = String((err as { name?: string; message?: string })?.name ?? "") + " " + String((err as Error)?.message ?? err ?? "");
  if (/NotAllowed|Permission/i.test(text)) return "Camera permission was denied. Allow camera access in the browser, or type the tag instead.";
  if (/NotFound|Requested device not found|OverconstrainedError/i.test(text)) return "No camera was found on this device. Type the tag instead.";
  if (/NotReadable|TrackStart|in use/i.test(text)) return "The camera is in use by another app. Close it and try again, or type the tag instead.";
  return "Camera unavailable. Type the asset tag instead.";
}

interface BarcodeScannerProps {
  /** Receives the decoded text, trimmed. May return a promise (continuous mode waits for it). */
  onDetected: (text: string) => void | Promise<void>;
  onError?: (message: string) => void;
  /** Keep scanning after each read (audits) instead of stopping at the first one (check-out). */
  continuous?: boolean;
}

/**
 * Camera-based barcode/QR scan. Manual text entry works regardless of whether this ever gets a
 * usable camera (headless/CI environments, denied permissions, no camera hardware, plain-http
 * access from a phone). Mounted conditionally by the parent so the camera only opens while
 * actually in use.
 */
export function BarcodeScanner({ onDetected, onError, continuous = false }: BarcodeScannerProps) {
  const rawId = useId();
  const elementId = `scanner-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  onDetectedRef.current = onDetected;
  onErrorRef.current = onError;
  const [status, setStatus] = useState<"starting" | "scanning" | "reading">("starting");
  const [lastRead, setLastRead] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const scannerElRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [scaledHeight, setScaledHeight] = useState(0);

  // Track the available width (to pick the scale) and the scanner's laid-out height (which the
  // transform doesn't change), so the frame around it is exactly the scaled size.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const scannerEl = scannerElRef.current;
    if (!frame || !scannerEl) return;
    const update = () => {
      const nextScale = frame.clientWidth / VIRTUAL_WIDTH;
      setScale(nextScale);
      setScaledHeight(scannerEl.offsetHeight * nextScale);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(scannerEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let releaseCleanup: () => void = () => {};
    const cleanupSignal = new Promise<void>((resolve) => (releaseCleanup = resolve));

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.("The camera only works over a secure (https) connection. Type the asset tag instead.");
      return;
    }

    const lifecycle = cameraQueue.then(async () => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: FORMATS,
        // Uses the platform's native BarcodeDetector (Chrome on Android, Safari 17+) when there
        // is one: far faster and better at 1D barcodes than the bundled JS decoder.
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      let busy = false;
      let last = { text: "", at: 0 };

      const handleDecoded = async (decodedText: string) => {
        const text = decodedText.trim();
        if (!text || busy || cancelled) return;
        if (continuous && text === last.text && Date.now() - last.at < SAME_CODE_COOLDOWN_MS) return;
        busy = true;
        last = { text, at: Date.now() };
        setLastRead(text);
        if (!continuous) {
          // Single-shot: the parent closes the scanner on detection.
          void onDetectedRef.current(text);
          return;
        }
        setStatus("reading");
        try {
          scanner.pause(false);
        } catch {
          // Not in a pausable state; the busy flag still blocks double reads.
        }
        try {
          await onDetectedRef.current(text);
        } finally {
          await new Promise((resolve) => setTimeout(resolve, RESUME_DELAY_MS));
          last = { text, at: Date.now() };
          busy = false;
          if (!cancelled) {
            try {
              scanner.resume();
            } catch {
              // Already scanning.
            }
            setStatus("scanning");
          }
        }
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            // Without an explicit size the browser hands back its default (often 640x480), which
            // leaves about one pixel per bar on a dense CODE-128 tag and makes 1D labels unreadable.
            // HD gives the decoder room; phones that can't do it fall back to their best.
            videoConstraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            // A wide window: 1D barcodes need width, and a QR still fits comfortably inside it.
            qrbox: (viewWidth, viewHeight) => {
              const width = Math.max(120, Math.floor(viewWidth * 0.86));
              const height = Math.max(90, Math.floor(Math.min(viewHeight * 0.72, width * 0.62)));
              return { width, height };
            },
          },
          (text) => void handleDecoded(text),
          undefined
        );
      } catch (err) {
        if (!cancelled) onErrorRef.current?.(describeCameraError(err));
        return;
      }
      if (!cancelled) setStatus("scanning");

      await cleanupSignal;
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // Already stopped.
      }
    });
    cameraQueue = lifecycle.catch(() => {});

    return () => {
      cancelled = true;
      releaseCleanup();
    };
    // Mount-once: the parent renders this only while scanning, and `continuous` never changes
    // during a session. Callbacks are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-xl bg-black/90"
        style={{ height: scaledHeight || undefined, aspectRatio: scaledHeight ? undefined : "4 / 3" }}
      >
        <div
          id={elementId}
          ref={scannerElRef}
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: VIRTUAL_WIDTH, transform: `scale(${scale})` }}
        />
      </div>
      <p className="mt-2 flex min-h-5 items-center justify-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {status === "starting" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Starting camera...
          </>
        ) : status === "reading" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Read <span className="font-mono text-foreground">{lastRead}</span>
          </>
        ) : (
          <>
            <ScanLine className="size-3.5" />
            {continuous && lastRead ? (
              <>
                Last read <span className="font-mono text-foreground">{lastRead}</span>. Ready for the next one.
              </>
            ) : (
              "Hold the barcode or QR code inside the box"
            )}
          </>
        )}
      </p>
    </div>
  );
}
