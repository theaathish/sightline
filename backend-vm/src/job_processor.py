"""Job processor - routes jobs to appropriate skills"""

import logging
from typing import Optional

from .config import Config
from .firebase_client import FirebaseClient
from .monitoring import TelegramMonitor
from .skills.audit import AuditSkill
from .skills.fix_pr import FixPRSkill
from .skills.track_prompts import TrackPromptsSkill
from .skills.verify_merge import VerifyMergeSkill

logger = logging.getLogger(__name__)


class JobProcessor:
    """Routes and processes jobs"""
    
    def __init__(
        self, 
        config: Config,
        firebase: FirebaseClient,
        monitor: Optional[TelegramMonitor] = None
    ):
        self.config = config
        self.firebase = firebase
        self.monitor = monitor
        
        # Initialize skills
        self.audit_skill = AuditSkill(config, firebase)
        self.fix_pr_skill = FixPRSkill(config, firebase)
        self.track_skill = TrackPromptsSkill(config)
        self.verify_skill = VerifyMergeSkill(config)
    
    async def poll_and_process(self) -> int:
        """Poll for jobs and process them"""
        try:
            # Get queued jobs
            jobs = await self.firebase.get_queued_jobs(self.config.org_id)
            
            if not jobs:
                return 0
            
            # Process each job
            for job in jobs:
                await self._process_job(job)
            
            return len(jobs)
        
        except Exception as e:
            logger.error(f"Error in job polling: {e}", exc_info=True)
            return 0
    
    async def _process_job(self, job: dict):
        """Process a single job"""
        job_id = job.get("id")
        job_type = job.get("type")
        
        logger.info(f"Processing job {job_id} of type {job_type}")
        
        try:
            # Mark as in progress
            await self.firebase.update_job_status(job_id, "processing")
            
            # Route to appropriate skill
            if job_type == "audit":
                result = await self.audit_skill.run(job)
            elif job_type == "fix":
                result = await self.fix_pr_skill.run(job)
            elif job_type == "track_prompts":
                if not self.config.enable_ai_tracking:
                    raise ValueError("AI tracking disabled: No LLM API keys configured")
                result = await self.track_skill.run(job)
            elif job_type == "verify_merge":
                if not self.config.enable_ai_tracking:
                    raise ValueError("AI tracking disabled: No LLM API keys configured")
                result = await self.verify_skill.run(job)
            else:
                raise ValueError(f"Unknown job type: {job_type}")
            
            # Mark as completed
            cost = result.get("cost", 0.0)
            await self.firebase.update_job_status(
                job_id, 
                "completed", 
                result=result,
                cost=cost
            )
            
            logger.info(f"Job {job_id} completed successfully (cost: ${cost:.4f})")
        
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            
            # Mark as failed
            await self.firebase.update_job_status(
                job_id,
                "failed",
                error=str(e)
            )
            
            # Send alert
            if self.monitor:
                await self.monitor.send_error(
                    f"❌ Job {job_id} ({job_type}) failed:\n{str(e)}"
                )
