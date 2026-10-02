"""Vercel webhook handler for job triggers"""

import logging
import hashlib
import hmac
import json
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException, status
from pydantic import BaseModel

from .config import Config
from .firebase_client import FirebaseClient

logger = logging.getLogger(__name__)


class JobPayload(BaseModel):
    """Job submission payload"""
    org_id: str
    type: str  # audit, fix, track_prompts, generate_content, etc
    site_id: str
    data: Optional[Dict[str, Any]] = None


class WebhookHandler:
    """Handles webhook requests from Vercel"""
    
    def __init__(self, config: Config, firebase: FirebaseClient):
        self.config = config
        self.firebase = firebase
        self.app = FastAPI(title="Sightline Webhook")
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup FastAPI routes"""
        
        @self.app.post("/webhook/job")
        async def submit_job(request: Request, payload: JobPayload):
            """Submit a job to the queue"""
            try:
                # Verify webhook signature
                await self._verify_signature(request)
                
                logger.info(f"Received job submission: {payload.type} for org {payload.org_id}")
                
                # Create job document
                job_id = await self.firebase.create_job(
                    org_id=payload.org_id,
                    job_type=payload.type,
                    site_id=payload.site_id,
                    data=payload.data or {}
                )
                
                logger.info(f"Job {job_id} queued successfully")
                
                return {
                    "status": "queued",
                    "job_id": job_id,
                    "message": f"Job {payload.type} submitted for {payload.org_id}"
                }
            
            except Exception as e:
                logger.error(f"Job submission failed: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        
        @self.app.get("/webhook/health")
        async def health_check():
            """Health check endpoint"""
            return {"status": "healthy"}
        
        @self.app.get("/webhook/jobs/{org_id}")
        async def get_jobs_status(org_id: str):
            """Get job statuses for an org"""
            try:
                jobs = await self.firebase.get_org_jobs(org_id)
                return {
                    "org_id": org_id,
                    "total_jobs": len(jobs),
                    "jobs": jobs
                }
            except Exception as e:
                logger.error(f"Failed to get jobs: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve jobs"
                )
    
    async def _verify_signature(self, request: Request):
        """Verify webhook signature from Vercel"""
        try:
            # Fail closed: without a configured secret, hmac.new("") would
            # still produce a "valid" signature under an empty key, so reject
            # outright instead of authenticating with an empty key.
            webhook_secret = self.config.webhook_secret
            if not webhook_secret:
                raise ValueError("Webhook secret is not configured")

            # Get signature from header
            signature = request.headers.get("X-Webhook-Signature")
            if not signature:
                raise ValueError("Missing webhook signature")
            
            # Get body
            body = await request.body()
            
            # Verify using shared secret
            expected = hmac.new(
                webhook_secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected):
                raise ValueError("Invalid webhook signature")
            
            logger.debug("Webhook signature verified")
        
        except ValueError as e:
            logger.warning(f"Signature verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
    
    def run(self, host: str = "0.0.0.0", port: int = 8000):
        """Start the webhook server"""
        import uvicorn
        logger.info(f"Starting webhook server on {host}:{port}")
        uvicorn.run(self.app, host=host, port=port)
