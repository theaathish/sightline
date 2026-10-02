import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getFirebaseAuth, isBrowser } from "./firebase";

/**
 * Auth state, kept in exactly one module-level place.
 *
 * `currentUserState` is `undefined` until Firebase reports the first
 * onAuthStateChanged snapshot — that is the "loading" state.
 */
let currentUserState: User | null | undefined = undefined;
let listenerAttached = false;
const readyWaiters: Array<(user: User | null) => void> = [];
const storeListeners = new Set<() => void>();

function setUser(user: User | null): void {
  currentUserState = user;
  for (const waiter of readyWaiters.splice(0)) {
    try {
      waiter(user);
    } catch {
      // Ignore waiter errors; state is already updated.
    }
  }
  for (const notify of storeListeners) {
    try {
      notify();
    } catch {
      // Ignore listener errors.
    }
  }
}

function attachListener(): void {
  if (listenerAttached || !isBrowser()) return;
  listenerAttached = true;
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      setUser(null);
      return;
    }
    onAuthStateChanged(
      auth,
      (user) => setUser(user),
      () => setUser(null),
    );
  } catch {
    // Missing Firebase config etc: fail loudly at call sites, but auth state
    // itself resolves to "signed out" so routes don't hang.
    setUser(null);
  }
}

/**
 * Single place that maps a Firebase user to their v1 org id.
 * There is no membership collection yet, so org id === Firebase uid.
 * Swap this helper for a real membership lookup later without touching callers.
 */
export function getOrgId(user: Pick<User, "uid">): string {
  return user.uid;
}

/**
 * Promise-cached current user for TanStack Router `beforeLoad` guards.
 * Resolves to null on the server (no window) and never hangs.
 */
export function getCurrentUser(): Promise<User | null> {
  if (!isBrowser()) return Promise.resolve(null);
  attachListener();
  if (currentUserState !== undefined) return Promise.resolve(currentUserState);
  return new Promise<User | null>((resolve) => {
    readyWaiters.push(resolve);
  });
}

/** Synchronous snapshot for components that already handle a loading state. */
export function getCurrentUserSync(): User | null {
  attachListener();
  return currentUserState ?? null;
}

/** True while the first onAuthStateChanged snapshot hasn't arrived. */
export function isAuthLoadingSync(): boolean {
  attachListener();
  return currentUserState === undefined;
}

function subscribeToStore(notify: () => void): () => void {
  attachListener();
  storeListeners.add(notify);
  return () => {
    storeListeners.delete(notify);
  };
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/** React hook exposing the current user + loading state. */
export function useAuthUser(): AuthState {
  const user = useSyncExternalStore(
    subscribeToStore,
    () => currentUserState ?? null,
    () => null,
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  // Before hydration (SSR), always report loading so server/client agree.
  if (!hydrated && !isBrowser()) return { user: null, loading: true };
  return { user, loading: currentUserState === undefined };
}

/** Short-lived Firebase ID token for authenticating server-function calls. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is unavailable (check env vars).");
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(credential.user);
  } catch {
    // Verification email is best-effort; the account itself was created.
  }
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is unavailable (check env vars).");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is unavailable (check env vars).");
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You are not signed in.");
  await sendEmailVerification(user);
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
  setUser(null);
}

/**
 * Helper bundle exposed to every route via the router context
 * (`src/router.tsx` → `context.auth`).
 */
export const authHelpers = {
  getCurrentUser,
  getCurrentUserSync,
  getOrgId,
  getIdToken,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
};

export type AuthHelpers = typeof authHelpers;
export type { User };
