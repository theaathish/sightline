/**
 * Firebase ID-token verification WITHOUT firebase-admin.
 *
 * The browser sends its short-lived Firebase ID token with each job request.
 * This module checks the token's RS256 signature against Google's public
 * certs and validates iss/aud/exp, returning the caller's uid.
 *
 * Pure functions + lazy fetches only: importing this module (including in a
 * client bundle stub) has no side effects. It only ever RUNS on the server,
 * inside the `submitJobFn` handler.
 */

const SECURETOKEN_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;

function base64UrlToBytes(segment: string): Uint8Array<ArrayBuffer> {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Copy into a fresh ArrayBuffer so the type is exact (no SharedArrayBuffer).
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out.buffer;
}

function parseMaxAge(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/);
  const seconds = match?.[1] ? Number(match[1]) : 3600;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 3600;
}

async function getCerts(forceRefresh = false): Promise<Record<string, string>> {
  if (!forceRefresh && certCache && Date.now() < certCache.expiresAt) {
    return certCache.certs;
  }
  const res = await fetch(SECURETOKEN_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Could not fetch Google signing certs (${res.status}).`);
  }
  const certs = (await res.json()) as Record<string, string>;
  certCache = {
    certs,
    expiresAt: Date.now() + parseMaxAge(res.headers.get("cache-control")) * 1000,
  };
  return certs;
}

function decodePayload(segment: string): Record<string, unknown> {
  const bytes = base64UrlToBytes(segment);
  let json = "";
  for (const byte of bytes) {
    json += String.fromCharCode(byte);
  }
  return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
}

/**
 * Verify a Firebase ID token for the given project. Returns the uid (sub).
 * Throws a plain Error with a non-sensitive message on any failure.
 */
export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<string> {
  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Malformed auth token.");
  }
  const [headerSeg, payloadSeg, sigSeg] = parts as [string, string, string];

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodePayload(headerSeg);
    payload = decodePayload(payloadSeg);
  } catch {
    throw new Error("Malformed auth token.");
  }

  if (header["alg"] !== "RS256") {
    throw new Error("Unsupported token algorithm.");
  }
  const kid = typeof header["kid"] === "string" ? (header["kid"] as string) : null;
  if (!kid) {
    throw new Error("Token is missing a key id.");
  }

  let certs = await getCerts();
  let pem = certs[kid];
  if (!pem) {
    // Key rotation: refresh once before giving up.
    certs = await getCerts(true);
    pem = certs[kid];
  }
  if (!pem) {
    throw new Error("Unknown token signing key.");
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is unavailable on the server.");
  }
  const key = await subtle.importKey(
    "spki",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedBytes = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`);
  const ok = await subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlToBytes(sigSeg), signedBytes);
  if (!ok) {
    throw new Error("Invalid token signature.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload["aud"] !== projectId) {
    throw new Error("Token was not issued for this project.");
  }
  if (payload["iss"] !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Token has an unexpected issuer.");
  }
  if (typeof payload["exp"] !== "number" || (payload["exp"] as number) < nowSeconds) {
    throw new Error("Token has expired. Sign in again.");
  }
  if (typeof payload["sub"] !== "string" || payload["sub"] === "") {
    throw new Error("Token has no subject.");
  }
  return payload["sub"] as string;
}
