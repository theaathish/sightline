import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { getIdToken, getOrgId, useAuthUser } from "@/lib/auth";
import { submitJobFn } from "@/lib/jobs-server";
import {
  firestoreErrorMessage,
  isTerminalJobStatus,
  jobResultScore,
  useJob,
  useLatestAudit,
  useSiteDoc,
} from "@/lib/queries";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/first-audit")({
  beforeLoad: async ({ context, location }) => {
    await requireAuth(context.auth, location.href);
  },
  head: () => ({
    meta: [
      { title: "Running your first audit — Sightline" },
      {
        name: "description",
        content: "Your first SEO and AI visibility audit runs in minutes and shows your score.",
      },
      { property: "og:title", content: "Running your first audit — Sightline" },
      { property: "og:description", content: "Watch the crawl, then see your first score." },
    ],
  }),
  component: FirstAudit,
});

/** Stop polling with a timeout state after this long without a terminal job. */
const JOB_TIMEOUT_MS = 10 * 60 * 1000;
/** Poll the job doc on this cadence. */
const JOB_POLL_MS = 5000;

type Phase =
  | { name: "ready" }
  | { name: "submitting" }
  | { name: "running"; jobId: string; startedAt: number }
  | { name: "timeout"; jobId: string }
  | { name: "submit-error"; message: string };

const pipelineStages = [
  "Queuing the audit job",
  "Crawling pages",
  "Checking sitemap and robots.txt",
  "Reading meta tags and schema",
  "Measuring page speed",
  "Scoring and ranking issues",
];

function FirstAudit() {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const siteQuery = useSiteDoc();
  const latestAudit = useLatestAudit();
  const [phase, setPhase] = useState<Phase>({ name: "ready" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const submitAttempted = useRef(false);

  const runningJobId = phase.name === "running" ? phase.jobId : null;
  const jobQuery = useJob(runningJobId, JOB_POLL_MS);
  const job = jobQuery.data ?? null;

  // Elapsed-time ticker while a job is running.
  useEffect(() => {
    if (phase.name !== "running") return;
    const startedAt = phase.startedAt;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Timeout + completion handling.
  useEffect(() => {
    if (phase.name !== "running") return;
    if (job && isTerminalJobStatus(job.status)) {
      void queryClient.invalidateQueries({ queryKey: ["audits"] });
      void queryClient.invalidateQueries({ queryKey: ["job"] });
      return;
    }
    if (Date.now() - phase.startedAt > JOB_TIMEOUT_MS) {
      setPhase({ name: "timeout", jobId: phase.jobId });
    }
  }, [phase, job, queryClient]);

  const siteUrl = siteQuery.data?.url?.trim() || "";

  const handleStart = async () => {
    if (!user || submitAttempted.current) return;
    submitAttempted.current = true;
    setPhase({ name: "submitting" });
    try {
      const idToken = await getIdToken(true);
      if (!idToken) throw new Error("You must be signed in to submit a job.");
      const result = await submitJobFn({
        data: {
          type: "audit",
          site_id: getOrgId(user),
          data: siteUrl ? { site_url: siteUrl } : {},
          idToken,
        },
      });
      setPhase({ name: "running", jobId: result.job_id, startedAt: Date.now() });
      if (result.capUnchecked) {
        toast.message(
          "Note: the per-org job cap could not be verified, so it was not enforced for this job.",
        );
      }
      setElapsedMs(0);
    } catch (err) {
      submitAttempted.current = false;
      const message = err instanceof Error ? err.message : "Couldn't start the audit.";
      setPhase({ name: "submit-error", message });
      toast.error(message);
    }
  };

  const done = phase.name === "running" && job != null && isTerminalJobStatus(job.status);
  const failed = done && job?.status === "failed";
  const score = job ? jobResultScore(job) : null;
  const auditScore = latestAudit.data?.score ?? null;
  const displayScore = score ?? (done && !failed ? auditScore : null);
  const issuesCount = latestAudit.data?.issues.length ?? 0;

  const elapsedSecs = Math.floor(elapsedMs / 1000);
  const elapsedLabel = `${Math.floor(elapsedSecs / 60)}:${String(elapsedSecs % 60).padStart(2, "0")}`;

  const renderBody = () => {
    if (siteQuery.isPending) {
      return (
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Loading your site…</p>
        </div>
      );
    }
    if (siteQuery.isError) {
      return (
        <div className="rounded-xl border p-6">
          <p className="text-sm font-semibold">Couldn't load your site.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {firestoreErrorMessage(siteQuery.error)}
          </p>
        </div>
      );
    }
    if (!siteUrl) {
      return (
        <div className="rounded-xl border p-6">
          <p className="font-display text-lg font-semibold">Tell us which site to audit first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We need your website URL before we can crawl it.
          </p>
          <div className="mt-6">
            <Button asChild className="h-11 px-6 text-sm font-semibold">
              <Link to="/onboarding">Add your site</Link>
            </Button>
          </div>
        </div>
      );
    }

    if (phase.name === "ready" || phase.name === "submitting" || phase.name === "submit-error") {
      return (
        <div className="rounded-xl border p-6">
          <p className="font-display text-lg font-semibold">Ready to audit {siteUrl}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This usually takes two to three minutes. You can leave the page — your results wait on
            the dashboard.
          </p>
          {phase.name === "submit-error" && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-signal-soft px-3 py-2 text-sm text-signal"
            >
              {phase.message}
            </p>
          )}
          <div className="mt-6">
            <Button
              className="h-11 px-6 text-sm font-semibold"
              disabled={phase.name === "submitting"}
              onClick={handleStart}
            >
              {phase.name === "submitting" ? "Queuing…" : "Run my first audit"}
            </Button>
          </div>
        </div>
      );
    }

    if (phase.name === "timeout") {
      return (
        <div className="rounded-xl border p-6">
          <p className="font-display text-lg font-semibold">Still working on it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Job <span className="num">{phase.jobId}</span> hasn't finished after 10 minutes. It may
            still complete — check the dashboard in a bit.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-11 px-6 text-sm font-semibold">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
            <Button
              variant="ghost"
              className="h-11 text-sm"
              onClick={() => setPhase({ name: "ready" })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    // Running (or done): status comes from the real job doc.
    if (jobQuery.isError) {
      return (
        <div className="rounded-xl border p-6">
          <p className="text-sm font-semibold">Lost track of the audit job.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {firestoreErrorMessage(jobQuery.error)}
          </p>
        </div>
      );
    }

    if (done && failed) {
      return (
        <div className="rounded-xl border p-6">
          <p className="font-display text-lg font-semibold">The audit failed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {job?.error ?? "The worker reported a failure without details."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="h-11 px-6 text-sm font-semibold"
              onClick={() => {
                submitAttempted.current = false;
                setPhase({ name: "ready" });
              }}
            >
              Try again
            </Button>
            <Button asChild variant="ghost" className="h-11 text-sm">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      );
    }

    if (done) {
      return (
        <div className="rounded-xl border">
          <div className="flex flex-wrap items-end gap-10 border-b p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                SEO health score
              </p>
              <p className="num mt-2 text-7xl font-bold leading-none text-signal">
                {displayScore != null ? displayScore : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Issues found
              </p>
              <p className="num mt-2 text-7xl font-bold leading-none">{issuesCount}</p>
            </div>
          </div>
          {displayScore == null && (
            <p className="border-b px-8 py-3 text-sm text-muted-foreground">
              The job finished but didn't report a score yet — it may still be writing results.
              Refresh the dashboard in a moment.
            </p>
          )}
          <div className="p-6">
            <Button asChild className="h-11 px-6 text-sm font-semibold">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      );
    }

    const status = job?.status ?? "queued";
    const activeStage = status === "processing" ? 1 : 0;
    return (
      <div className="rounded-xl border p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.12em]">
            {status === "processing" ? "Processing" : "Queued"}
          </span>
          <span className="num text-3xl font-bold text-signal">{elapsedLabel}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Live status from job{" "}
          <span className="num">{phase.name === "running" ? phase.jobId : ""}</span> · checking
          every 5s
        </p>
        <ul className="mt-6 space-y-2.5 text-sm">
          {pipelineStages.map((t, i) => (
            <li
              key={t}
              className={`flex items-center gap-3 ${
                i < activeStage
                  ? "text-muted-foreground"
                  : i === activeStage
                    ? "text-foreground"
                    : "text-muted-foreground/50"
              }`}
            >
              <span className={`num w-4 text-xs ${i < activeStage ? "text-ok" : ""}`}>
                {i < activeStage ? "✓" : i === activeStage ? "•" : ""}
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <FlowShell
      step={4}
      title={done && !failed ? "Your first score" : "Running your first audit"}
      lede={
        done && !failed
          ? "That's your baseline. Everything from here is measured against it."
          : "This usually takes two to three minutes. You can leave the page — we'll email you when it's done."
      }
      aside={
        <Note>
          AI visibility needs a week of runs before trend lines appear. Your next run is{" "}
          <strong>Monday</strong>.
        </Note>
      }
    >
      {renderBody()}
    </FlowShell>
  );
}
