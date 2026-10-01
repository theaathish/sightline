import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHead, Tag } from "@/components/dash";
import { Button } from "@/components/ui/button";
import { issues, type Issue } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/audit")({
  head: () => ({
    meta: [
      { title: "Audit — Sightline" },
      {
        name: "description",
        content: "Sitemap, robots.txt, meta tags, schema and speed issues sorted by priority, each with a fix.",
      },
      { property: "og:title", content: "Audit — Sightline" },
      { property: "og:description", content: "Every issue found on your site, ranked by what to fix first." },
    ],
  }),
  component: Audit,
});

const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
const tones = { Critical: "signal", High: "signal", Medium: "warn", Low: "neutral" } as const;

function Audit() {
  const [filter, setFilter] = useState<string>("All");
  const [open, setOpen] = useState<Issue | null>(null);
  const areas = ["All", ...Array.from(new Set(issues.map((i) => i.area)))];
  const list = issues
    .filter((i) => filter === "All" || i.area === filter)
    .sort((a, b) => order[a.priority] - order[b.priority]);

  return (
    <>
      <PageHead
        title="Audit"
        lede="7 issues found across 160 pages · last crawl 2 hours ago"
        action={
          <Button variant="outline" className="h-9 text-sm">
            Re-run audit
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {areas.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === a ? "border-ink bg-ink text-background" : "text-muted-foreground hover:border-ink"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <Card>
        <ul className="divide-y">
          {list.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <Tag tone={tones[i.priority]}>{i.priority}</Tag>
              <div className="min-w-[200px] flex-1">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {i.area} · {i.pages} {i.pages === 1 ? "page" : "pages"} affected
                </p>
              </div>
              <Button variant="outline" className="h-9 text-xs" onClick={() => setOpen(i)}>
                How to fix
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-xl border bg-background p-6 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Tag tone={tones[open.priority]}>{open.priority}</Tag>
            <h2 className="mt-3 font-display text-xl font-bold">{open.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{open.detail}</p>
            <div className="mt-5 rounded-lg border border-l-2 border-l-signal bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal">How to fix</p>
              <p className="mt-2 text-sm">{open.fix}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button className="h-10 text-sm font-semibold" onClick={() => setOpen(null)}>
                Mark as done
              </Button>
              <Button variant="ghost" className="h-10 text-sm" onClick={() => setOpen(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
