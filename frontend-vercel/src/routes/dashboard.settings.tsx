import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHead, Tag } from "@/components/dash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand, plan, suggestedPrompts, team } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sightline" },
      {
        name: "description",
        content: "Connected accounts, tracked prompts, competitors, billing and team members.",
      },
      { property: "og:title", content: "Settings — Sightline" },
      { property: "og:description", content: "Manage connections, prompts, plan and teammates." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [tracked, setTracked] = useState(suggestedPrompts);
  const [competitors, setCompetitors] = useState(brand.competitors);
  const atLimit = tracked.length >= plan.promptsLimit;

  return (
    <>
      <PageHead title="Settings" lede={`${brand.name} · ${brand.site}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Connected accounts">
          <ul className="divide-y">
            <Account name="Google Search Console" state="Not connected" action="Connect" />
            <Account name="GitHub" state="Connected · northwind/site" action="Disconnect" connected />
          </ul>
        </Section>

        <Section title="Billing and plan">
          <div className="p-5">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-display text-lg font-semibold">{plan.name}</p>
                <p className="num text-sm text-muted-foreground">{plan.price}</p>
              </div>
              <Tag tone="signal">Renews {plan.renews}</Tag>
            </div>
            <div className="mt-5 space-y-4">
              <Usage label="Tracked prompts" used={tracked.length} limit={plan.promptsLimit} />
              <Usage label="Blog drafts this month" used={plan.draftsUsed} limit={plan.draftsLimit} />
            </div>
            <div className="mt-5 rounded-lg border border-l-2 border-l-signal bg-signal-soft p-4">
              <p className="text-sm font-semibold">Close to your limits</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scale raises you to 100 prompts and 30 drafts a month, for $199.
              </p>
              <Button className="mt-3 h-9 text-xs font-semibold">Upgrade to Scale</Button>
            </div>
          </div>
        </Section>

        <Section title={`Tracked prompts (${tracked.length}/${plan.promptsLimit})`}>
          <div className="p-5">
            {atLimit && (
              <p className="mb-3 rounded-md bg-signal-soft px-3 py-2 text-xs font-medium text-signal">
                You've hit your prompt limit. Remove one, or upgrade to track more.
              </p>
            )}
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {tracked.map((p, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface">
                  <span className="num w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{p}</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-signal"
                    onClick={() => setTracked(tracked.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-4 h-9 text-xs" disabled={atLimit}>
              Add prompt
            </Button>
          </div>
        </Section>

        <Section title="Competitors">
          <div className="space-y-3 p-5">
            {competitors.map((c, i) => (
              <Input
                key={i}
                className="h-10"
                value={c}
                onChange={(e) => {
                  const next = [...competitors];
                  next[i] = e.target.value;
                  setCompetitors(next);
                }}
              />
            ))}
            <Button variant="outline" className="h-9 text-xs" onClick={() => setCompetitors([...competitors, ""])}>
              Add competitor
            </Button>
          </div>
        </Section>

        <Section title="Team members">
          <ul className="divide-y">
            {team.map((t) => (
              <li key={t.email} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {t.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                </div>
                <Tag>{t.role}</Tag>
              </li>
            ))}
          </ul>
          <div className="border-t p-5">
            <Button variant="outline" className="h-9 text-xs">
              Invite teammate
            </Button>
          </div>
        </Section>

        <Section title="Weekly email">
          <div className="p-5">
            <p className="text-sm text-muted-foreground">
              Every Monday we send your score change and the top 3 actions for the week.
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--color-signal)]" />
              Send the weekly summary to aathish@northwind-supply.com
            </label>
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b px-5 py-3.5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function Account({
  name,
  state,
  action,
  connected,
}: {
  name: string;
  state: string;
  action: string;
  connected?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{state}</p>
      </div>
      <Button variant={connected ? "ghost" : "default"} className="h-9 text-xs">
        {action}
      </Button>
    </li>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-semibold">
          {used}/{limit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${pct >= 80 ? "bg-signal" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
