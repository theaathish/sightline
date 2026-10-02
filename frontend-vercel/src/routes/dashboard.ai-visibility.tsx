import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyNote, PageHead, Tag } from "@/components/dash";
import { firestoreErrorMessage, useAiRuns } from "@/lib/queries";

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
      {
        property: "og:description",
        content: "Prompt-by-prompt results across four AI models, with weekly trends.",
      },
    ],
  }),
  component: AIVisibility,
});

function AIVisibility() {
  const runsQuery = useAiRuns(50);
  const runs = runsQuery.data ?? [];

  if (runsQuery.isPending) {
    return (
      <>
        <PageHead title="AI visibility" lede="Loading prompt runs…" />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Card>
      </>
    );
  }

  if (runsQuery.isError) {
    return (
      <>
        <PageHead title="AI visibility" />
        <Card className="p-6">
          <p className="text-sm font-semibold">Couldn't load AI visibility.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {firestoreErrorMessage(runsQuery.error)}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="AI visibility"
        lede={
          runs.length > 0
            ? `${runs.length} tracked run${runs.length === 1 ? "" : "s"}`
            : "AI tracking is not enabled yet"
        }
        action={runs.length > 0 ? <Tag tone="ok">{runs.length} runs</Tag> : undefined}
      />

      {runs.length === 0 ? (
        <Card className="p-6">
          <EmptyNote>
            AI tracking isn't enabled yet — the backend <span className="num">track_prompts</span>{" "}
            skill is still a stub, so there are no prompt runs to show. Once it's wired, this page
            lists per-prompt results across ChatGPT, Gemini, Claude and Perplexity. Nothing here is
            estimated; the table appears with your first real run.
          </EmptyNote>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {runs.map((run) => {
              const keys = Object.keys(run.fields);
              return (
                <li key={run.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Tag tone="neutral">
                      {run.timestamp ? new Date(run.timestamp).toLocaleDateString() : "undated"}
                    </Tag>
                    <span className="num text-xs text-muted-foreground">{run.id}</span>
                  </div>
                  {keys.length > 0 && (
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {keys.slice(0, 8).map((k) => (
                        <div key={k} className="flex gap-2">
                          <dt className="shrink-0 text-muted-foreground">{k}:</dt>
                          <dd className="truncate">{String(run.fields[k])}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
