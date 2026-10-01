import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Sightline" },
      { name: "description", content: "Log in to your Sightline dashboard to see your SEO and AI visibility." },
      { property: "og:title", content: "Log in — Sightline" },
      { property: "og:description", content: "Returning users land straight on the dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
      <Wordmark />
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm py-12">
          <h1 className="text-4xl font-bold">Welcome back</h1>
          <p className="mt-3 text-sm text-muted-foreground">Straight to your dashboard.</p>

          <Button
            variant="outline"
            className="mt-8 h-11 w-full text-sm font-medium"
            onClick={() => navigate({ to: "/dashboard" })}
          >
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
              navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@company.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required placeholder="••••••••" className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full text-sm font-semibold">
              Log in
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
