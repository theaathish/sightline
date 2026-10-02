import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, EmptyNote, Metric, PageHead, Tag } from "@/components/dash";
import { firestoreErrorMessage, useAudits, useChanges, useLatestAudit } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — Sightline" },
      {
        name: "description",
        content: "SEO health, AI mention rate, clicks, impressions and this week's to-do list.",
      },
      { property: "og:title", content: "Overview — Sightline" },
      {
        property: "og:description",
        content: "Your weekly snapshot and the three things worth doing next.",
      },
    ],
  }),
  component: Overview,
});

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground">Loading {label}…</p>
    </Card>
  );
}

function Overview() {
  const latestAudit = useLatestAudit();
  const history = useAudits(12);
  const changes = useChanges(50);

  const audit = latestAudit.data ?? null;
  const audits = history.data ?? [];
  const fixes = changes.data ?? [];

  if (latestAudit.isPending || history.isPending) {
    return (
      <>
        <PageHead title="Overview" lede="Loading your latest results…" />
        <LoadingCard label="overview" />
      </>
    );
  }

  if (latestAudit.isError || history.isError) {
    const err = latestAudit.error ?? history.error;
    return (
      <>
        <PageHead title="Overview" />
        <Card className="p-6">
          <p className="text-sm font-semibold">Couldn't load your overview.</p>
          <p className="mt-1 text-sm text-muted-foreground">{firestoreErrorMessage(err)}</p>
        </Card>
      </>
    );
  }

  const score = audit?.score;
  const trend = [...audits].reverse().map((a, i) => ({
    week: a.timestamp
      ? new Date(a.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : `#${i + 1}`,
    score: a.score ?? 0,
  }));

  // Weekly to-dos are derived from the latest real audit — never invented.
  const todos = (audit?.issues ?? []).slice(0, 5).map((issue, i) => ({
    id: `${audit?.id ?? "audit"}-${i}`,
    label: issue.type,
    impact: issue.severity,
    area: "Audit",
  }));

  const max = 100;
  const w = 640;
  const h = 140;
  const step = w / Math.max(1, trend.length - 1);
  const line = trend
    .map((d, i) => `${i * step},${h - (Math.min(max, Math.max(0, d.score)) / max) * h}`)
    .join(" ");

  return (
    <>
      <PageHead
        title="Overview"
        lede={
          audit?.timestamp
            ? `Last audit ${new Date(audit.timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric" })}${audit.site_url ? ` · ${audit.site_url}` : ""}`
            : "No audits yet"
        }
        action={<Tag tone="signal">Search Console not connected</Tag>}
      />

      <Card className="overflow-hidden">
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="SEO health score" value={score != null ? String(score) : "—"} />
          <Metric label="AI mention rate" value="—" />
          <Metric label="Clicks" value="—" />
          <Metric label="Impressions" value="—" />
        </div>
      </Card>
      <div className="mt-4">
        <EmptyNote>
          Clicks and impressions need the Search Console integration, which isn't connected yet. AI
          mention tracking isn't enabled on the backend yet (
          <span className="num">track_prompts</span> is still a stub), so those tiles stay empty
          instead of showing estimates.
        </EmptyNote>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Score trend</h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-signal" /> SEO score
              </span>
            </div>
          </div>
          {trend.length >= 2 ? (
            <>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="mt-6 w-full"
                preserveAspectRatio="none"
                height={h}
              >
                <polyline
                  points={line}
                  fill="none"
                  stroke="var(--color-signal)"
                  strokeWidth="2.5"
                />
              </svg>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                {trend.map((d, i) => (
                  <span key={`${d.week}-${i}`}>{d.week}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <EmptyNote>
                {audit ? (
                  <>Only one audit so far — the trend line appears once you've run two or more.</>
                ) : (
                  <>
                    No audits yet.{" "}
                    <Link
                      to="/first-audit"
                      className="font-medium text-signal underline underline-offset-4"
                    >
                      Run your first audit
                    </Link>{" "}
                    to start the trend.
                  </>
                )}
              </EmptyNote>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold">Audits &amp; fixes</h2>
          <p className="num mt-4 text-5xl font-bold">
            {audits.length}
            <span className="text-2xl text-muted-foreground"> run</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {changes.isPending
              ? "Counting shipped fixes…"
              : changes.isError
                ? "Couldn't load shipped fixes."
                : `${fixes.length} fix${fixes.length === 1 ? "" : "es"} shipped via pull request`}
          </p>
          <div className="mt-6">
            <EmptyNote>
              {audit ? (
                <>
                  Latest audit found{" "}
                  <strong>
                    {audit.issues.length} issue{audit.issues.length === 1 ? "" : "s"}
                  </strong>
                  . The top ones are listed below.
                </>
              ) : (
                <>Run your first audit to get a score and a fix list.</>
              )}
            </EmptyNote>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-base font-semibold">This week's to-do list</h2>
          <span className="text-xs text-muted-foreground">{todos.length} items</span>
        </div>
        {todos.length > 0 ? (
          <ul className="divide-y">
            {todos.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-signal)]" />
                <span className="flex-1 text-sm">{t.label}</span>
                <Tag
                  tone={
                    t.impact === "Critical" || t.impact === "High"
                      ? "signal"
                      : t.impact === "Medium"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {t.impact}
                </Tag>
                <span className="w-24 text-right text-xs text-muted-foreground">{t.area}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-6">
            <EmptyNote>
              No open issues.{" "}
              <Link
                to="/first-audit"
                className="font-medium text-signal underline underline-offset-4"
              >
                Run an audit
              </Link>{" "}
              to generate this week's list.
            </EmptyNote>
          </div>
        )}
        <div className="border-t px-6 py-3 text-xs text-muted-foreground">
          A short summary of your score change and top 3 actions lands in your inbox every Monday.{" "}
          <Link
            to="/dashboard/settings"
            className="font-medium text-signal underline underline-offset-4"
          >
            Email settings
          </Link>
        </div>
      </Card>
    </>
  );
}
