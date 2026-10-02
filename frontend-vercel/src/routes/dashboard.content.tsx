import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyNote, PageHead, Tag } from "@/components/dash";
import { firestoreErrorMessage, useChanges, usePosts } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/content")({
  head: () => ({
    meta: [
      { title: "Content — Sightline" },
      {
        name: "description",
        content:
          "Review, approve and publish AI-written blog drafts, and see what's scheduled this month.",
      },
      { property: "og:title", content: "Content — Sightline" },
      {
        property: "og:description",
        content: "Drafts waiting for approval plus your publishing calendar.",
      },
    ],
  }),
  component: Content,
});

function fieldString(fields: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function Content() {
  const postsQuery = usePosts(50);
  const changesQuery = useChanges(50);

  const posts = postsQuery.data ?? [];
  const changes = changesQuery.data ?? [];

  if (postsQuery.isPending || changesQuery.isPending) {
    return (
      <>
        <PageHead title="Content" lede="Loading…" />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading content…</p>
        </Card>
      </>
    );
  }

  const postsError = postsQuery.isError ? postsQuery.error : null;
  const changesError = changesQuery.isError ? changesQuery.error : null;

  return (
    <>
      <PageHead
        title="Content"
        lede={
          posts.length > 0
            ? `${posts.length} draft${posts.length === 1 ? "" : "s"} · ${changes.length} shipped fix${changes.length === 1 ? "" : "es"}`
            : `${changes.length} shipped fix${changes.length === 1 ? "" : "es"}`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <h2 className="font-display text-base font-semibold">Drafts</h2>
          {postsError && (
            <Card className="p-5">
              <EmptyNote>
                Drafts aren't available yet ({firestoreErrorMessage(postsError)}). The{" "}
                <span className="num">posts</span> collection isn't provisioned — content generation
                hasn't been wired to the backend.
              </EmptyNote>
            </Card>
          )}
          {!postsError && posts.length === 0 && (
            <Card className="p-5">
              <EmptyNote>
                No drafts yet. When the content skill is wired, AI-written drafts will wait for your
                approval here. Nothing is published without your approval.
              </EmptyNote>
            </Card>
          )}
          {posts.map((post) => {
            const title =
              fieldString(post.fields, ["title", "headline", "slug"]) ??
              `Draft ${post.id.slice(0, 8)}`;
            const excerpt = fieldString(post.fields, ["excerpt", "summary", "body"]);
            const status = fieldString(post.fields, ["status"]);
            return (
              <Card key={post.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[220px] flex-1">
                    <div className="flex items-center gap-2">
                      {status && <Tag tone="warn">{status}</Tag>}
                      {post.timestamp && (
                        <span className="num text-xs text-muted-foreground">
                          {new Date(post.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold leading-snug">
                      {title}
                    </h3>
                    {excerpt && <p className="mt-1.5 text-sm text-muted-foreground">{excerpt}</p>}
                  </div>
                </div>
              </Card>
            );
          })}

          <h2 className="pt-2 font-display text-base font-semibold">Shipped fixes</h2>
          {changesError && (
            <Card className="p-5">
              <p className="text-sm font-semibold">Couldn't load shipped fixes.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {firestoreErrorMessage(changesError)}
              </p>
            </Card>
          )}
          {!changesError && changes.length === 0 && (
            <Card className="p-5">
              <EmptyNote>
                No fixes shipped yet. When you approve an audit fix, the fix_pr skill opens a pull
                request and it shows up here.
              </EmptyNote>
            </Card>
          )}
          {changes.map((change) => (
            <Card key={change.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                {change.pr_number != null && <Tag tone="ok">PR #{change.pr_number}</Tag>}
                {change.repo && (
                  <span className="num text-xs text-muted-foreground">{change.repo}</span>
                )}
                {change.branch && (
                  <span className="num text-xs text-muted-foreground">→ {change.branch}</span>
                )}
                {change.timestamp && (
                  <span className="num ml-auto text-xs text-muted-foreground">
                    {new Date(change.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm">
                {change.reason ?? "Site fix applied."}{" "}
                {change.fixes_applied != null && change.fixes_applied.length > 0 && (
                  <span className="text-muted-foreground">
                    ({change.fixes_applied.length} fix
                    {change.fixes_applied.length === 1 ? "" : "es"} applied:{" "}
                    {change.fixes_applied.join(", ")})
                  </span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {change.pr_url && (
                  <a
                    href={change.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-signal underline underline-offset-4"
                  >
                    View pull request
                  </a>
                )}
                {change.files_written != null && change.files_written.length > 0 && (
                  <span className="num text-muted-foreground">
                    {change.files_written.length} file{change.files_written.length === 1 ? "" : "s"}{" "}
                    written: {change.files_written.join(", ")}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-5">
          <h2 className="font-display text-base font-semibold">Publishing</h2>
          <div className="mt-4">
            <EmptyNote>
              No publishing calendar yet — it appears once drafts start flowing. Nothing is
              published without your approval.
            </EmptyNote>
          </div>
        </Card>
      </div>
    </>
  );
}
