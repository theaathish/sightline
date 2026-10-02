"""Tests for the dashboard-to-VM webhook shared secret contract.

The canonical env var is WEBHOOK_SECRET (same name on Vercel and the VM);
GITHUB_WEBHOOK_SECRET is a deprecated alias kept for backwards compat.
No network, no credentials.
"""

import hashlib
import hmac
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import Config
from src.webhook import WebhookHandler


def sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


class FakeRequest:
    """Minimal stand-in for a Starlette Request (headers + body only)."""

    def __init__(self, body: bytes, signature=None):
        self._body = body
        self.headers = {"X-Webhook-Signature": signature} if signature else {}

    async def body(self):
        return self._body


def make_handler(secret=None, legacy=None):
    """Build a WebhookHandler with a controlled secret, no Firebase needed."""
    env = {}
    if secret is not None:
        env["WEBHOOK_SECRET"] = secret
    if legacy is not None:
        env["GITHUB_WEBHOOK_SECRET"] = legacy
    # Isolate from the real environment: only these two vars are visible.
    old = {k: os.environ.get(k) for k in ("WEBHOOK_SECRET", "GITHUB_WEBHOOK_SECRET")}
    os.environ.pop("WEBHOOK_SECRET", None)
    os.environ.pop("GITHUB_WEBHOOK_SECRET", None)
    os.environ.update(env)
    try:
        config = Config()
    finally:
        os.environ.pop("WEBHOOK_SECRET", None)
        os.environ.pop("GITHUB_WEBHOOK_SECRET", None)
        for k, v in old.items():
            if v is not None:
                os.environ[k] = v
    return WebhookHandler(config, firebase=None)


def test_config_prefers_canonical_webhook_secret():
    handler = make_handler(secret="canonical-value", legacy="legacy-value")
    assert handler.config.webhook_secret == "canonical-value"


def test_config_falls_back_to_legacy_secret():
    handler = make_handler(legacy="legacy-value")
    assert handler.config.webhook_secret == "legacy-value"


def test_config_empty_when_nothing_set():
    handler = make_handler()
    assert handler.config.webhook_secret == ""


@pytest.mark.asyncio
async def test_webhook_accepts_correctly_signed_request():
    handler = make_handler(secret="s3cr3t")
    body = b'{"org_id":"acme","type":"audit","site_id":"s1","data":{}}'
    req = FakeRequest(body, signature=sign("s3cr3t", body))
    await handler._verify_signature(req)  # must not raise


@pytest.mark.asyncio
async def test_webhook_rejects_wrong_signature():
    handler = make_handler(secret="s3cr3t")
    body = b'{"org_id":"acme","type":"audit","site_id":"s1","data":{}}'
    req = FakeRequest(body, signature=sign("wrong-secret", body))
    with pytest.raises(HTTPException) as exc_info:
        await handler._verify_signature(req)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_webhook_rejects_missing_signature():
    handler = make_handler(secret="s3cr3t")
    req = FakeRequest(b"{}", signature=None)
    with pytest.raises(HTTPException) as exc_info:
        await handler._verify_signature(req)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_webhook_fails_closed_when_no_secret_configured():
    """An unconfigured deploy must reject, not authenticate with an empty key."""
    handler = make_handler()
    body = b'{"org_id":"acme","type":"audit","site_id":"s1","data":{}}'
    # Even a signature computed under the empty key must not pass.
    req = FakeRequest(body, signature=sign("", body))
    with pytest.raises(HTTPException) as exc_info:
        await handler._verify_signature(req)
    assert exc_info.value.status_code == 401
