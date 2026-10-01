import { createFileRoute, Link } from "@tanstack/react-router";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/connect-google")({
  head: () => ({
    meta: [
      { title: "Connect Search Console — Sightline" },
      {
        name: "description",
        content: "Optional: connect Google Search Console for clicks and impressions. The dashboard works without it.",
      },
      { property: "og:title", content: "Connect Search Console — Sightline" },
      { property: "og:description", content: "Optional step. Skip it and connect later from Settings." },
    ],
  }),
  component: ConnectGoogle,
});

function ConnectGoogle() {
  return (
    <FlowShell
      step={3}
      title="Connect Google Search Console"
      lede="Optional. It adds real clicks and impressions to your dashboard — everything else works without it."
      aside={<Note>You can connect this any time from Settings → Connected accounts.</Note>}
    >
      <div className="rounded-xl border">
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <Panel
            title="With Search Console"
            items={["Real clicks and impressions", "Query-level wins and losses", "Indexing issues surfaced in Audit"]}
            highlight
          />
          <Panel
            title="Without it"
            items={["SEO health score", "AI visibility across 4 models", "Audit issues and blog drafts"]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 p-6">
          <Button asChild className="h-11 px-6 text-sm font-semibold">
            <Link to="/first-audit">Connect Google</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 text-sm">
            <Link to="/first-audit">Skip for now</Link>
          </Button>
        </div>
      </div>
    </FlowShell>
  );
}

function Panel({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`p-6 ${highlight ? "bg-signal-soft" : "bg-card"}`}>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.12em]">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className={highlight ? "text-signal" : "text-foreground"}>—</span>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
