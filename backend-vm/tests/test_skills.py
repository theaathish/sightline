"""Unit tests for AuditSkill and FixPRSkill (no network, no credentials)."""

import asyncio
import json
import sys
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.skills.audit import AuditSkill
from src.skills.fix_pr import FixPRSkill, parse_repo_url


def make_config(**overrides):
    base = {
        "geo_optimizer_path": "/nonexistent/geo-binary-sightline-test",
        "request_timeout": 30,
        "org_id": "org-test",
        "github_app_id": "0",
        "github_private_key": "",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def nested_audit_job(**data_overrides):
    data = {"site_url": "https://example.com"}
    data.update(data_overrides)
    return {
        "id": "job-audit-1",
        "org_id": "acme",
        "type": "audit",
        "site_id": "s1",
        "status": "queued",
        "data": data,
    }


def nested_fix_job(**data_overrides):
    data = {
        "repo_url": "https://github.com/owner/repo",
        "fixes": ["sitemap"],
        "site_url": "https://example.com",
        "brand": "ExampleCo",
    }
    data.update(data_overrides)
    return {
        "id": "job-fix-1",
        "org_id": "acme",
        "type": "fix",
        "site_id": "s1",
        "status": "queued",
        "data": data,
    }


@pytest.mark.asyncio
async def test_audit_fails_when_binary_absent():
    config = make_config()
    skill = AuditSkill(config)
    result = await skill.run(nested_audit_job())
    assert result["success"] is False
    assert result["cost"] == 0.0
    assert "error" in result["data"]
    assert result["data"]["error"]  # real message, not empty
    assert result["data"]["site_url"] == "https://example.com"


@pytest.mark.asyncio
async def test_audit_flat_shape_still_works():
    """Backwards-compatible fallback: flat hand-written job without data key."""
    config = make_config()
    skill = AuditSkill(config)
    result = await skill.run({"site_url": "https://example.com", "org_id": "org-test"})
    assert result["success"] is False  # binary still absent, but site_url resolved
    assert result["data"]["site_url"] == "https://example.com"
    assert "Missing required field" not in result["data"]["error"]


@pytest.mark.asyncio
async def test_audit_fails_when_site_url_missing():
    config = make_config()
    skill = AuditSkill(config)
    result = await skill.run(
        {"id": "x", "org_id": "acme", "type": "audit", "site_id": "s1",
         "status": "queued", "data": {}}
    )
    assert result["success"] is False
    assert result["cost"] == 0.0
    assert "error" in result["data"]


@pytest.mark.asyncio
async def test_audit_nested_job_reaches_subprocess_with_right_site_url():
    config = make_config(geo_optimizer_path="/fake/geo")
    skill = AuditSkill(config)
    seen = {}

    payload = {"score": 91, "issues": []}

    class FakeProc:
        returncode = 0

        async def communicate(self):
            return json.dumps(payload).encode(), b""

    async def fake_exec(*args, **kwargs):
        seen["args"] = args
        assert args[1] == "audit"
        assert "--json" in args
        return FakeProc()

    orig = asyncio.create_subprocess_exec
    asyncio.create_subprocess_exec = fake_exec
    try:
        result = await skill.run(nested_audit_job(site_url="https://acme.com"))
    finally:
        asyncio.create_subprocess_exec = orig

    assert result["success"] is True
    assert seen["args"][2] == "https://acme.com"
    assert result["data"]["site_url"] == "https://acme.com"


@pytest.mark.asyncio
async def test_audit_success_parses_cli_json_and_persists():
    config = make_config(geo_optimizer_path="/fake/geo")
    firebase = SimpleNamespace(save_audit_result=AsyncMock())
    skill = AuditSkill(config, firebase)

    payload = {
        "score": 88,
        "issues": [
            {"type": "missing_meta", "severity": "high"},
            {"type": "slow_page"},  # missing severity -> default medium
            "plain string issue",
            {"unexpected": "shape"},  # odd issue must not crash
        ],
    }

    class FakeProc:
        returncode = 0

        async def communicate(self):
            return json.dumps(payload).encode(), b""

    async def fake_exec(*args, **kwargs):
        assert args[1] == "audit"
        assert "--json" in args
        return FakeProc()

    orig = asyncio.create_subprocess_exec
    asyncio.create_subprocess_exec = fake_exec
    try:
        result = await skill.run(nested_audit_job())
    finally:
        asyncio.create_subprocess_exec = orig

    assert result["success"] is True
    assert result["cost"] == 0.0
    data = result["data"]
    assert data["site_url"] == "https://example.com"
    assert data["score"] == 88
    assert data["raw"] == payload
    severities = [i["severity"] for i in data["issues"]]
    assert len(data["issues"]) == 4
    assert all(isinstance(i["type"], str) for i in data["issues"])
    assert "medium" in severities  # defaulted severity present
    firebase.save_audit_result.assert_awaited_once()
    # org_id comes from the top-level job document
    assert firebase.save_audit_result.await_args[0][0] == "acme"


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://github.com/owner/repo", ("owner", "repo")),
        ("https://github.com/owner/repo.git", ("owner", "repo")),
        ("git@github.com:owner/repo.git", ("owner", "repo")),
    ],
)
def test_parse_repo_url_forms(url, expected):
    assert parse_repo_url(url) == expected


@pytest.mark.asyncio
async def test_fix_pr_fails_when_fixes_empty():
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)  # avoid broker init requiring keys
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    skill.firebase = None
    result = await skill.run(nested_fix_job(fixes=[]))
    assert result["success"] is False
    assert result["cost"] == 0.0
    assert "error" in result["data"]


@pytest.mark.asyncio
async def test_fix_pr_flat_shape_still_works():
    """Backwards-compatible fallback: flat job without data key fails cleanly, not with KeyError."""
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    skill.firebase = None
    result = await skill.run(
        {"repo_url": "https://github.com/owner/repo", "fixes": [], "org_id": "org-test"}
    )
    assert result["success"] is False
    assert "error" in result["data"]


class _FakeCommit:
    sha = "base-sha"


class _FakeBranch:
    commit = _FakeCommit()


class _FakePR:
    number = 42
    html_url = "https://github.com/owner/repo/pull/42"


class _FakeContents:
    def __init__(self, sha):
        self.sha = sha


class _FakeRepo:
    """Minimal PyGithub repo double backed by a dict of path -> content."""

    def __init__(self, files=None, has_app=False):
        self.files = dict(files or {})
        self.has_app = has_app
        self.default_branch = "main"
        self.created_refs = []
        self.updated = []
        self.created = []
        self.prs = []

    def get_branch(self, name):
        return _FakeBranch()

    def create_git_ref(self, ref, sha):
        if ref in self.created_refs:
            raise Exception("Reference already exists")
        self.created_refs.append(ref)
        return {"ref": ref}

    def get_contents(self, path, ref=None):
        if path in ("app", "src/app"):
            if self.has_app and path == "app":
                return _FakeContents("dir-sha")
            raise Exception("Not found")
        if path in self.files:
            return _FakeContents("sha-" + path)
        raise Exception("Not found")

    def create_file(self, path, message, content, branch=None):
        self.files[path] = content
        self.created.append(path)
        return {"content": content}

    def update_file(self, path, message, content, sha, branch=None):
        self.files[path] = content
        self.updated.append(path)
        return {"content": content}

    def create_pull(self, title, body, head, base):
        assert head == "sightline/auto-fixes"
        assert base == "main"
        self.prs.append({"title": title, "body": body})
        return _FakePR()


def make_fix_skill(fake_repo, firebase=None):
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    skill.github = SimpleNamespace(
        get_installation_token=AsyncMock(return_value="tok"),
        get_client=lambda token: SimpleNamespace(get_repo=lambda full: fake_repo),
    )
    skill.firebase = firebase
    return skill


@pytest.mark.asyncio
async def test_fix_pr_nested_job_produces_real_pr():
    fake_repo = _FakeRepo(has_app=True)
    firebase = SimpleNamespace(save_change_log=AsyncMock())
    skill = make_fix_skill(fake_repo, firebase)

    job = nested_fix_job(
        fixes=["sitemap", "robots.txt", "llms.txt", "schema", "404"],
    )
    result = await skill.run(job)

    assert result["success"] is True
    assert result["cost"] == 0.0
    data = result["data"]
    assert data["repo"] == "owner/repo"
    assert data["pr_number"] == 42
    assert data["pr_url"] == "https://github.com/owner/repo/pull/42"
    assert data["branch"] == "sightline/auto-fixes"
    assert set(data["fixes_applied"]) == {"sitemap", "robots.txt", "llms.txt", "schema", "404"}
    assert "public/sitemap.xml" in data["files_written"]
    assert "https://example.com" in fake_repo.files["public/sitemap.xml"]
    assert "https://example.com/sitemap.xml" in fake_repo.files["public/robots.txt"]
    assert "ExampleCo" in fake_repo.files["public/llms.txt"]
    firebase.save_change_log.assert_awaited_once()
    assert firebase.save_change_log.await_args[0][0] == "acme"


@pytest.mark.asyncio
async def test_fix_pr_creates_real_pr_through_api():
    # Flat-shape backwards-compat path through the full API flow.
    fake_repo = _FakeRepo(has_app=True)
    firebase = SimpleNamespace(save_change_log=AsyncMock())
    skill = make_fix_skill(fake_repo, firebase)
    skill.github = SimpleNamespace(
        get_installation_token=AsyncMock(return_value="tok"),
        get_client=lambda token: SimpleNamespace(
            get_repo=lambda full: (  # assert installation-style lookup
                (_ for _ in ()).throw(
                    AssertionError(f"expected owner/repo, got {full}")
                )
                if full != "owner/repo"
                else fake_repo
            )
        ),
    )

    job = {
        "repo_url": "https://github.com/owner/repo",
        "fixes": ["sitemap", "robots.txt", "llms.txt", "schema", "404"],
        "site_url": "https://example.com",
        "brand": "ExampleCo",
        "org_id": "org-test",
    }
    result = await skill.run(job)

    assert result["success"] is True
    assert result["cost"] == 0.0
    data = result["data"]
    assert data["repo"] == "owner/repo"
    assert data["pr_number"] == 42
    assert data["pr_url"] == "https://github.com/owner/repo/pull/42"
    assert data["branch"] == "sightline/auto-fixes"
    assert set(data["fixes_applied"]) == {"sitemap", "robots.txt", "llms.txt", "schema", "404"}
    assert "public/sitemap.xml" in data["files_written"]
    firebase.save_change_log.assert_awaited_once()


@pytest.mark.asyncio
async def test_fix_pr_skips_404_without_app_router():
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    fake_repo = _FakeRepo(has_app=False)
    skill.github = SimpleNamespace(
        get_installation_token=AsyncMock(return_value="tok"),
        get_client=lambda token: SimpleNamespace(get_repo=lambda full: fake_repo),
    )
    skill.firebase = None

    result = await skill.run(nested_fix_job(fixes=["404"]))
    assert result["success"] is False  # nothing applicable to apply
    assert any("app" in s.get("reason", "") for s in result["data"]["skipped"])


def test_schema_omits_empty_faq_page():
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    content = skill._schema_content("https://example.com", "ExampleCo", [])
    parsed = json.loads(content)
    types = [n.get("@type") for n in parsed["@graph"]]
    assert "FAQPage" not in types


def test_schema_includes_faqs_when_provided():
    config = make_config()
    skill = FixPRSkill.__new__(FixPRSkill)
    from src.skills.base import BaseSkill

    BaseSkill.__init__(skill, config)
    faqs = [{"question": "What is ExampleCo?", "answer": "A test company."}]
    content = skill._schema_content("https://example.com", "ExampleCo", faqs)
    parsed = json.loads(content)
    faq = next(n for n in parsed["@graph"] if n.get("@type") == "FAQPage")
    assert faq["mainEntity"][0]["name"] == "What is ExampleCo?"
