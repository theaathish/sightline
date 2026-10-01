"""Audit skill - runs SEO/AEO audit via GEO Optimizer"""

import logging
from typing import Dict, Any

from .base import BaseSkill

logger = logging.getLogger(__name__)


class AuditSkill(BaseSkill):
    """Run SEO/AEO audit on a site"""
    
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
            site_url = job.get("site_url")
            
            logger.info(f"Running audit on {site_url}")
            
            # TODO: Call GEO Optimizer
            # geo audit {site_url} --json
            
            # Mock result
            audit_result = {
                "site_url": site_url,
                "score": 75,
                "issues": [
                    {"type": "missing_robots_txt", "severity": "high"},
                    {"type": "no_json_ld", "severity": "medium"},
                ]
            }
            
            return self._format_result(True, audit_result, cost=0.5)
        
        except Exception as e:
            logger.error(f"Audit failed: {e}", exc_info=True)
            return self._format_result(False, {"error": str(e)}, cost=0.0)
