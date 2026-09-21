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
