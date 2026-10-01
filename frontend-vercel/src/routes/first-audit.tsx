import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { overview } from "@/lib/mock-data";

export const Route = createFileRoute("/first-audit")({
  head: () => ({
    meta: [
      { title: "Running your first audit — Sightline" },
      { name: "description", content: "Your first SEO and AI visibility audit runs in minutes and shows your score." },
      { property: "og:title", content: "Running your first audit — Sightline" },
      { property: "og:description", content: "Watch the crawl, then see your first score." },
    ],
  }),
  component: FirstAudit,
});

const tasks = [
  "Crawling 160 pages",
  "Checking sitemap and robots.txt",
  "Reading meta tags and schema",
  "Measuring page speed",
  "Asking 4 AI models your 20 prompts",
  "Scoring and ranking issues",
];

function FirstAudit() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 2)), 90);
    return () => clearInterval(id);
  }, []);

  const done = progress >= 100;
  const activeTask = Math.min(tasks.length - 1, Math.floor((progress / 100) * tasks.length));

  return (
    <FlowShell
      step={4}
      title={done ? "Your first score" : "Running your first audit"}
      lede={
        done
          ? "That's your baseline. Everything from here is measured against it."
          : "This usually takes two to three minutes. You can leave the page — we'll email you when it's done."
      }
      aside={
        <Note>
          AI visibility needs a week of runs before trend lines appear. Your next run is <strong>Monday</strong>.
        </Note>
      }
    >
      {!done ? (
        <div className="rounded-xl border p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.12em]">In progress</span>
            <span className="num text-3xl font-bold text-signal">{progress}%</span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-signal transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <ul className="mt-6 space-y-2.5 text-sm">
            {tasks.map((t, i) => (
              <li
                key={t}
                className={`flex items-center gap-3 ${
                  i < activeTask ? "text-muted-foreground" : i === activeTask ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <span className={`num w-4 text-xs ${i < activeTask ? "text-ok" : ""}`}>
                  {i < activeTask ? "✓" : i === activeTask ? "•" : ""}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border">
          <div className="flex flex-wrap items-end gap-10 border-b p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">SEO health score</p>
              <p className="num mt-2 text-7xl font-bold leading-none text-signal">{overview.seoScore}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">AI mention rate</p>
              <p className="num mt-2 text-7xl font-bold leading-none">{overview.aiMentionRate}%</p>
            </div>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <Cell value="2" label="Critical issues" />
            <Cell value="7" label="Total issues found" />
            <Cell value="20" label="Prompts now tracked" />
          </div>
          <div className="p-6">
            <Button asChild className="h-11 px-6 text-sm font-semibold">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      )}
    </FlowShell>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card p-6">
      <p className="num text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
