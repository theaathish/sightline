import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FlowShell, Note } from "@/components/flow";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/lib/auth";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/verify")({
  beforeLoad: async ({ context, location }) => {
    await requireAuth(context.auth, location.href);
  },
  head: () => ({
    meta: [
      { title: "Verify your email — Sightline" },
      {
        name: "description",
        content: "Click the one-click link we emailed you and continue to onboarding.",
      },
      { property: "og:title", content: "Verify your email — Sightline" },
      { property: "og:description", content: "One click and you're on to setup." },
    ],
  }),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const { user } = useAuthUser();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const { resendVerificationEmail } = await import("@/lib/auth");
      await resendVerificationEmail();
      toast.success("Verification email sent. Check your inbox (and spam).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <FlowShell
      step={1}
      title="Check your inbox"
      lede={
        user?.email
          ? `We sent a verification link to ${user.email}. It drops you straight into setup.`
          : "We sent you a verification link. It drops you straight into setup."
      }
      aside={
        <Note>
          Nothing arrived? Check spam, or resend below. You can also continue now and verify later.
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
          <Button
            className="h-11 px-6 text-sm font-semibold"
            onClick={() => navigate({ to: "/onboarding" })}
          >
            Continue to onboarding
          </Button>
          <Button
            variant="ghost"
            className="h-11 text-sm"
            disabled={resending}
            onClick={handleResend}
          >
            {resending ? "Sending…" : "Resend email"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Signed in as {user?.email ?? "…"}. Wrong account?{" "}
          <button
            className="font-medium text-signal underline underline-offset-4"
            onClick={() => {
              void auth.signOutUser().then(() => navigate({ to: "/" }));
            }}
          >
            Sign out
          </button>{" "}
          ·{" "}
          <Link to="/onboarding" className="font-medium text-signal underline underline-offset-4">
            Skip verification for now
          </Link>
        </p>
      </div>
    </FlowShell>
  );
}
