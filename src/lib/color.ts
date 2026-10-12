export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks near-black or near-white text for a given background hex, whichever has better WCAG
 * contrast — org branding colors are user-chosen (or extracted from a logo) and can land
 * anywhere on the lightness scale, so text-on-primary can't assume a dark background the way a
 * fixed design-system color could.
 */
export function readableForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#fafafa";
  const lum = relativeLuminance(rgb);
  const contrastWithBlack = contrastRatio(lum, 0);
  const contrastWithWhite = contrastRatio(lum, 1);
  return contrastWithBlack >= contrastWithWhite ? "#0a0a0a" : "#fafafa";
}

/** sRGB hex to OKLCH (L 0-1, C ~0-0.37, H degrees). Null for anything that isn't a 6-digit hex. */
export function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.sqrt(A * A + B * B), h: h < 0 ? h + 360 : h };
}

/**
 * The hue/chroma inputs index.css's shell tokens (--frame, --canvas, card shadows) are built from.
 * Those surfaces keep the brand's hue at a fixed lightness, so any org color yields a frame as
 * deep as the default navy. Chroma is capped per surface, and pulled almost to neutral for
 * near-gray brands and for the yellow/olive/orange band, which turns muddy brown once darkened.
 */
export function brandSurfaceParams(hex: string): { hue: number; chroma: number; frameChroma: number; tintChroma: number } | null {
  const lch = hexToOklch(hex);
  if (!lch) return null;
  const isNearGray = lch.c < 0.04;
  const isMuddyWhenDark = lch.h >= 55 && lch.h <= 135;
  const frameChroma = isNearGray ? lch.c * 0.5 : isMuddyWhenDark ? 0.022 : Math.min(lch.c * 0.55, 0.1);
  const tintChroma = isNearGray ? lch.c * 0.3 : Math.min(lch.c * 0.1, 0.014);
  return { hue: lch.h, chroma: Math.min(lch.c, 0.2), frameChroma, tintChroma };
}

/**
 * Dark-mode stand-in for a brand color too dark to read on dark surfaces (a navy or near-black
 * primary would make every primary button vanish). Keeps the hue and lifts the lightness: a
 * near-gray brand goes almost white, a chromatic one to a mid tone. Null when the brand is
 * already light enough to use as-is. Foreground is picked by WCAG contrast, approximating
 * luminance from OKLab lightness (Y ~ L^3).
 */
export function darkModePrimary(hex: string): { color: string; foreground: string } | null {
  const lch = hexToOklch(hex);
  if (!lch || lch.l >= 0.5) return null;
  const isNearGray = lch.c < 0.04;
  const l = isNearGray ? 0.92 : 0.66;
  const y = l ** 3;
  const foreground = contrastRatio(y, 0) >= contrastRatio(y, 1) ? "#0a0a0a" : "#fafafa";
  return { color: `oklch(${l} ${Math.min(lch.c, 0.2).toFixed(3)} ${lch.h.toFixed(1)})`, foreground };
}
