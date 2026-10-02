import { redirect } from "@tanstack/react-router";

import type { AuthHelpers } from "./auth";

/** Safe post-login target: same-origin path only, defaults to /dashboard. */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/dashboard";
}

/**
 * `beforeLoad` guard for authenticated routes. Awaits the promise-cached
 * Firebase user and redirects to /login (remembering the requested path)
 * when nobody is signed in.
 *
 * Note: during SSR there is no `window`, so `getCurrentUser()` resolves to
 * null and the server renders the login page; on the client the guard
 * re-runs with the real auth state.
 */
export async function requireAuth(auth: AuthHelpers, currentPath: string): Promise<void> {
  const user = await auth.getCurrentUser();
  if (!user) {
    throw redirect({
      to: "/login",
      search: { redirect: currentPath },
    });
  }
}
