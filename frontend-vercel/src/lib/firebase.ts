import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client singleton.
 *
 * - All config comes from `import.meta.env.VITE_FIREBASE_*` (never hardcoded).
 * - Initialization is lazy and browser-only: importing this module during SSR
 *   is safe because nothing touches `window` at module scope.
 */

const REQUIRED_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readEnv(name: (typeof REQUIRED_ENV_VARS)[number]): string {
  const value = import.meta.env[name] as string | undefined;
  return typeof value === "string" ? value.trim() : "";
}

/** Returns the list of missing VITE_FIREBASE_* vars (empty when configured). */
export function missingFirebaseEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => readEnv(name) === "");
}

/**
 * Throws a loud, actionable error when Firebase env vars are missing.
 * Called lazily (browser-only) so SSR imports never explode.
 */
export function requireFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} {
  const missing = missingFirebaseEnvVars();
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set them in Vercel (or a local .env file) — see README.md "Environment variables".`,
    );
  }
  return {
    apiKey: readEnv("VITE_FIREBASE_API_KEY"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("VITE_FIREBASE_APP_ID"),
  };
}

let appCache: FirebaseApp | null = null;
let authCache: Auth | null = null;
let dbCache: Firestore | null = null;

/** Browser-only Firebase app singleton. Returns null during SSR. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isBrowser()) return null;
  if (appCache) return appCache;
  const config = requireFirebaseConfig();
  appCache = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  return appCache;
}

/** Browser-only Firebase Auth singleton. Returns null during SSR. */
export function getFirebaseAuth(): Auth | null {
  if (!isBrowser()) return null;
  if (authCache) return authCache;
  const app = getFirebaseApp();
  if (!app) return null;
  authCache = getAuth(app);
  return authCache;
}

/** Browser-only Firestore singleton. Returns null during SSR. */
export function getFirestoreDb(): Firestore | null {
  if (!isBrowser()) return null;
  if (dbCache) return dbCache;
  const app = getFirebaseApp();
  if (!app) return null;
  dbCache = getFirestore(app);
  return dbCache;
}

/**
 * Browser-only Firestore instance. Throws a clear error during SSR or when
 * Firebase is not configured — call only from event handlers / effects.
 */
export function requireDb(): Firestore {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error(
      "Firestore is only available in the browser and requires Firebase env vars. " +
        'See README.md "Environment variables".',
    );
  }
  return db;
}

/** Public (non-secret) Firebase project id, or null when unavailable/SSR. */
export function getFirebaseProjectId(): string | null {
  if (!isBrowser()) return null;
  try {
    return requireFirebaseConfig().projectId;
  } catch {
    return null;
  }
}
