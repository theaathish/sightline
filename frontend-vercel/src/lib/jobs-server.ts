import { createServerFn } from "@tanstack/react-start";

import { verifyFirebaseIdToken } from "./server-verify-token";

/**
 * Server-only job submission.
 *
 * The browser NEVER sees the webhook shared secret and NEVER talks to the VM
 * directly. It calls `submitJobFn` with its Firebase ID token; this handler
 * (which runs only on the TanStack Start server):
 *   1. verifies the ID token and derives org_id = uid,
 *   2. enforces a per-org cap on active (queued/processing) jobs,
 *   3. signs the raw JSON body with HMAC-SHA256 using the server-only
 *      `WEBHOOK_SECRET` env var and forwards it to the VM webhook.
 *
 * Secrets: `WEBHOOK_SECRET` and `WEBHOOK_URL` are read from server-side env
 * (process.env). The public Firebase project id falls back to the
 * non-secret `VITE_FIREBASE_PROJECT_ID`.
 */

/**
 * Max active (queued + processing) jobs per org. A simple abuse/double-click
 * guard — the VM worker is single-tenant-minded and expensive per run.
 */
export const MAX_QUEUED_JOBS_PER_ORG = 5;

/** Give up waiting on any single upstream call after this long. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export interface SubmitJobInput {
  /** Backend job type: "audit" | "fix" | "track_prompts" | ... */
  type: string;
  /** Site doc id (v1: the org id, see queries.ts SiteDoc). */
  site_id: string;
  /** Extra job payload, e.g. { site_url }. */
  data?: Record<string, unknown>;
  /** Caller's Firebase ID token (short-lived, sent in the POST body). */
  idToken: string;
}

export interface SubmitJobResult {
  job_id: string;
  status: string;
  /**
   * True when the per-org job cap could not be checked (Firestore
   * unreachable, rules not deployed, ...). The job was still submitted —
   * this flag lets the UI say so honestly instead of implying the cap held.
   */
  capUnchecked: boolean;
}

function getServerEnv(name: string): string {
  const holder = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return holder.process?.env?.[name]?.trim() ?? "";
}

function getViteEnv(name: string): string {
  try {
    const value = (import.meta.env as Record<string, unknown>)[name];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto is unavailable on the server.");
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isActiveStatus(status: unknown): boolean {
  return status === "queued" || status === "processing";
}

/**
 * Count the org's active jobs via the Firestore REST API, authenticated with
 * the CALLER's own ID token (so Firestore security rules apply as usual).
 * Returns -1 when the check itself fails (rules not deployed, network, ...).
 */
async function countActiveJobs(projectId: string, orgId: string, idToken: string): Promise<number> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "jobs" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "org_id" },
            op: "EQUAL",
            value: { stringValue: orgId },
          },
        },
        limit: 50,
      },
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) return -1;
  const rows = (await res.json()) as Array<{
    document?: { fields?: { status?: { stringValue?: string } } };
  }>;
  if (!Array.isArray(rows)) return -1;
  return rows.filter((r) => isActiveStatus(r.document?.fields?.status?.stringValue)).length;
}

export const submitJobFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as SubmitJobInput)
  .handler(async ({ data }): Promise<SubmitJobResult> => {
    const type = typeof data.type === "string" ? data.type.trim() : "";
    const siteId = typeof data.site_id === "string" ? data.site_id.trim() : "";
    const idToken = typeof data.idToken === "string" ? data.idToken : "";
    if (!type) throw new Error("Job type is required.");
    if (!siteId) throw new Error("site_id is required.");
    if (!idToken) throw new Error("You must be signed in to submit a job.");

    const webhookUrl = getServerEnv("WEBHOOK_URL") || getViteEnv("VITE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("Job submission is not configured (missing WEBHOOK_URL on the server).");
    }
    const secret = getServerEnv("WEBHOOK_SECRET");
    if (!secret) {
      throw new Error("Job submission is not configured (missing WEBHOOK_SECRET on the server).");
    }
    const projectId = getServerEnv("FIREBASE_PROJECT_ID") || getViteEnv("VITE_FIREBASE_PROJECT_ID");
    if (!projectId) {
      throw new Error("Firebase project id is not configured on the server.");
    }

    // 1. Verify caller. org_id for v1 is the Firebase uid.
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(idToken, projectId);
    } catch (err) {
      throw new Error(err instanceof Error ? `Not authorized: ${err.message}` : "Not authorized.");
    }

    // 2. Per-org cap on active jobs.
    // NOTE: this deliberately FAILS OPEN. The cap is a cost guard, not a
    // security boundary — failing closed would brick every job submission
    // during a Firestore outage or before security rules are deployed. The
    // trade-off is surfaced to the caller via `capUnchecked` (and a toast in
    // the UI) rather than hidden in the server log, so do NOT "fix" this
    // into a hard throw without a product decision.
    const active = await countActiveJobs(projectId, uid, idToken);
    if (active >= 0 && active >= MAX_QUEUED_JOBS_PER_ORG) {
      throw new Error(
        `Job limit reached: you already have ${active} job(s) queued or processing. Wait for one to finish and try again.`,
      );
    }
    let capUnchecked = false;
    if (active < 0) {
      // Fail open with a warning: the cap is a cost guard, and a failed
      // cap-check (e.g. rules not deployed yet) must not brick submissions.
      capUnchecked = true;
      console.warn(
        "[submitJob] could not verify per-org job cap (Firestore check failed); continuing.",
      );
    }

    // 3. Sign the EXACT raw body the VM will verify, then forward it.
    const payload = {
      org_id: uid,
      type,
      site_id: siteId,
      data: data.data ?? {},
    };
    const rawBody = JSON.stringify(payload);
    const signature = await hmacSha256Hex(secret, rawBody);

    let upstream: Response;
    try {
      upstream = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch {
      throw new Error("Could not reach the job worker. Try again in a minute.");
    }
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      throw new Error(`The job worker rejected the request (${upstream.status}). ${detail}`);
    }
    const result = (await upstream.json()) as {
      job_id?: unknown;
      status?: unknown;
    };
    if (typeof result.job_id !== "string" || result.job_id === "") {
      throw new Error("The job worker returned an unexpected response.");
    }
    return {
      job_id: result.job_id,
      status: typeof result.status === "string" ? result.status : "queued",
      capUnchecked,
    };
  });
