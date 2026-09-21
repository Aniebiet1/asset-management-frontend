import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Column definition shared by all three export formats so CSV/Excel/PDF never drift out of sync -
 * one column list, one accessor per column, each format just renders it differently. */
export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string;
}

function toSheetRows<T>(rows: T[], columns: ExportColumn<T>[]): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const column of columns) out[column.header] = column.accessor(row);
    return out;
  });
}

export function exportRowsToCsv<T>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(toSheetRows(rows, columns), { header: columns.map((c) => c.header) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename, { bookType: "csv" });
}

export function exportRowsToExcel<T>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(toSheetRows(rows, columns), { header: columns.map((c) => c.header) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename, { bookType: "xlsx" });
}

/** `orgName`/`logoDataUrl` brand the exported file to whichever org ran the report - resolve the
 * logo to a data URL (see `resolveLogoDataUrl`) before calling, since jsPDF's `addImage` can't take
 * a plain http/blob URL. */
export function exportRowsToPdf<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string,
  branding?: { orgName: string; logoDataUrl: string | null }
): void {
  const doc = new jsPDF({ orientation: "landscape" });

  let titleX = 14;
  if (branding?.logoDataUrl) {
    try {
      doc.addImage(branding.logoDataUrl, 14, 6, 10, 10);
      titleX = 28;
    } catch {
      // Unsupported image encoding for jsPDF - fall back to a text-only header.
    }
  }
  if (branding?.orgName) {
    doc.setFontSize(10);
    doc.text(branding.orgName, titleX, 10);
  }
  doc.setFontSize(12);
  doc.text(title, titleX, branding?.orgName ? 17 : 12);
  autoTable(doc, {
    startY: 22,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => c.accessor(row))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [38, 38, 38] },
  });
  doc.save(filename);
}
