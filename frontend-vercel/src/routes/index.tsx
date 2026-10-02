import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { missingFirebaseEnvVars } from "@/lib/firebase";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    // Signed-in users skip the marketing signup and go to the product.
    const user = await context.auth.getCurrentUser();
    if (user) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sightline — see how search and AI describe your site" },
      {
        name: "description",
        content:
          "Sightline audits your SEO, tracks how ChatGPT, Gemini, Claude and Perplexity mention your brand, and drafts the content that fixes the gaps.",
      },
      { property: "og:title", content: "Sightline — see how search and AI describe your site" },
      {
        property: "og:description",
        content:
          "SEO health, AI mention tracking and ready-to-approve blog drafts in one dashboard.",
      },
    ],
  }),
  component: SignUp,
});

function friendlyAuthError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/email-already-in-use")) {
      return "That email already has an account. Log in instead.";
    }
    if (error.message.includes("auth/weak-password")) {
      return "Password must be at least 6 characters.";
    }
    if (error.message.includes("auth/invalid-email")) {
      return "That email address doesn't look right.";
    }
    if (error.message.includes("auth/popup-closed-by-user")) {
      return "The Google sign-in popup was closed before finishing.";
    }
    if (error.message.includes("auth/unauthorized-domain")) {
      return "This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings.";
    }
    return error.message;
  }
  return "Couldn't create your account. Try again.";
}

function SignUp() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const missingEnv = missingFirebaseEnvVars();

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      await auth.signUpWithEmail(email.trim(), password);
      void navigate({ to: "/verify" });
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
      // Google already verifies the email address, so skip /verify.
      void navigate({ to: "/onboarding" });
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
        <Wordmark />
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm py-12">
            <h1 className="text-4xl font-bold leading-tight">Start your first audit</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Two minutes of setup. Your score lands before you leave the page.
            </p>

            {missingEnv.length > 0 && (
              <p className="mt-6 rounded-lg border border-l-2 border-l-signal bg-signal-soft p-4 text-sm">
                Sign-up is not configured yet. Missing: <strong>{missingEnv.join(", ")}</strong>.
                Set them in Vercel (or a local .env file) — see README.md.
              </p>
            )}

            <Button
              variant="outline"
              className="mt-8 h-11 w-full justify-center gap-3 text-sm font-medium"
              disabled={busy !== null || missingEnv.length > 0}
              onClick={handleGoogle}
            >
              <GoogleMark />
              {busy === "google" ? "Connecting…" : "Continue with Google"}
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleEmail}>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
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
                  minLength={6}
                  placeholder="At least 6 characters"
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
                {busy === "email" ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground">
              That's everything we ask for now. Site details come after you're in.
            </p>
            <p className="mt-6 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-signal underline underline-offset-4">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l bg-surface lg:block">
        <div className="absolute inset-0 rule-grid opacity-60" />
        <div className="relative flex h-full flex-col justify-center gap-8 px-14">
          <p className="max-w-md font-display text-2xl font-semibold leading-snug">
            “We could see our SEO score. We couldn't see that ChatGPT was recommending our
            competitor.”
          </p>
          <div className="grid max-w-md gap-4">
            <Stat value="72" label="SEO health score" />
            <Stat value="31%" label="AI mention rate across 4 models" />
            <Stat value="6" label="Blog drafts written this month" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-border/80 pt-4">
      <span className="num text-3xl font-bold text-signal">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}
