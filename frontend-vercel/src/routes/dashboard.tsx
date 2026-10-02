import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/flow";
import { useAuthUser } from "@/lib/auth";
import { useSiteDoc } from "@/lib/queries";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ context, location }) => {
    await requireAuth(context.auth, location.href);
  },
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
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const { user } = useAuthUser();
  const siteQuery = useSiteDoc();
  const site = siteQuery.data;

  const brandName = site?.brand || "Your site";
  const brandSite = site?.url || user?.email || "";

  const handleSignOut = async () => {
    await auth.signOutUser();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b bg-background px-5 py-5 lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <Wordmark />
          <div className="mt-6 rounded-lg border bg-surface px-3 py-2.5">
            <p className="truncate text-sm font-medium">{brandName}</p>
            {brandSite && <p className="truncate text-xs text-muted-foreground">{brandSite}</p>}
          </div>
          <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n && n.exact }}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{
                  className:
                    "bg-ink text-background font-medium hover:bg-ink hover:text-background",
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleSignOut}
            className="mt-8 hidden text-xs text-muted-foreground underline underline-offset-4 lg:block"
          >
            Log out
          </button>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
