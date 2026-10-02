import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";

import { useAuthUser, getOrgId } from "./auth";
import { requireDb } from "./firebase";

/**
 * Typed Firestore access. Field names match the Python backend exactly
 * (snake_case: `org_id`, `site_url`, `pr_number`, ... — see
 * backend-vm/src/firebase_client.py). Every query is scoped by org_id.
 */

// ---------------------------------------------------------------------------
// Types (mirror what the backend worker writes)
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobDoc {
  id: string;
  org_id: string;
  type: string;
  site_id: string;
  status: JobStatus | string;
  created_at: number | null;
  updated_at: number | null;
  completed_at: number | null;
  cost: number;
  data: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
}

/** Backend normalizes audit issues to [{type, severity}] (see skills/audit.py). */
export interface AuditIssue {
  type: string;
  severity: string;
}

export interface AuditDoc {
  id: string;
  org_id: string;
  timestamp: number | null;
  site_url: string | null;
  score: number | null;
  issues: AuditIssue[];
  raw: unknown;
}

export interface AiRunDoc {
  id: string;
  org_id: string;
  timestamp: number | null;
  fields: Record<string, unknown>;
}

export interface ChangeDoc {
  id: string;
  org_id: string;
  timestamp: number | null;
  pr_number: number | null;
  pr_url: string | null;
  /** Backend writes LISTS of strings (see fix_pr.py save_change_log). */
  files_written: string[] | null;
  fixes_applied: string[] | null;
  repo: string | null;
  branch: string | null;
  reason: string | null;
}

/** Frontend-owned site doc. Doc id === org id (the owner's uid) for v1. */
export interface SiteDoc {
  id: string;
  org_id: string;
  url: string;
  brand: string;
  industry: string;
  competitors: string[];
  /** Prompts the user chose to track (frontend-owned field). */
  tracked_prompts: string[];
  updated_at: number | null;
}

export interface PostDoc {
  id: string;
  org_id: string;
  timestamp: number | null;
  fields: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Normalizers (Firestore Timestamp -> millis, tolerant parsing)
// ---------------------------------------------------------------------------

/** Bracket accessor for Firestore DocumentData (index-signature typed). */
function field(data: DocumentData, key: string): unknown {
  return data[key];
}

function fieldString(data: DocumentData, key: string): string {
  const value = field(data, key);
  return typeof value === "string" ? value : "";
}

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const ts = value as Partial<Timestamp> & { seconds?: unknown; nanoseconds?: unknown };
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") {
      return ts.seconds * 1000 + (typeof ts.nanoseconds === "number" ? ts.nanoseconds / 1e6 : 0);
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Backend list-or-absent field: null when absent/wrong shape, else the strings. */
function asStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === "string");
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Coerce whatever the backend stored into AuditIssue[] — never throws. */
export function normalizeIssues(raw: unknown): AuditIssue[] {
  if (!Array.isArray(raw)) return [];
  const out: AuditIssue[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ type: item, severity: "Medium" });
      continue;
    }
    if (typeof item === "object" && item !== null) {
      const rec = item as Record<string, unknown>;
      const type =
        toStringOrNull(rec["type"]) ??
        toStringOrNull(rec["title"]) ??
        toStringOrNull(rec["message"]) ??
        "Untitled issue";
      const severity =
        toStringOrNull(rec["severity"]) ?? toStringOrNull(rec["priority"]) ?? "Medium";
      out.push({ type, severity });
    }
  }
  return out;
}

/** Map a severity/priority string to the dash `Tag` tone. */
export function severityTone(severity: string): "neutral" | "signal" | "ok" | "warn" {
  const s = severity.toLowerCase();
  if (s === "critical") return "signal";
  if (s === "high") return "signal";
  if (s === "medium") return "warn";
  if (s === "low") return "neutral";
  return "neutral";
}

function normalizeJob(id: string, data: DocumentData): JobDoc {
  const result = field(data, "result");
  return {
    id,
    org_id: fieldString(data, "org_id"),
    type: fieldString(data, "type"),
    site_id: fieldString(data, "site_id"),
    status: fieldString(data, "status") || "unknown",
    created_at: toMillis(field(data, "created_at")),
    updated_at: toMillis(field(data, "updated_at")),
    completed_at: toMillis(field(data, "completed_at")),
    cost: toNumberOrNull(field(data, "cost")) ?? 0,
    data: asRecord(field(data, "data")),
    result: result != null ? asRecord(result) : null,
    error: toStringOrNull(field(data, "error")),
  };
}

function normalizeAudit(id: string, data: DocumentData): AuditDoc {
  return {
    id,
    org_id: fieldString(data, "org_id"),
    timestamp: toMillis(field(data, "timestamp")),
    site_url: toStringOrNull(field(data, "site_url")),
    score: toNumberOrNull(field(data, "score")),
    issues: normalizeIssues(field(data, "issues")),
    raw: field(data, "raw") ?? null,
  };
}

function normalizeAiRun(id: string, data: DocumentData): AiRunDoc {
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (key !== "org_id" && key !== "timestamp") fields[key] = data[key];
  }
  return {
    id,
    org_id: fieldString(data, "org_id"),
    timestamp: toMillis(field(data, "timestamp")),
    fields,
  };
}

function normalizeChange(id: string, data: DocumentData): ChangeDoc {
  return {
    id,
    org_id: fieldString(data, "org_id"),
    timestamp: toMillis(field(data, "timestamp")),
    pr_number: toNumberOrNull(field(data, "pr_number")),
    pr_url: toStringOrNull(field(data, "pr_url")),
    files_written: asStringArrayOrNull(field(data, "files_written")),
    fixes_applied: asStringArrayOrNull(field(data, "fixes_applied")),
    repo: toStringOrNull(field(data, "repo")),
    branch: toStringOrNull(field(data, "branch")),
    reason: toStringOrNull(field(data, "reason")),
  };
}

function normalizeSite(id: string, data: DocumentData): SiteDoc {
  return {
    id,
    org_id: fieldString(data, "org_id") || id,
    url: toStringOrNull(field(data, "url")) ?? "",
    brand: toStringOrNull(field(data, "brand")) ?? "",
    industry: toStringOrNull(field(data, "industry")) ?? "",
    competitors: asStringArray(field(data, "competitors")),
    tracked_prompts: asStringArray(field(data, "tracked_prompts") ?? field(data, "prompts")),
    updated_at: toMillis(field(data, "updated_at")),
  };
}

function normalizePost(id: string, data: DocumentData): PostDoc {
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (key !== "org_id" && key !== "timestamp") fields[key] = data[key];
  }
  return {
    id,
    org_id: fieldString(data, "org_id"),
    timestamp: toMillis(field(data, "timestamp")),
    fields,
  };
}

function sortByTimeDesc<T extends { timestamp: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

async function fetchCollection<T>(
  collectionId: string,
  orgId: string,
  normalize: (id: string, data: DocumentData) => T,
): Promise<T[]> {
  const db = requireDb();
  const snap = await getDocs(query(collection(db, collectionId), where("org_id", "==", orgId)));
  return snap.docs.map((d) => normalize(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Org scoping hook
// ---------------------------------------------------------------------------

export function useOrgId(): { orgId: string | null; authLoading: boolean } {
  const { user, loading } = useAuthUser();
  return { orgId: user ? getOrgId(user) : null, authLoading: loading };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchAudits(orgId: string, limit: number): Promise<AuditDoc[]> {
  const rows = await fetchCollection("audits", orgId, normalizeAudit);
  return sortByTimeDesc(rows).slice(0, limit);
}

export function useAudits(limit = 50): UseQueryResult<AuditDoc[], Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<AuditDoc[], Error>({
    queryKey: ["audits", orgId, limit],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    queryFn: () => fetchAudits(orgId ?? "", limit),
  });
}

export function useLatestAudit(): UseQueryResult<AuditDoc | null, Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<AuditDoc[], Error, AuditDoc | null>({
    queryKey: ["audits", orgId, 10],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    queryFn: () => fetchAudits(orgId ?? "", 10),
    select: (rows) => rows[0] ?? null,
  });
}

export function useAiRuns(limit = 50): UseQueryResult<AiRunDoc[], Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<AiRunDoc[], Error>({
    queryKey: ["aiRuns", orgId],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchCollection("aiRuns", orgId ?? "", normalizeAiRun);
      return sortByTimeDesc(rows).slice(0, limit);
    },
  });
}

export function useChanges(limit = 50): UseQueryResult<ChangeDoc[], Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<ChangeDoc[], Error>({
    queryKey: ["changes", orgId],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchCollection("changes", orgId ?? "", normalizeChange);
      return sortByTimeDesc(rows).slice(0, limit);
    },
  });
}

/**
 * `posts` is not written by the backend worker and is not in the provisioned
 * Firestore security rules, so reads may fail with permission-denied. The
 * query surfaces that error to the caller (rendered as an honest "drafts
 * unavailable" note) instead of blanking the page.
 */
export function usePosts(limit = 50): UseQueryResult<PostDoc[], Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<PostDoc[], Error>({
    queryKey: ["posts", orgId],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const rows = await fetchCollection("posts", orgId ?? "", normalizePost);
      return sortByTimeDesc(rows).slice(0, limit);
    },
  });
}

export function useSiteDoc(): UseQueryResult<SiteDoc | null, Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<SiteDoc | null, Error>({
    queryKey: ["site", orgId],
    enabled: !authLoading && !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<SiteDoc | null> => {
      const db = requireDb();
      const id = orgId ?? "";
      const snap = await getDoc(doc(db, "sites", id));
      if (!snap.exists()) return null;
      return normalizeSite(snap.id, snap.data());
    },
  });
}

export interface SiteInput {
  url: string;
  brand: string;
  industry: string;
  competitors: string[];
  tracked_prompts: string[];
}

/** Create/update the org's site doc (doc id === org id). Actually persists. */
export async function saveSiteDoc(orgId: string, input: SiteInput): Promise<void> {
  const db = requireDb();
  await setDoc(
    doc(db, "sites", orgId),
    {
      org_id: orgId,
      url: input.url,
      brand: input.brand,
      industry: input.industry,
      competitors: input.competitors,
      tracked_prompts: input.tracked_prompts,
      updated_at: Date.now(),
    },
    { merge: true },
  );
}

const TERMINAL_JOB_STATUSES = new Set(["completed", "failed"]);

/** Poll a single job doc. Callers decide the timeout; this just refetches. */
export function useJob(
  jobId: string | null,
  pollIntervalMs = 5000,
): UseQueryResult<JobDoc | null, Error> {
  const { orgId, authLoading } = useOrgId();
  return useQuery<JobDoc | null, Error>({
    queryKey: ["job", orgId, jobId],
    enabled: !authLoading && !!orgId && !!jobId,
    refetchInterval: (queryState) => {
      const data = queryState.state.data;
      if (!data) return pollIntervalMs;
      return TERMINAL_JOB_STATUSES.has(data.status) ? false : pollIntervalMs;
    },
    queryFn: async (): Promise<JobDoc | null> => {
      const db = requireDb();
      const snap = await getDoc(doc(db, "jobs", jobId ?? ""));
      if (!snap.exists()) return null;
      return normalizeJob(snap.id, snap.data());
    },
  });
}

export function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_JOB_STATUSES.has(status);
}

/** Friendly text for Firestore errors (permission-denied etc). Never blank. */
export function firestoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("permission-denied")) {
      return "Firestore denied this read (missing or insufficient permissions). Check the security rules in SETUP_CHECKLIST.md and that you are signed in.";
    }
    if (error.message.includes("unavailable")) {
      return "Firestore is unreachable. Check your connection and try again.";
    }
    return error.message;
  }
  return "Something went wrong loading this data.";
}

/** Score from a completed audit job result, or null when absent. */
export function jobResultScore(job: JobDoc | null): number | null {
  if (!job?.result) return null;
  return toNumberOrNull(job.result["score"]);
}
