"""Fix PR skill - opens pull requests with automated fixes"""

import json
import logging
from typing import Any, Dict, Optional, Tuple

from .base import BaseSkill
from ..github_token_broker import GitHubTokenBroker

logger = logging.getLogger(__name__)

BRANCH_NAME = "sightline/auto-fixes"


def parse_repo_url(repo_url: str) -> Tuple[str, str]:
    """Parse a GitHub repo URL into (owner, repo).

    Handles:
      - https://github.com/owner/repo
      - https://github.com/owner/repo.git
      - git@github.com:owner/repo.git
    """
    if not repo_url or not str(repo_url).strip():
        raise ValueError(f"Invalid repo URL: {repo_url}")
    url = str(repo_url).strip()

    # SSH form: git@github.com:owner/repo.git
    if url.startswith("git@github.com:"):
        path = url.split(":", 1)[1].strip()
        if path.endswith(".git"):
            path = path[:-4]
        path = path.strip("/")
        parts = [p for p in path.split("/") if p]
        if len(parts) != 2 or not all(parts):
            raise ValueError(f"Invalid repo URL: {repo_url}")
        return parts[0], parts[1]

    # HTTPS (or http / git://) form
    if "github.com" in url:
        # Take everything after github.com, tolerating ':' or '/' separator
        idx = url.find("github.com")
        path = url[idx + len("github.com"):]
        path = path.lstrip("/:")
        # Drop query string / fragment
        path = path.split("?", 1)[0].split("#", 1)[0]
        if path.endswith(".git"):
            path = path[:-4]
        path = path.strip("/")
        parts = [p for p in path.split("/") if p]
        if len(parts) != 2 or not all(parts):
            raise ValueError(f"Invalid repo URL: {repo_url}")
        return parts[0], parts[1]

    raise ValueError(f"Invalid repo URL: {repo_url}")


class FixPRSkill(BaseSkill):
    """Generate and open PR for fixes"""

    def __init__(self, config, firebase=None):
        super().__init__(config)
        self.github = GitHubTokenBroker(config)
        self.firebase = firebase

    def _parse_repo_url(self, repo_url: str) -> Tuple[str, str]:
        return parse_repo_url(repo_url)

    async def run(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected job payload:
        {
            "type": "fix",
            "org_id": "...",
            "site_id": "...",
            "repo_url": "https://github.com/owner/repo",
            "fixes": ["sitemap", "robots.txt", "schema"]
        }
        """
        try:
            repo_url = self._field(job, "repo_url", default="")
            fixes = self._field(job, "fixes", default=[])

            if not fixes:
                return self._format_result(
                    False,
                    {"error": "No fixes requested: job['fixes'] is empty or missing", "repo_url": repo_url},
                    cost=0.0,
                )

            repo_owner, repo_name = self._parse_repo_url(repo_url)

            logger.info(f"Creating PR for {repo_owner}/{repo_name} with fixes: {fixes}")

            # Get access token for this repo
            access_token = await self.github.get_installation_token(repo_owner, repo_name)

            # Get GitHub client (authed as the installation)
            gh = self.github.get_client(access_token)
            repo = gh.get_repo(f"{repo_owner}/{repo_name}")

            default_branch = getattr(repo, "default_branch", None) or "main"

            site_url = self._field(job, "site_url", default="")
            site_url = str(site_url or "").strip().rstrip("/")
            brand = self._field(job, "brand", default="")
            brand = str(brand or "").strip()
            faqs = self._field(job, "faqs", default=[])

            # Ensure working branch exists (reuse if already present)
            base_sha = repo.get_branch(default_branch).commit.sha
            try:
                repo.create_git_ref(ref=f"refs/heads/{BRANCH_NAME}", sha=base_sha)
            except Exception as e:
                logger.info(f"Reusing existing branch {BRANCH_NAME}: {e}")

            files_written = []
            fixes_applied = []
            skipped = []

            for fix in fixes:
                target = self._fix_target(fix, site_url=site_url, brand=brand, faqs=faqs)
                if target is None:
                    skipped.append({"fix": str(fix), "reason": f"Unknown fix type: {fix}"})
                    continue
                path, content = target

                # 404 page only makes sense for Next.js app-router repos
                if fix == "404":
                    if not self._has_app_router(repo, default_branch):
                        skipped.append(
                            {"fix": "404", "reason": "Repo has no app/ or src/app/ directory; skipping not-found.tsx"}
                        )
                        continue

                sha = self._get_file_sha(repo, path, BRANCH_NAME, default_branch)
                message = f"sightline: add {path} ({fix})"
                if sha:
                    repo.update_file(path, message, content, sha, branch=BRANCH_NAME)
                else:
                    try:
                        repo.create_file(path, message, content, branch=BRANCH_NAME)
                    except Exception:
                        # Fall back to update in case of a race where the file appeared
                        retry_sha = self._get_file_sha(repo, path, BRANCH_NAME, default_branch)
                        if retry_sha:
                            repo.update_file(path, message, content, retry_sha, branch=BRANCH_NAME)
                        else:
                            raise
                files_written.append(path)
                fixes_applied.append(str(fix))

            if not fixes_applied:
                return self._format_result(
                    False,
                    {"error": "No fixes could be applied", "repo": f"{repo_owner}/{repo_name}", "skipped": skipped},
                    cost=0.0,
                )

            title = f"Sightline auto-fixes: {', '.join(fixes_applied)}"
            body = (
                f"Automated SEO/AI-visibility fixes by Sightline.\n\n"
                f"Fixes applied: {', '.join(fixes_applied)}\n"
                f"Files: {', '.join(files_written)}\n"
            )
            pr = repo.create_pull(title=title, body=body, head=BRANCH_NAME, base=default_branch)

            pr_number = getattr(pr, "number", None)
            pr_url = getattr(pr, "html_url", None)

            pr_result = {
                "repo": f"{repo_owner}/{repo_name}",
                "pr_number": pr_number,
                "pr_url": pr_url,
                "branch": BRANCH_NAME,
                "fixes_applied": fixes_applied,
                "files_written": files_written,
                "skipped": skipped,
            }

            if self.firebase is not None:
                try:
                    org_id = self._field(job, "org_id", default=getattr(self.config, "org_id", "default"))
                    await self.firebase.save_change_log(
                        org_id,
                        {
                            "pr_number": pr_number,
                            "pr_url": pr_url,
                            "files_written": files_written,
                            "fixes_applied": fixes_applied,
                            "repo": f"{repo_owner}/{repo_name}",
                            "branch": BRANCH_NAME,
                            "reason": f"Automated fixes: {', '.join(fixes_applied)}",
                        },
                    )
                except Exception as e:
                    logger.warning(f"Failed to log change (continuing): {e}")

            return self._format_result(True, pr_result, cost=0.0)

        except Exception as e:
            logger.error(f"Fix PR failed: {e}", exc_info=True)
            return self._format_result(False, {"error": str(e)}, cost=0.0)

    def _fix_target(self, fix: str, site_url: str = "", brand: str = "", faqs=None):
        """Map a fix name to (path, content). Returns None for unknown fixes."""
        if fix == "sitemap":
            return "public/sitemap.xml", self._sitemap_content(site_url)
        if fix == "robots.txt":
            return "public/robots.txt", self._robots_content(site_url)
        if fix == "llms.txt":
            return "public/llms.txt", self._llms_content(site_url, brand)
        if fix == "schema":
            return "public/schema.json", self._schema_content(site_url, brand, faqs)
        if fix == "404":
            return "app/not-found.tsx", self._not_found_content(brand)
        return None

    def _get_file_sha(self, repo, path: str, branch: str, default_branch: str) -> Optional[str]:
        """Return the blob sha for path, or None if the file does not exist."""
        for ref in (branch, default_branch):
            try:
                existing = repo.get_contents(path, ref=ref)
                # get_contents may return a list for directories; only files have .sha
                if isinstance(existing, list):
                    return None
                sha = getattr(existing, "sha", None)
                if sha:
                    return sha
            except Exception:
                continue
        return None

    def _has_app_router(self, repo, ref: str) -> bool:
        """Check whether the repo has app/ or src/app/ (Next.js app router)."""
        for candidate in ("app", "src/app"):
            try:
                contents = repo.get_contents(candidate, ref=ref)
                if contents is not None:
                    return True
            except Exception:
                continue
        return False

    def _sitemap_content(self, site_url: str) -> str:
        base = site_url or "https://example.com"
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"  <url><loc>{base}/</loc></url>\n"
            "</urlset>\n"
        )

    def _robots_content(self, site_url: str) -> str:
        base = site_url or "https://example.com"
        return f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n"

    def _llms_content(self, site_url: str, brand: str) -> str:
        name = brand or site_url or "This site"
        lines = [f"# {name}", ""]
        if site_url:
            lines.append(f"Official site: {site_url}")
            lines.append("")
        lines.append(f"{name} - official information, products, and support.")
        if site_url:
            lines.append(f"Start at {site_url}/ for an overview and sitemap at {site_url}/sitemap.xml.")
        return "\n".join(lines) + "\n"

    def _schema_content(self, site_url: str, brand: str, faqs=None) -> str:
        base = site_url or "https://example.com"
        name = brand or base
        graph = [
            {
                "@type": "Organization",
                "name": name,
                "url": base,
            },
            {
                "@type": "WebSite",
                "name": name,
                "url": base,
            },
        ]
        entities = []
        if isinstance(faqs, list):
            for faq in faqs:
                if not isinstance(faq, dict):
                    continue
                question = faq.get("question")
                answer = faq.get("answer")
                if question is None or answer is None:
                    continue
                question = str(question).strip()
                answer = str(answer).strip()
                if not question or not answer:
                    continue
                entities.append(
                    {
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    }
                )
        if entities:
            graph.append({"@type": "FAQPage", "mainEntity": entities})
        data = {
            "@context": "https://schema.org",
            "@graph": graph,
        }
        return json.dumps(data, indent=2) + "\n"

    def _not_found_content(self, brand: str) -> str:
        name = brand or "this site"
        return (
            "export default function NotFound() {\n"
            "  return (\n"
            '    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>\n'
            f"      <h1>Page not found</h1>\n"
            f"      <p>Sorry, we could not find that page on {name}.</p>\n"
            '      <a href="/">Go back home</a>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
