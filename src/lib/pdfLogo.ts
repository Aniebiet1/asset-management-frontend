/**
 * `logoSrc` (from `useResolvedLogoSrc`) is a Cloudinary http URL or a blob: object URL, neither of
 * which jsPDF's `addImage` accepts directly - it needs an actual data URL. Fetching + re-reading as
 * a data URL works for both cases without hitting canvas CORS taint issues.
 *
 * Shared by every client-side PDF generator (labels, audit reports, check-out receipts, report
 * exports) so a downloaded file always carries the org's actual logo, not just its name in text.
 */
export async function resolveLogoDataUrl(logoSrc: string | null): Promise<string | null> {
  if (!logoSrc) return null;
  try {
    const res = await fetch(logoSrc);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
