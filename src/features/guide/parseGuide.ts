import guideSource from "../../../docs/manuals/src/03-organization-user-guide.html?raw";

/** Screenshots the manual references as ../assets/shots/<name>.png, bundled by Vite. */
const shotUrls = import.meta.glob<string>("../../../docs/manuals/assets/shots/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

export interface GuideChapter {
  id: string;
  num: string;
  title: string;
  audience: string;
  html: string;
}

export interface Guide {
  intro: string;
  chapters: GuideChapter[];
}

export const chapterId = (num: string) => `guide-${num}`;

/**
 * The in-app guide renders straight from the same HTML source the PDF is printed from
 * (docs/manuals/src, see docs/manuals/tools/render.mjs), so the two can't drift apart. The print-only
 * cover and contents page are dropped; the page builds its own navigation from the chapters.
 */
export function parseGuide(): Guide {
  const doc = new DOMParser().parseFromString(guideSource, "text/html");

  for (const img of doc.querySelectorAll<HTMLImageElement>("img")) {
    const name = img.getAttribute("src")?.split("/").pop() ?? "";
    const url = shotUrls[`../../../docs/manuals/assets/shots/${name}`];
    if (url) {
      img.setAttribute("src", url);
      img.setAttribute("loading", "lazy");
    } else {
      // A screenshot that isn't in the repo would render as a broken image; drop its figure instead.
      (img.closest("figure") ?? img).remove();
    }
  }
  // Column widths in the source are sized for A4 (mm); on screen the browser lays them out better.
  for (const th of doc.querySelectorAll("th[style]")) th.removeAttribute("style");
  // Wide tables scroll sideways on phones instead of stretching the page.
  for (const table of doc.querySelectorAll("table")) {
    const wrap = doc.createElement("div");
    wrap.className = "guide-table";
    table.replaceWith(wrap);
    wrap.append(table);
  }

  const chapters = [...doc.querySelectorAll<HTMLElement>("section.chapter")].map((section) => {
    const head = section.querySelector(".chapter-head");
    const num = head?.querySelector(".num")?.textContent?.trim() ?? "";
    const title = head?.querySelector("h2")?.textContent?.trim() ?? "";
    const audience = head?.querySelector(".audience")?.textContent?.trim() ?? "";
    head?.remove();
    const html = section.innerHTML.replace(/\bsection (\d{1,2})\b/g, (_, n: string) => `<a href="#${chapterId(n)}">section ${n}</a>`);
    return { id: chapterId(num), num, title, audience, html };
  });

  // The "About the examples" note describes the screenshots, so it only shows when they're bundled.
  const hasShots = Object.keys(shotUrls).length > 0;
  return { intro: hasShots ? (doc.querySelector(".front .callout")?.innerHTML ?? "") : "", chapters };
}
