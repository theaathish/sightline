"""GitHub App token broker - generates short-lived repo-scoped tokens"""

import logging
import jwt
import time
from typing import Optional

import requests
from github import Github, GithubException, Auth

from .config import Config

logger = logging.getLogger(__name__)


class GitHubTokenBroker:
    """Manages GitHub App authentication and token generation"""
    
    def __init__(self, config: Config):
        self.config = config
        self.app_id = int(config.github_app_id)
        self.private_key = config.github_private_key
    
    def _get_jwt(self) -> str:
        """Generate a JWT for GitHub App authentication"""
        try:
            now = int(time.time())
            payload = {
                "iat": now,
                "exp": now + 600,  # 10 minutes
                "iss": self.app_id,
            }
            
            token = jwt.encode(
                payload,
                self.private_key,
                algorithm="RS256"
            )
            
            return token
        
        except Exception as e:
            logger.error(f"Failed to generate JWT: {e}")
            raise
    
    async def get_installation_token(self, repo_owner: str, repo_name: str) -> str:
        """Get a short-lived installation token for a specific repo"""
        try:
            jwt_token = self._get_jwt()
            
            # Get installation ID
            headers = {
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            # List installations for the app
            resp = requests.get(
                "https://api.github.com/app/installations",
                headers=headers,
                timeout=10
            )
            resp.raise_for_status()
            
            installations = resp.json()
            
            # Find installation for this owner
            installation_id = None
            for inst in installations:
                if inst.get("account", {}).get("login").lower() == repo_owner.lower():
                    installation_id = inst.get("id")
                    break
            
            if not installation_id:
                raise ValueError(f"No GitHub App installation found for {repo_owner}")
            
            # Get installation access token
            token_resp = requests.post(
                f"https://api.github.com/app/installations/{installation_id}/access_tokens",
                headers=headers,
                json={
                    "repositories": [repo_name],
                    "permissions": {
                        "contents": "write",
                        "pull_requests": "write",
                    }
                },
                timeout=10
            )
            token_resp.raise_for_status()
            
            token_data = token_resp.json()
            token = token_data.get("token")
            
            logger.info(f"Generated token for {repo_owner}/{repo_name}")
            return token
        
        except Exception as e:
            logger.error(f"Failed to get installation token: {e}", exc_info=True)
            raise
    
    def get_client(self, access_token: str) -> Github:
        """Get an authenticated GitHub client"""
        auth = Auth.Token(access_token)
        return Github(auth=auth)
