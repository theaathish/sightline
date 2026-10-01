"""Firebase integration for job management and state storage"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore

from .config import Config

logger = logging.getLogger(__name__)


class FirebaseClient:
    """Firebase client for Firestore access"""
    
    def __init__(self, config: Config):
        self.config = config
        self.db: Optional[firestore.Client] = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase Admin SDK"""
        try:
            creds_dict = self.config.get_firebase_creds()
            
            if not creds_dict:
                raise ValueError("Firebase credentials not configured")
            
            creds = credentials.Certificate(creds_dict)
            
            # Initialize Firebase (handle if already initialized)
            try:
                firebase_admin.initialize_app(creds)
            except ValueError:
                pass  # Already initialized
            
            self.db = firestore.client()
            logger.info("Firebase initialized successfully")
        
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
            raise
    
    async def get_queued_jobs(self, org_id: str) -> List[Dict[str, Any]]:
        """Get all queued jobs for org"""
        try:
            docs = (
                self.db.collection("jobs")
                .where("org_id", "==", org_id)
                .where("status", "==", "queued")
                .limit(self.config.max_concurrent_jobs)
                .stream()
            )
            
            jobs = []
            for doc in docs:
                job_data = doc.to_dict()
                job_data["id"] = doc.id
                jobs.append(job_data)
            
            return jobs
        
        except Exception as e:
            logger.error(f"Error fetching jobs: {e}")
            return []
    
    async def update_job_status(
        self, 
        job_id: str, 
        status: str, 
        result: Optional[Dict] = None,
        error: Optional[str] = None,
        cost: float = 0.0
    ):
        """Update job status and results"""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow(),
                "cost": cost,
            }
            
            if result:
                update_data["result"] = result
            
            if error:
                update_data["error"] = error
            
            if status == "completed":
                update_data["completed_at"] = datetime.utcnow()
            
            self.db.collection("jobs").document(job_id).update(update_data)
            logger.info(f"Job {job_id} status updated to {status}")
        
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
    
    async def save_audit_result(self, org_id: str, audit_data: Dict[str, Any]):
        """Save audit results to Firestore"""
        try:
            self.db.collection("audits").add({
                "org_id": org_id,
                "timestamp": datetime.utcnow(),
                **audit_data
            })
            logger.info(f"Audit saved for org {org_id}")
        
        except Exception as e:
            logger.error(f"Error saving audit: {e}")
    
    async def save_ai_run(self, org_id: str, run_data: Dict[str, Any]):
        """Save AI prompt run to Firestore"""
        try:
            self.db.collection("aiRuns").add({
                "org_id": org_id,
                "timestamp": datetime.utcnow(),
                **run_data
            })
            logger.info(f"AI run saved for org {org_id}")
        
        except Exception as e:
            logger.error(f"Error saving AI run: {e}")
    
    async def get_site_config(self, org_id: str, site_id: str) -> Optional[Dict]:
        """Get site configuration"""
        try:
            doc = self.db.collection("sites").document(site_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        
        except Exception as e:
            logger.error(f"Error getting site config: {e}")
            return None
    
    async def save_change_log(self, org_id: str, change_data: Dict[str, Any]):
        """Log a change (PR, fix, etc)"""
        try:
            self.db.collection("changes").add({
                "org_id": org_id,
                "timestamp": datetime.utcnow(),
                **change_data
            })
            logger.info(f"Change logged for org {org_id}")
        
        except Exception as e:
            logger.error(f"Error logging change: {e}")
