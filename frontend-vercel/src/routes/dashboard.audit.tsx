import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, EmptyNote, PageHead, Tag } from "@/components/dash";
import { Button } from "@/components/ui/button";
import { getIdToken, getOrgId, useAuthUser } from "@/lib/auth";
import { submitJobFn } from "@/lib/jobs-server";
import {
  firestoreErrorMessage,
  severityTone,
  useAudits,
  useSiteDoc,
  type AuditIssue,
} from "@/lib/queries";

export const Route = createFileRoute("/dashboard/audit")({
  head: () => ({
    meta: [
      { title: "Audit — Sightline" },
      {
        name: "description",
        content:
          "Sitemap, robots.txt, meta tags, schema and speed issues sorted by priority, each with a fix.",
      },
      { property: "og:title", content: "Audit — Sightline" },
      {
        property: "og:description",
        content: "Every issue found on your site, ranked by what to fix first.",
      },
    ],
  }),
  component: Audit,
});

const severityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function rank(severity: string): number {
  return severityRank[severity.toLowerCase()] ?? 4;
}

function Audit() {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const auditsQuery = useAudits(10);
  const siteQuery = useSiteDoc();
  const [filter, setFilter] = useState<string>("All");
  const [open, setOpen] = useState<AuditIssue | null>(null);
  const [rerunning, setRerunning] = useState(false);

  const audits = auditsQuery.data ?? [];
  const latest = audits[0] ?? null;
  const issues = latest?.issues ?? [];
  const areas = ["All", ...Array.from(new Set(issues.map((i) => i.severity)))];
  const list = issues
    .filter((i) => filter === "All" || i.severity === filter)
    .slice()
    .sort((a, b) => rank(a.severity) - rank(b.severity));

  const handleRerun = async () => {
    if (!user) return;
    setRerunning(true);
    try {
      const idToken = await getIdToken(true);
      if (!idToken) throw new Error("You must be signed in to submit a job.");
      const siteId = getOrgId(user);
      const siteUrl = siteQuery.data?.url || undefined;
      const result = await submitJobFn({
        data: {
          type: "audit",
          site_id: siteId,
          data: siteUrl ? { site_url: siteUrl } : {},
          idToken,
        },
      });
      toast.success(`Audit queued (job ${result.job_id}). Results appear here when it finishes.`);
      if (result.capUnchecked) {
        toast.message(
          "Note: the per-org job cap could not be verified, so it was not enforced for this job.",
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["audits"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't queue the audit.");
    } finally {
      setRerunning(false);
    }
  };

  if (auditsQuery.isPending) {
    return (
      <>
        <PageHead title="Audit" lede="Loading your latest audit…" />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading issues…</p>
        </Card>
      </>
    );
  }

  if (auditsQuery.isError) {
    return (
      <>
        <PageHead title="Audit" />
        <Card className="p-6">
          <p className="text-sm font-semibold">Couldn't load your audits.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {firestoreErrorMessage(auditsQuery.error)}
          </p>
        </Card>
      </>
    );
  }

  if (!latest) {
    return (
      <>
        <PageHead title="Audit" lede="No audits yet" />
        <Card className="p-6">
          <EmptyNote>
            You haven't run an audit yet.{" "}
            <Link
              to="/first-audit"
              className="font-medium text-signal underline underline-offset-4"
            >
              Run your first audit
            </Link>{" "}
            and the issues will show up here, ranked by severity.
          </EmptyNote>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Audit"
        lede={`${issues.length} issue${issues.length === 1 ? "" : "s"} found${latest.site_url ? ` on ${latest.site_url}` : ""}${latest.timestamp ? ` · last run ${new Date(latest.timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric" })}` : ""}`}
        action={
          <Button
            variant="outline"
            className="h-9 text-sm"
            disabled={rerunning}
            onClick={handleRerun}
          >
            {rerunning ? "Queuing…" : "Re-run audit"}
          </Button>
        }
      />

      {audits.length > 1 && (
        <p className="mb-4 text-xs text-muted-foreground">
          Showing the latest of {audits.length} audits.
        </p>
      )}

      {issues.length === 0 ? (
        <Card className="p-6">
          <EmptyNote>Your latest audit found no issues. Nice work.</EmptyNote>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {areas.map((a) => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === a
                    ? "border-ink bg-ink text-background"
                    : "text-muted-foreground hover:border-ink"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <Card>
            <ul className="divide-y">
              {list.map((issue, i) => (
                <li
                  key={`${issue.type}-${i}`}
                  className="flex flex-wrap items-center gap-4 px-6 py-4"
                >
                  <Tag tone={severityTone(issue.severity)}>{issue.severity}</Tag>
                  <div className="min-w-[200px] flex-1">
                    <p className="text-sm font-medium">{issue.type}</p>
                  </div>
                  <Button variant="outline" className="h-9 text-xs" onClick={() => setOpen(issue)}>
                    Details
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-xl border bg-background p-6 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Tag tone={severityTone(open.severity)}>{open.severity}</Tag>
            <h2 className="mt-3 font-display text-xl font-bold">{open.type}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Found in your latest audit{latest.site_url ? ` of ${latest.site_url}` : ""}. The
              backend stores the issue type and severity; step-by-step fixes land with the fix_pr
              skill's pull requests (see Content → shipped fixes).
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="h-10 text-sm" onClick={() => setOpen(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
