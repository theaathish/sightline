import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOrgId, useAuthUser } from "@/lib/auth";
import { suggestedPrompts } from "@/lib/mock-data";
import { saveSiteDoc, useSiteDoc } from "@/lib/queries";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context, location }) => {
    await requireAuth(context.auth, location.href);
  },
  head: () => ({
    meta: [
      { title: "Set up your site — Sightline" },
      {
        name: "description",
        content:
          "Add your website, brand, industry, competitors and the prompts you want tracked across AI models.",
      },
      { property: "og:title", content: "Set up your site — Sightline" },
      {
        property: "og:description",
        content: "About two minutes. We pre-fill the prompts for you.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const siteQuery = useSiteDoc();
  const existing = siteQuery.data;

  // The suggestion template is static reference content; the user's own list
  // (persisted to their site doc) starts as a copy they can edit freely.
  const [stage, setStage] = useState(0);
  const [site, setSite] = useState(existing?.url ?? "");
  const [name, setName] = useState(existing?.brand ?? "");
  const [industry, setIndustry] = useState(existing?.industry ?? "");
  const [competitors, setCompetitors] = useState<string[]>(
    existing && existing.competitors.length > 0 ? existing.competitors : ["", ""],
  );
  const [list, setList] = useState<string[]>(
    existing && existing.tracked_prompts.length > 0
      ? existing.tracked_prompts
      : [...suggestedPrompts.slice(0, 20)],
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    setSaving(true);
    try {
      await saveSiteDoc(getOrgId(user), {
        url: site.trim(),
        brand: name.trim(),
        industry: industry.trim(),
        competitors: competitors.map((c) => c.trim()).filter((c) => c !== ""),
        tracked_prompts: list.map((p) => p.trim()).filter((p) => p !== ""),
      });
      void navigate({ to: "/first-audit" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your site.");
      setSaving(false);
    }
  };

  return (
    <FlowShell
      step={2}
      title={stage === 0 ? "Tell us about the site" : "Your tracked prompts"}
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
            <Input
              className="h-11"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </Field>
          <Field label="Brand name">
            <Input
              className="h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme"
              required
            />
          </Field>
          <Field label="Industry">
            <Input
              className="h-11"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="B2B ecommerce"
              required
            />
          </Field>
          <Field label="Competitors (2–3)">
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <Input
                  key={i}
                  className="h-11"
                  value={c}
                  placeholder="competitor.com"
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
              disabled={saving}
              onClick={handleFinish}
            >
              {saving ? "Saving…" : "Looks good, continue"}
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
