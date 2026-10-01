import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand, suggestedPrompts } from "@/lib/mock-data";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your site — Sightline" },
      {
        name: "description",
        content: "Add your website, brand, industry, competitors and the prompts you want tracked across AI models.",
      },
      { property: "og:title", content: "Set up your site — Sightline" },
      { property: "og:description", content: "About two minutes. We pre-fill the prompts for you." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [site, setSite] = useState(brand.site);
  const [name, setName] = useState(brand.name);
  const [industry, setIndustry] = useState(brand.industry);
  const [competitors, setCompetitors] = useState(brand.competitors);
  const [list, setList] = useState(suggestedPrompts);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <FlowShell
      step={2}
      title={stage === 0 ? "Tell us about the site" : "Your 20 tracked prompts"}
      lede={
        stage === 0
          ? "About two minutes. You can change all of this later."
          : "We wrote these from your site and industry. Edit or remove any of them — nothing is locked in."
      }
      aside={
        <Note>
          {stage === 0
            ? "Competitors help us compare how often AI models name you instead of them."
            : "Tracked prompts are the questions we ask ChatGPT, Gemini, Claude and Perplexity every week."}
        </Note>
      }
    >
      {stage === 0 ? (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setStage(1);
          }}
        >
          <Field label="Website URL">
            <Input className="h-11" value={site} onChange={(e) => setSite(e.target.value)} required />
          </Field>
          <Field label="Brand name">
            <Input className="h-11" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Industry">
            <Input className="h-11" value={industry} onChange={(e) => setIndustry(e.target.value)} required />
          </Field>
          <Field label="Competitors (2–3)">
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <Input
                  key={i}
                  className="h-11"
                  value={c}
                  onChange={(e) => {
                    const next = [...competitors];
                    next[i] = e.target.value;
                    setCompetitors(next);
                  }}
                />
              ))}
            </div>
          </Field>
          <Button type="submit" className="h-11 px-6 text-sm font-semibold">
            Generate my prompts
          </Button>
        </form>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              <span className="num font-semibold text-foreground">{list.length}</span> prompts ready
            </span>
            <button
              className="font-medium text-signal underline underline-offset-4"
              onClick={() => setList((l) => [...l, "new prompt to track"])}
            >
              Add prompt
            </button>
          </div>
          <ul className="divide-y rounded-xl border">
            {list.map((p, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="num w-6 text-xs text-muted-foreground">{i + 1}</span>
                {editing === i ? (
                  <Input
                    autoFocus
                    className="h-9"
                    value={p}
                    onChange={(e) => {
                      const next = [...list];
                      next[i] = e.target.value;
                      setList(next);
                    }}
                    onBlur={() => setEditing(null)}
                  />
                ) : (
                  <button className="flex-1 text-left text-sm" onClick={() => setEditing(i)}>
                    {p}
                  </button>
                )}
                <button
                  className="text-xs text-muted-foreground hover:text-signal"
                  onClick={() => setList(list.filter((_, j) => j !== i))}
                  aria-label="Remove prompt"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Button
              className="h-11 px-6 text-sm font-semibold"
              onClick={() => navigate({ to: "/connect-google" })}
            >
              Looks good, continue
            </Button>
            <Button variant="ghost" className="h-11 text-sm" onClick={() => setStage(0)}>
              Back
            </Button>
          </div>
        </div>
      )}
    </FlowShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
