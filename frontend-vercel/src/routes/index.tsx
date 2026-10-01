import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
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
        content: "SEO health, AI mention tracking and ready-to-approve blog drafts in one dashboard.",
      },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

            <Button
              variant="outline"
              className="mt-8 h-11 w-full justify-center gap-3 text-sm font-medium"
              onClick={() => navigate({ to: "/verify" })}
            >
              <GoogleMark />
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/verify" });
              }}
            >
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
                  placeholder="At least 8 characters"
                  className="h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-11 w-full text-sm font-semibold">
                Create account
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
            “We could see our SEO score. We couldn't see that ChatGPT was recommending our competitor.”
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
