"""Configuration management"""

import json
import os
from typing import Optional


class Config:
    """Configuration from environment variables"""
    
    def __init__(self):
        self.org_id = os.getenv("ORG_ID", "default")
        self.firebase_credentials = os.getenv("FIREBASE_CREDENTIALS_JSON", "{}")
        self.github_private_key = os.getenv("GITHUB_PRIVATE_KEY", "")
        self.github_app_id = os.getenv("GITHUB_APP_ID", "0")
        # Dashboard-to-VM webhook shared secret (HMAC-SHA256). Canonical name
        # is WEBHOOK_SECRET; GITHUB_WEBHOOK_SECRET is a deprecated alias kept
        # for backwards compatibility with already-deployed VMs and can be
        # removed once deployments are migrated. This secret is NOT a GitHub
        # webhook secret — nothing here verifies GitHub webhooks.
        self.webhook_secret = os.getenv("WEBHOOK_SECRET", "") or os.getenv("GITHUB_WEBHOOK_SECRET", "")
        
        # LLM APIs (OPTIONAL - only needed for AI visibility tracking)
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.perplexity_api_key = os.getenv("PERPLEXITY_API_KEY", "")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
        
        # Feature flags
        self.enable_ai_tracking = bool(
            self.openai_api_key or self.gemini_api_key or 
            self.anthropic_api_key or self.perplexity_api_key
        )
        
        # Monitoring
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID")
        
        # Optional paths
        self.geo_optimizer_path = os.getenv("GEO_OPTIMIZER_PATH")
        
        # Tuning
        self.polling_interval_seconds = int(os.getenv("VM_POLLING_INTERVAL_SECONDS", "60"))
        self.max_retries = int(os.getenv("MAX_RETRIES", "3"))
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
        self.max_concurrent_jobs = int(os.getenv("MAX_CONCURRENT_JOBS", "5"))
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
    
    @classmethod
    def from_env(cls) -> "Config":
        """Load from environment"""
        return cls()
    
    def get_firebase_creds(self) -> dict:
        """Parse Firebase credentials"""
        try:
            return json.loads(self.firebase_credentials)
        except (json.JSONDecodeError, TypeError):
            return {}
