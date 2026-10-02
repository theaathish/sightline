import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, EmptyNote, PageHead } from "@/components/dash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOrgId, useAuthUser } from "@/lib/auth";
import { suggestedPrompts } from "@/lib/mock-data";
import { firestoreErrorMessage, saveSiteDoc, useSiteDoc } from "@/lib/queries";

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
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const siteQuery = useSiteDoc();
  const site = siteQuery.data;

  const [url, setUrl] = useState("");
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [tracked, setTracked] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Seed the form from the persisted site doc exactly once.
  useEffect(() => {
    if (hydrated || !siteQuery.data) return;
    const doc = siteQuery.data;
    setUrl(doc.url);
    setBrand(doc.brand);
    setIndustry(doc.industry);
    setCompetitors(doc.competitors);
    setTracked(doc.tracked_prompts);
    setHydrated(true);
  }, [hydrated, siteQuery.data]);

  // New orgs (no site doc yet) start with empty fields, not fake data.
  useEffect(() => {
    if (hydrated || siteQuery.isPending || siteQuery.data) return;
    if (siteQuery.isSuccess && siteQuery.data === null) setHydrated(true);
  }, [hydrated, siteQuery.isPending, siteQuery.isSuccess, siteQuery.data]);

  const persist = async (patch: {
    url: string;
    brand: string;
    industry: string;
    competitors: string[];
    tracked_prompts: string[];
  }) => {
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    setSaving(true);
    try {
      await saveSiteDoc(getOrgId(user), patch);
      void queryClient.invalidateQueries({ queryKey: ["site"] });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  const saveSite = () => persist({ url, brand, industry, competitors, tracked_prompts: tracked });

  const savePrompts = (next: string[]) => {
    setTracked(next);
    void persist({ url, brand, industry, competitors, tracked_prompts: next });
  };

  if (siteQuery.isPending || !hydrated) {
    return (
      <>
        <PageHead title="Settings" lede="Loading your settings…" />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Card>
      </>
    );
  }

  if (siteQuery.isError) {
    return (
      <>
        <PageHead title="Settings" />
        <Card className="p-6">
          <p className="text-sm font-semibold">Couldn't load your settings.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {firestoreErrorMessage(siteQuery.error)}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead title="Settings" lede={brand || site?.url || user?.email || ""} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Site">
          <div className="space-y-4 p-5">
            {!site && (
              <EmptyNote>
                No site saved yet — fill this in (or finish onboarding) and it persists to your
                workspace.
              </EmptyNote>
            )}
            <div className="space-y-2">
              <Label htmlFor="site-url">Website URL</Label>
              <Input
                id="site-url"
                className="h-10"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-brand">Brand name</Label>
              <Input
                id="site-brand"
                className="h-10"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Acme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-industry">Industry</Label>
              <Input
                id="site-industry"
                className="h-10"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="B2B ecommerce"
              />
            </div>
            <div className="space-y-2">
              <Label>Competitors</Label>
              <div className="space-y-2">
                {competitors.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="h-10"
                      value={c}
                      onChange={(e) => {
                        const next = [...competitors];
                        next[i] = e.target.value;
                        setCompetitors(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      className="h-10 text-xs"
                      onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-1 h-9 text-xs"
                onClick={() => setCompetitors([...competitors, ""])}
              >
                Add competitor
              </Button>
            </div>
            <Button className="h-10 text-sm font-semibold" disabled={saving} onClick={saveSite}>
              {saving ? "Saving…" : "Save site"}
            </Button>
          </div>
        </Section>

        <Section title={`Tracked prompts (${tracked.length})`}>
          <div className="p-5">
            {tracked.length === 0 && (
              <div className="mb-3">
                <EmptyNote>
                  No prompts tracked yet.{" "}
                  <button
                    className="font-medium text-signal underline underline-offset-4"
                    onClick={() => savePrompts([...suggestedPrompts.slice(0, 20)])}
                  >
                    Start from our suggestion template
                  </button>{" "}
                  (a static starting list — edit freely, it saves to your workspace).
                </EmptyNote>
              </div>
            )}
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {tracked.map((p, i) => (
                <li
                  key={`${i}-${p}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
                >
                  <span className="num w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{p}</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-signal"
                    onClick={() => savePrompts(tracked.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = newPrompt.trim();
                if (!value) return;
                setNewPrompt("");
                void savePrompts([...tracked, value]);
              }}
            >
              <Input
                className="h-9"
                placeholder="Add a prompt to track…"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
              />
              <Button type="submit" variant="outline" className="h-9 text-xs" disabled={saving}>
                Add
              </Button>
            </form>
          </div>
        </Section>

        <Section title="Connected accounts">
          <ul className="divide-y">
            <Account
              name="Google Search Console"
              state="Not connected"
              action="Connect"
              href="/connect-google"
            />
            <Account name="GitHub" state="Not connected" action="Connect" upcoming />
          </ul>
        </Section>

        <Section title="Billing and plan">
          <div className="p-5">
            <EmptyNote>
              Plan and billing details aren't available in this version — nothing is shown instead
              of a placeholder plan.
            </EmptyNote>
          </div>
        </Section>

        <Section title="Team members">
          <div className="p-5">
            <EmptyNote>
              Team management isn't available yet — this workspace has one owner (you).
            </EmptyNote>
          </div>
        </Section>

        <Section title="Weekly email">
          <div className="p-5">
            <p className="text-sm text-muted-foreground">
              Every Monday we send your score change and the top 3 actions for the week.
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-[var(--color-signal)]"
                onChange={() => toast.message("Weekly email preferences aren't wired yet.")}
              />
              Send the weekly summary{user?.email ? ` to ${user.email}` : ""}
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
  href,
  upcoming,
}: {
  name: string;
  state: string;
  action: string;
  href?: string;
  upcoming?: boolean;
}) {
  const handleClick = () => {
    toast.message(`${name} integration isn't available yet.`);
  };
  if (href && !upcoming) {
    return (
      <li className="flex items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{state}</p>
        </div>
        <Button variant="default" className="h-9 text-xs" asChild>
          <Link to={href}>{action}</Link>
        </Button>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{state}</p>
      </div>
      {href && !upcoming ? (
        <Button variant="default" className="h-9 text-xs" asChild>
          <Link to={href}>{action}</Link>
        </Button>
      ) : (
        <Button variant="ghost" className="h-9 text-xs" onClick={handleClick}>
          {action}
        </Button>
      )}
    </li>
  );
}
