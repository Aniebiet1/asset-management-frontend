// Renders every docs/manuals/src/*.html to an A4 PDF in docs/manuals/pdf/.
// Usage (from the frontend repo root): node docs/manuals/tools/render.mjs [name ...]
import { chromium } from "playwright";
import { readdirSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, "../src");
const outDir = path.resolve(here, "../pdf");
mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2);
const files = readdirSync(srcDir).filter((f) => f.endsWith(".html") && (only.length === 0 || only.some((o) => f.includes(o))));

const browser = await chromium.launch();
for (const file of files) {
  const html = readFileSync(path.join(srcDir, file), "utf8");
  const title = (html.match(/<meta name="doc-short" content="([^"]+)"/) ?? [])[1] ?? "TecresTrackIT AMS";
  const page = await browser.newPage();
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("requestfailed", (r) => problems.push(`failed to load ${r.url()}`));
  await page.goto(pathToFileURL(path.join(srcDir, file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(outDir, file.replace(/\.html$/, ".pdf"));
  await page.pdf({
    path: out,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7.5px;color:#6b7686;padding:0 18mm;display:flex;justify-content:space-between;">
        <span><b style="color:#1f4e9c">TecresTrackIT AMS</b> &middot; ${title}</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  console.log(`${file} -> ${path.relative(process.cwd(), out)}${problems.length ? `\n  problems: ${problems.join("; ")}` : ""}`);
  await page.close();
}
await browser.close();
