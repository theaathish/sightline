import { createFileRoute, Link } from "@tanstack/react-router";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify your email — Sightline" },
      { name: "description", content: "Click the one-click link we emailed you and continue to onboarding." },
      { property: "og:title", content: "Verify your email — Sightline" },
      { property: "og:description", content: "One click and you're on to setup." },
    ],
  }),
  component: Verify,
});

function Verify() {
  return (
    <FlowShell
      step={1}
      title="Check your inbox"
      lede="We sent a one-click link to you@company.com. It drops you straight into setup."
      aside={
        <Note>
          Nothing arrived? Check spam, or resend below. The link stays valid for 24 hours.
        </Note>
      }
    >
      <div className="rounded-xl border p-6">
        <div className="flex items-start gap-4">
          <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
            ✓
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Confirm your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One tap verifies the account and opens onboarding — no code to type.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-11 px-6 text-sm font-semibold">
            <Link to="/onboarding">Open the verification link</Link>
          </Button>
          <Button variant="ghost" className="h-11 text-sm">
            Resend email
          </Button>
        </div>
      </div>
    </FlowShell>
  );
}
