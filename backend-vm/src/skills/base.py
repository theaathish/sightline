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
    
    def _format_result(self, success: bool, data: Dict, cost: float = 0.0) -> Dict:
        """Standard result format"""
        return {
            "success": success,
            "data": data,
            "cost": cost,
        }
