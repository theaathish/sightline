import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, EmptyNote, Metric, PageHead, Tag } from "@/components/dash";
import { overview, scoreTrend, todos } from "@/lib/mock-data";


export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — Sightline" },
      { name: "description", content: "SEO health, AI mention rate, clicks, impressions and this week's to-do list." },
      { property: "og:title", content: "Overview — Sightline" },
      { property: "og:description", content: "Your weekly snapshot and the three things worth doing next." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const max = 100;
  const w = 640;
  const h = 140;
  const step = w / (scoreTrend.length - 1);
  const line = (key: "score" | "mentions") =>
    scoreTrend.map((d, i) => `${i * step},${h - (d[key] / max) * h}`).join(" ");

  return (
    <>
      <PageHead
        title="Overview"
        lede="Week of 15 September · next run Monday"
        action={<Tag tone="signal">Search Console not connected</Tag>}
      />

      <Card className="overflow-hidden">
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="SEO health score" value={String(overview.seoScore)} delta={overview.seoDelta} />
          <Metric label="AI mention rate" value={`${overview.aiMentionRate}%`} delta={overview.aiDelta} />
          <Metric label="Clicks" value={overview.clicks.toLocaleString()} delta={overview.clicksDelta} />
          <Metric
            label="Impressions"
            value={`${(overview.impressions / 1000).toFixed(1)}k`}
            delta={overview.impressionsDelta}
          />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Seven-week trend</h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-signal" /> SEO score
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-ink" /> AI mentions
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-6 w-full" preserveAspectRatio="none" height={h}>
            <polyline points={line("score")} fill="none" stroke="var(--color-signal)" strokeWidth="2.5" />
            <polyline
              points={line("mentions")}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {scoreTrend.map((d) => (
              <span key={d.week}>{d.week}</span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold">Posts published</h2>
          <p className="num mt-4 text-5xl font-bold">
            {overview.postsPublished}
            <span className="text-2xl text-muted-foreground">/{overview.postsTarget}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">this month's target</p>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-signal"
              style={{ width: `${(overview.postsPublished / overview.postsTarget) * 100}%` }}
            />
          </div>
          <div className="mt-6">
            <EmptyNote>
              Three drafts are waiting for your approval in <strong>Content</strong>.
            </EmptyNote>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-base font-semibold">This week's to-do list</h2>
          <span className="text-xs text-muted-foreground">5 items</span>
        </div>
        <ul className="divide-y">
          {todos.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-signal)]" />
              <span className="flex-1 text-sm">{t.label}</span>
              <Tag tone={t.impact === "High" ? "signal" : t.impact === "Medium" ? "warn" : "neutral"}>
                {t.impact}
              </Tag>
              <span className="w-24 text-right text-xs text-muted-foreground">{t.area}</span>
            </li>
          ))}
        </ul>
        <div className="border-t px-6 py-3 text-xs text-muted-foreground">
          A short summary of your score change and top 3 actions lands in your inbox every Monday.{" "}
          <Link to="/dashboard/settings" className="font-medium text-signal underline underline-offset-4">
            Email settings
          </Link>
        </div>
      </Card>
    </>
  );
}
