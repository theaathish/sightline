import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, EmptyNote, PageHead, Sparkline, Tag } from "@/components/dash";
import { models, prompts, type PromptResult } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/ai-visibility")({
  head: () => ({
    meta: [
      { title: "AI visibility — Sightline" },
      {
        name: "description",
        content:
          "See which of your tracked prompts ChatGPT, Gemini, Claude and Perplexity answer with your brand, and which sources they cite.",
      },
      { property: "og:title", content: "AI visibility — Sightline" },
      { property: "og:description", content: "Prompt-by-prompt results across four AI models, with weekly trends." },
    ],
  }),
  component: AIVisibility,
});

function AIVisibility() {
  const [open, setOpen] = useState<number | null>(prompts[0]?.id ?? null);

  return (
    <>
      <PageHead
        title="AI visibility"
        lede="20 prompts · 4 models · last run Monday, next run Monday"
        action={<Tag tone="signal">31% mention rate</Tag>}
      />

      <div className="mb-4">
        <EmptyNote>
          Trend lines fill in as weekly runs stack up. You're on week 7 — earlier prompts show a full line, newly
          added ones start flat. <strong>Next run: Monday.</strong>
        </EmptyNote>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-6 py-3 font-medium">Prompt</th>
              {models.map((m) => (
                <th key={m} className="px-3 py-3 text-center font-medium">
                  {m}
                </th>
              ))}
              <th className="px-6 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {prompts.map((p) => (
              <Row key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Row({ p, open, onToggle }: { p: PromptResult; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-surface" onClick={onToggle}>
        <td className="px-6 py-3.5">
          <span className="font-medium">{p.prompt}</span>
        </td>
        {models.map((m) => {
          const r = p.results[m];
          return (
            <td key={m} className="px-3 py-3.5 text-center">
              {r.mentioned ? (
                <span className="num inline-flex h-7 min-w-7 items-center justify-center rounded bg-signal-soft px-2 text-xs font-bold text-signal">
                  #{r.position}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </td>
          );
        })}
        <td className="px-6 py-3.5">
          <div className="flex justify-end">
            <Sparkline data={p.trend} />
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-surface">
          <td colSpan={models.length + 2} className="px-6 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Sources AI cited</p>
                {p.sources.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {p.sources.map((s) => (
                      <li key={s} className="num text-xs">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No model mentioned you here yet. A comparison post targeting this phrase is the usual fix.
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Weekly mentions (of 4)</p>
                <div className="mt-2 flex items-end gap-1.5">
                  {p.trend.map((v, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-5 rounded-sm bg-signal"
                        style={{ height: `${Math.max(2, v * 12)}px`, opacity: v ? 1 : 0.15 }}
                      />
                      <span className="num text-[10px] text-muted-foreground">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
