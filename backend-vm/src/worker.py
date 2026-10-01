"""Main Hermes Worker - polls Firestore and processes jobs"""

import asyncio
import logging
from typing import Optional
from datetime import datetime

from .config import Config
from .firebase_client import FirebaseClient
from .job_processor import JobProcessor
from .monitoring import TelegramMonitor

logger = logging.getLogger(__name__)


class HermesWorker:
    """Main worker loop"""
    
    def __init__(self, config: Config):
        self.config = config
        self.firebase: Optional[FirebaseClient] = None
        self.processor: Optional[JobProcessor] = None
        self.monitor: Optional[TelegramMonitor] = None
        self.running = False
    
    async def initialize(self):
        """Initialize Firebase, processor, and monitoring"""
        try:
            # Firebase
            self.firebase = FirebaseClient(self.config)
            logger.info("Firebase client initialized")
            
            # Monitoring
            if self.config.telegram_bot_token and self.config.telegram_chat_id:
                self.monitor = TelegramMonitor(self.config)
                await self.monitor.send_message(
                    f"🚀 Hermes worker started for org `{self.config.org_id}`"
                )
                logger.info("Telegram monitoring enabled")
            
            # Job processor
            self.processor = JobProcessor(self.config, self.firebase, self.monitor)
            logger.info("Job processor initialized")
            
            self.running = True
        
        except Exception as e:
            logger.error(f"Initialization failed: {e}", exc_info=True)
            raise
    
    async def run(self):
        """Main polling loop"""
        consecutive_errors = 0
        
        while self.running:
            try:
                # Poll and process jobs
                processed = await self.processor.poll_and_process()
                
                if processed > 0:
                    logger.info(f"Processed {processed} job(s)")
                    consecutive_errors = 0
                
                # Sleep before next poll
                await asyncio.sleep(self.config.polling_interval_seconds)
            
            except KeyboardInterrupt:
                logger.info("Received interrupt")
                self.running = False
                break
            
            except Exception as e:
                consecutive_errors += 1
                logger.error(
                    f"Error in job loop (attempt {consecutive_errors}/{self.config.max_retries}): {e}",
                    exc_info=True
                )
                
                # Alert after too many consecutive errors
                if consecutive_errors >= self.config.max_retries and self.monitor:
                    await self.monitor.send_error(
                        f"🚨 Hermes worker error after {consecutive_errors} retries:\n{str(e)}"
                    )
                
                # Backoff before retry
                backoff = min(2 ** consecutive_errors, 300)  # Max 5 min
                await asyncio.sleep(backoff)
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down worker...")
        self.running = False
        
        if self.monitor:
            await self.monitor.send_message("🛑 Hermes worker stopped")
