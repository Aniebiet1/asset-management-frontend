import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import { cn } from "cn";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import guidePdfUrl from "../../../docs/manuals/pdf/03-organization-user-guide.pdf?url";
import { parseGuide } from "./parseGuide";
import "./guide.css";

export function UserGuidePage() {
  const { intro, chapters } = useMemo(parseGuide, []);
  const { hash } = useLocation();
  const [activeId, setActiveId] = useState(chapters[0]?.id);

  // Content is injected after first paint, so a deep link like /guide#guide-8 needs a manual jump.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  // Highlights the last chapter whose top has scrolled under the top bar. Listens in the capture
  // phase because the scroller is the shell's canvas panel on desktop but the window on phones.
  useEffect(() => {
    const update = () => {
      let current = chapters[0]?.id;
      for (const c of chapters) {
        const top = document.getElementById(c.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= 120) current = c.id;
      }
      setActiveId(current);
    };
    update();
    document.addEventListener("scroll", update, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", update, { capture: true });
  }, [chapters]);

  const contents = (
    <ol className="space-y-0.5">
      {chapters.map((c) => (
        <li key={c.id}>
          <a
            href={`#${c.id}`}
            className={cn(
              "flex gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors hover:bg-muted hover:text-foreground",
              activeId === c.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="w-4 shrink-0 text-right tabular-nums text-brand-link">{c.num}</span>
            <span>{c.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div>
      <PageHeader
        title="User guide"
        description="How to use TecresTrackIT, from signing in to audits, reports and settings."
        actions={
          <Button variant="outline" asChild>
            <a href={guidePdfUrl} download="TecresTrackIT Organization User Guide.pdf">
              <Download />
              Download PDF
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Guide contents" className="hidden lg:block">
          <div className="sticky top-20">
            <p className="mb-2 px-2.5 text-xs font-medium text-muted-foreground">Contents</p>
            {contents}
          </div>
        </nav>

        <details className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">Contents</summary>
          <div className="mt-2">{contents}</div>
        </details>

        <div className="min-w-0 space-y-6">
          {intro && <div className="guide-prose" dangerouslySetInnerHTML={{ __html: `<div class="callout">${intro}</div>` }} />}
          {chapters.map((c) => (
            <Card key={c.id} id={c.id} className="scroll-mt-20 gap-0 px-5 py-6 sm:px-8 sm:py-8">
              <header className="mb-5 flex items-end gap-4 border-b border-border pb-4">
                <span className="text-4xl leading-none font-bold tracking-tight text-brand-link tabular-nums">{c.num}</span>
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{c.audience}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">{c.title}</h2>
                </div>
              </header>
              <div className="guide-prose" dangerouslySetInnerHTML={{ __html: c.html }} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
