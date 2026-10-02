"""Audit skill - runs SEO/AEO audit via GEO Optimizer"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from .base import BaseSkill

logger = logging.getLogger(__name__)


class AuditSkill(BaseSkill):
    """Run SEO/AEO audit on a site"""

    def __init__(self, config, firebase=None):
        super().__init__(config)
        self.firebase = firebase

    async def run(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected job payload:
        {
            "type": "audit",
            "org_id": "...",
            "site_id": "...",
            "site_url": "https://..."
        }
        """
        try:
            site_url = self._field(job, "site_url")

            if not site_url or not str(site_url).strip():
                return self._format_result(
                    False,
                    {"error": "Missing required field: site_url", "site_url": site_url},
                    cost=0.0,
                )

            site_url = str(site_url).strip()
            logger.info(f"Running audit on {site_url}")

            binary = getattr(self.config, "geo_optimizer_path", None) or "geo"
            try:
                timeout = int(getattr(self.config, "request_timeout", 30) or 30)
            except (TypeError, ValueError):
                timeout = 30
            timeout = max(timeout, 60)

            try:
                proc = await asyncio.create_subprocess_exec(
                    binary,
                    "audit",
                    site_url,
                    "--json",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
            except FileNotFoundError as e:
                logger.error(f"GEO optimizer binary not found: {binary}: {e}")
                return self._format_result(
                    False,
                    {"error": f"GEO optimizer binary not found: {binary}: {e}", "site_url": site_url},
                    cost=0.0,
                )
            except OSError as e:
                logger.error(f"Failed to launch GEO optimizer: {e}")
                return self._format_result(
                    False,
                    {"error": f"Failed to launch GEO optimizer: {e}", "site_url": site_url},
                    cost=0.0,
                )

            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                logger.error(f"GEO optimizer timed out after {timeout}s for {site_url}")
                return self._format_result(
                    False,
                    {"error": f"GEO optimizer timed out after {timeout}s", "site_url": site_url},
                    cost=0.0,
                )

            if proc.returncode != 0:
                err_text = (stderr or b"").decode("utf-8", errors="replace").strip()
                out_text = (stdout or b"").decode("utf-8", errors="replace").strip()
                message = err_text or out_text or f"geo audit exited with code {proc.returncode}"
                logger.error(f"GEO optimizer failed for {site_url}: {message}")
                return self._format_result(
                    False,
                    {"error": message, "site_url": site_url},
                    cost=0.0,
                )

            out_text = (stdout or b"").decode("utf-8", errors="replace").strip()
            try:
                parsed = json.loads(out_text)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to parse GEO optimizer output: {e}")
                return self._format_result(
                    False,
                    {"error": f"Failed to parse GEO optimizer output: {e}", "site_url": site_url},
                    cost=0.0,
                )

            if not isinstance(parsed, dict):
                return self._format_result(
                    False,
                    {"error": "GEO optimizer returned unexpected JSON (expected object)", "site_url": site_url},
                    cost=0.0,
                )

            score = parsed.get("score")
            if score is None:
                for key in ("overall_score", "total_score", "audit_score"):
                    if parsed.get(key) is not None:
                        score = parsed.get(key)
                        break

            raw_issues = parsed.get("issues")
            if raw_issues is None:
                raw_issues = parsed.get("findings", [])
            if not isinstance(raw_issues, list):
                raw_issues = [raw_issues]

            issues = self._normalize_issues(raw_issues)

            audit_result = {
                "site_url": site_url,
                "score": score,
                "issues": issues,
                "raw": parsed,
            }

            if self.firebase is not None:
                try:
                    org_id = self._field(job, "org_id", default=getattr(self.config, "org_id", "default"))
                    await self.firebase.save_audit_result(org_id, audit_result)
                except Exception as e:
                    logger.warning(f"Failed to persist audit result (continuing): {e}")

            return self._format_result(True, audit_result, cost=0.0)

        except Exception as e:
            logger.error(f"Audit failed: {e}", exc_info=True)
            return self._format_result(False, {"error": str(e)}, cost=0.0)

    def _normalize_issues(self, raw_issues: list) -> List[Dict[str, str]]:
        """Coerce CLI issues to [{"type": str, "severity": str}]. Never raises."""
        normalized: List[Dict[str, str]] = []
        for item in raw_issues or []:
            try:
                if isinstance(item, dict):
                    issue_type = item.get("type", item.get("id", item.get("name", item.get("code", "unknown"))))
                    severity = item.get("severity", item.get("level", "medium"))
                    if issue_type is None or (isinstance(issue_type, str) and not issue_type.strip()):
                        issue_type = "unknown"
                    if severity is None or (isinstance(severity, str) and not severity.strip()):
                        severity = "medium"
                    normalized.append({"type": str(issue_type), "severity": str(severity)})
                elif isinstance(item, str):
                    text = item.strip() or "unknown"
                    normalized.append({"type": text, "severity": "medium"})
                elif item is None:
                    normalized.append({"type": "unknown", "severity": "medium"})
                else:
                    normalized.append({"type": str(item), "severity": "medium"})
            except Exception:
                normalized.append({"type": "unknown", "severity": "medium"})
        return normalized
