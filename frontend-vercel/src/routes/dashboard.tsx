import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Wordmark } from "@/components/flow";
import { brand, plan } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const nav = [
  { to: "/dashboard", label: "Overview", exact: true },
  { to: "/dashboard/audit", label: "Audit" },
  { to: "/dashboard/ai-visibility", label: "AI visibility" },
  { to: "/dashboard/content", label: "Content" },
  { to: "/dashboard/settings", label: "Settings" },
] as const;

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b bg-background px-5 py-5 lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <Wordmark />
          <div className="mt-6 rounded-lg border bg-surface px-3 py-2.5">
            <p className="truncate text-sm font-medium">{brand.name}</p>
            <p className="truncate text-xs text-muted-foreground">{brand.site}</p>
          </div>
          <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n && n.exact }}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-ink text-background font-medium hover:bg-ink hover:text-background" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-lg border border-l-2 border-l-signal bg-signal-soft p-3 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal">{plan.name} plan</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {plan.promptsUsed}/{plan.promptsLimit} prompts · {plan.draftsUsed}/{plan.draftsLimit} drafts
            </p>
            <Link
              to="/dashboard/settings"
              className="mt-2 inline-block text-xs font-medium text-signal underline underline-offset-4"
            >
              Upgrade
            </Link>
          </div>
          <Link
            to="/login"
            className="mt-8 hidden text-xs text-muted-foreground underline underline-offset-4 lg:block"
          >
            Log out
          </Link>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
