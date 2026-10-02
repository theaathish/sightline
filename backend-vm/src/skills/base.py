"""Base skill class"""

import logging
from typing import Dict, Any, Optional

from ..config import Config

logger = logging.getLogger(__name__)


class BaseSkill:
    """Base class for all skills"""
    
    def __init__(self, config: Config):
        self.config = config
    
    async def run(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the skill. Return result dict with 'cost' key."""
        raise NotImplementedError("Subclasses must implement run()")
    
    def _payload(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Return the nested job payload written by FirebaseClient.create_job."""
        data = job.get("data")
        return data if isinstance(data, dict) else {}

    def _field(self, job: Dict[str, Any], key: str, default=None):
        """Look up a job field across the nested payload and top level.

        Precedence: for ``org_id`` the top-level job document value is
        authoritative (create_job writes it top-level) and the nested
        ``data`` payload is the fallback. For every other field the nested
        ``data`` payload is authoritative and the top level is the
        backwards-compatible fallback (flat hand-written docs).
        Returns ``default`` when the field is absent/None in both places.
        """
        payload = self._payload(job)
        if key == "org_id":
            val = job.get(key)
            if val is not None:
                return val
            nested = payload.get(key)
            return default if nested is None else nested
        if key in payload and payload[key] is not None:
            return payload[key]
        val = job.get(key)
        return default if val is None else val

    def _format_result(self, success: bool, data: Dict, cost: float = 0.0) -> Dict:
        """Standard result format"""
        return {
            "success": success,
            "data": data,
            "cost": cost,
        }
