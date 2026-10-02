import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/lib/auth";
import { missingFirebaseEnvVars } from "@/lib/firebase";
import { safeRedirectPath } from "@/lib/route-guards";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const raw = search["redirect"];
    return typeof raw === "string" && raw !== "" ? { redirect: raw } : {};
  },
  beforeLoad: async ({ context, search }) => {
    // Signed-in users don't need the login form.
    const user = await context.auth.getCurrentUser();
    if (user) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ href: safeRedirectPath(search["redirect"]) });
    }
  },
  head: () => ({
    meta: [
      { title: "Log in — Sightline" },
      {
        name: "description",
        content: "Log in to your Sightline dashboard to see your SEO and AI visibility.",
      },
      { property: "og:title", content: "Log in — Sightline" },
      { property: "og:description", content: "Returning users land straight on the dashboard." },
    ],
  }),
  component: Login,
});

function friendlyAuthError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/invalid-credential")) {
      return "Wrong email or password. Try again.";
    }
    if (error.message.includes("auth/user-not-found")) {
      return "No account uses that email. Create one instead.";
    }
    if (error.message.includes("auth/too-many-requests")) {
      return "Too many attempts. Wait a minute and try again.";
    }
    if (error.message.includes("auth/popup-closed-by-user")) {
      return "The Google sign-in popup was closed before finishing.";
    }
    if (error.message.includes("auth/unauthorized-domain")) {
      return "This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings.";
    }
    return error.message;
  }
  return "Sign-in failed. Try again.";
}

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { auth } = Route.useRouteContext();
  const { user } = useAuthUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const missingEnv = missingFirebaseEnvVars();
  const destination = safeRedirectPath(search.redirect);

  const goNext = () => {
    if (destination !== "/dashboard") {
      window.location.assign(destination);
    } else {
      void navigate({ to: "/dashboard" });
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      await auth.signInWithEmail(email.trim(), password);
      goNext();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await auth.signInWithGoogle();
      goNext();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(null);
    }
  };

  // The beforeLoad guard already redirects signed-in users; this is a
  // belt-and-braces message for the hydration window.
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          You are signed in — taking you to your dashboard…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
      <Wordmark />
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm py-12">
          <h1 className="text-4xl font-bold">Welcome back</h1>
          <p className="mt-3 text-sm text-muted-foreground">Straight to your dashboard.</p>

          {missingEnv.length > 0 && (
            <p className="mt-6 rounded-lg border border-l-2 border-l-signal bg-signal-soft p-4 text-sm">
              Sign-in is not configured yet. Missing: <strong>{missingEnv.join(", ")}</strong>. Set
              them in Vercel (or a local .env file) — see README.md.
            </p>
          )}

          <Button
            variant="outline"
            className="mt-8 h-11 w-full text-sm font-medium"
            disabled={busy !== null || missingEnv.length > 0}
            onClick={handleGoogle}
          >
            {busy === "google" ? "Connecting to Google…" : "Continue with Google"}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmail}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-signal-soft px-3 py-2 text-sm text-signal">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full text-sm font-semibold"
              disabled={busy !== null || missingEnv.length > 0}
            >
              {busy === "email" ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-sm">
            New here?{" "}
            <Link to="/" className="font-medium text-signal underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
