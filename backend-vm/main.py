#!/usr/bin/env python3
"""
Sightline Backend - Hermes Worker
Main entry point for the background job processor and webhook server
"""

import asyncio
import logging
import os
import sys
from datetime import datetime

from dotenv import load_dotenv

# Load environment
load_dotenv()

# Setup logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hermes")


async def main():
    """Main worker loop"""
    try:
        from src.config import Config
        from src.worker import HermesWorker
        from src.webhook import WebhookHandler
        from src.firebase_client import FirebaseClient
        import threading
        
        # Load config
        config = Config.from_env()
        logger.info(f"Hermes Worker starting for org: {config.org_id}")
        
        # Initialize Firebase
        firebase = FirebaseClient(config)
        
        # Start webhook server in background thread
        logger.info("Starting webhook server...")
        webhook = WebhookHandler(config, firebase)
        webhook_thread = threading.Thread(
            target=webhook.run,
            kwargs={"host": "0.0.0.0", "port": 8000},
            daemon=True
        )
        webhook_thread.start()
        logger.info("Webhook server started on port 8000")
        
        # Create and start worker
        worker = HermesWorker(config)
        await worker.initialize()
        
        logger.info("Worker initialized successfully")
        logger.info(f"Polling Firestore every {config.polling_interval_seconds}s for jobs")
        
        # Run worker loop
        await worker.run()
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
