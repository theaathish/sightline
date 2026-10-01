import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, EmptyNote, PageHead, Tag } from "@/components/dash";
import { Button } from "@/components/ui/button";
import { calendar, drafts as seed, plan } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/content")({
  head: () => ({
    meta: [
      { title: "Content — Sightline" },
      {
        name: "description",
        content: "Review, approve and publish AI-written blog drafts, and see what's scheduled this month.",
      },
      { property: "og:title", content: "Content — Sightline" },
      { property: "og:description", content: "Drafts waiting for approval plus your publishing calendar." },
    ],
  }),
  component: Content,
});

function Content() {
  const [drafts, setDrafts] = useState(seed);
  const [editing, setEditing] = useState<number | null>(null);
  const atLimit = plan.draftsUsed >= plan.draftsLimit;

  const set = (id: number, status: (typeof seed)[number]["status"]) =>
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));

  return (
    <>
      <PageHead
        title="Content"
        lede="3 drafts waiting for your approval"
        action={
          <Button className="h-9 text-sm font-semibold" disabled={atLimit}>
            {atLimit ? "Draft limit reached" : "Write a new draft"}
          </Button>
        }
      />

      {atLimit && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-l-2 border-l-signal bg-signal-soft px-5 py-4">
          <div>
            <p className="text-sm font-semibold">
              You've used {plan.draftsUsed} of {plan.draftsLimit} drafts on the {plan.name} plan
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Scale gives you 30 drafts a month and 100 tracked prompts.
            </p>
          </div>
          <Button className="h-9 text-sm font-semibold">Upgrade to Scale</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {drafts.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2">
                    <Tag
                      tone={
                        d.status === "Published" ? "ok" : d.status === "Approved" ? "warn" : "signal"
                      }
                    >
                      {d.status}
                    </Tag>
                    <span className="num text-xs text-muted-foreground">
                      {d.words} words · {d.updated}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold leading-snug">{d.title}</h3>
                  {editing === d.id ? (
                    <textarea
                      className="mt-3 w-full rounded-lg border bg-surface p-3 text-sm"
                      rows={4}
                      defaultValue={d.excerpt}
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">{d.excerpt}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setEditing(editing === d.id ? null : d.id)}
                >
                  {editing === d.id ? "Done editing" : "Edit"}
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={d.status !== "Waiting for approval"}
                  onClick={() => set(d.id, "Approved")}
                >
                  Approve
                </Button>
                <Button
                  className="h-9 text-xs font-semibold"
                  disabled={d.status === "Published"}
                  onClick={() => set(d.id, "Published")}
                >
                  Publish
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold">September</h2>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
              const item = calendar.find((c) => c.day === day);
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-md border p-1 text-left ${
                    item
                      ? item.state === "scheduled"
                        ? "border-signal bg-signal-soft"
                        : "border-dashed"
                      : "border-transparent"
                  }`}
                >
                  <span className="num text-[10px] text-muted-foreground">{day}</span>
                  {item && <span className="block h-1 w-full rounded-full bg-signal/70" />}
                </div>
              );
            })}
          </div>
          <ul className="mt-4 space-y-2 border-t pt-4 text-xs">
            {calendar.map((c) => (
              <li key={c.day} className="flex gap-2">
                <span className="num w-6 text-muted-foreground">{c.day}</span>
                <span className="flex-1">{c.title}</span>
                <span className={c.state === "scheduled" ? "text-signal" : "text-muted-foreground"}>
                  {c.state}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <EmptyNote>Nothing is published without your approval.</EmptyNote>
          </div>
        </Card>
      </div>
    </>
  );
}
