export interface ExtractedColors {
  primary: string;
  accent: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d) % 6;
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image"));
    img.src = src;
  });
}

/**
 * Client-side dominant-color extraction from a logo file, so onboarding's Branding step can
 * pre-fill primary/accent from the uploaded mark instead of always defaulting to the same
 * blue/purple. The color picker stays available afterward for the user to override.
 *
 * Reads the file as a local blob URL (not the uploaded/hosted URL) specifically to avoid a
 * cross-origin-tainted canvas — a Cloudinary-hosted image loaded into a canvas without CORS
 * headers throws on `getImageData`, whereas a same-origin blob URL never does.
 */
export async function extractLogoColors(file: File): Promise<ExtractedColors | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket by quantized hue, vivid pixels only — skips the near-white background and
    // near-black outline/text strokes that dominate most logo art and would otherwise win by
    // sheer pixel count.
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.35 || l < 0.15 || l > 0.85) continue;
      const bucket = Math.round(h / 15) * 15;
      const existing = buckets.get(bucket);
      if (existing) {
        existing.count++;
        existing.r += r;
        existing.g += g;
        existing.b += b;
      } else {
        buckets.set(bucket, { count: 1, r, g, b });
      }
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count);
    if (sorted.length === 0) return null;

    const toHex = (entry: [number, { count: number; r: number; g: number; b: number }]) =>
      rgbToHex(Math.round(entry[1].r / entry[1].count), Math.round(entry[1].g / entry[1].count), Math.round(entry[1].b / entry[1].count));

    const primary = toHex(sorted[0]);
    // Second color needs to be a distinctly different hue, not just a near-duplicate shade.
    const accentEntry = sorted.slice(1).find(([hue]) => {
      const diff = Math.abs(hue - sorted[0][0]);
      return Math.min(diff, 360 - diff) > 40;
    });
    const accent = accentEntry ? toHex(accentEntry) : primary;

    return { primary, accent };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
