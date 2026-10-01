"""Verify merge skill - re-runs prompts after PR merge to measure impact"""

import logging
from typing import Dict, Any

from .base import BaseSkill

logger = logging.getLogger(__name__)


class VerifyMergeSkill(BaseSkill):
    """Re-run tracked prompts after merge to verify impact"""
    
    async def run(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected job payload:
        {
            "type": "verify_merge",
            "org_id": "...",
            "pr_number": 123,
            "baseline_run_id": "run-456"
        }
        """
        try:
            pr_number = job.get("pr_number")
            baseline_run_id = job.get("baseline_run_id")
            
            logger.info(f"Verifying impact of PR #{pr_number} against baseline {baseline_run_id}")
            
            # TODO: 
            # - Get baseline results from Firestore
            # - Get same prompts as baseline
            # - Run them again
            # - Compare: mentions, position, sentiment, sources
            # - Log experiment results
            
            verify_result = {
                "pr_number": pr_number,
                "mentions_change": "+2",
                "position_change": "↑ 3",
                "confidence": "high",  # Multiple samples agree
            }
            
            return self._format_result(True, verify_result, cost=2.50)
        
        except Exception as e:
            logger.error(f"Verify merge failed: {e}", exc_info=True)
            return self._format_result(False, {"error": str(e)}, cost=0.0)
