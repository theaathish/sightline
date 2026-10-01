"""Fix PR skill - opens pull requests with automated fixes"""

import logging
from typing import Dict, Any

from .base import BaseSkill
from ..github_token_broker import GitHubTokenBroker

logger = logging.getLogger(__name__)


class FixPRSkill(BaseSkill):
    """Generate and open PR for fixes"""
    
    def __init__(self, config):
        super().__init__(config)
        self.github = GitHubTokenBroker(config)
    
    async def run(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected job payload:
        {
            "type": "fix",
            "org_id": "...",
            "site_id": "...",
            "repo_url": "https://github.com/owner/repo",
            "fixes": ["sitemap", "robots.txt", "schema"]
        }
        """
        try:
            repo_url = job.get("repo_url", "")
            fixes = job.get("fixes", [])
            
            # Parse repo URL
            parts = repo_url.replace("https://github.com/", "").split("/")
            if len(parts) != 2:
                raise ValueError(f"Invalid repo URL: {repo_url}")
            
            repo_owner, repo_name = parts
            
            logger.info(f"Creating PR for {repo_owner}/{repo_name} with fixes: {fixes}")
            
            # Get access token for this repo
            access_token = await self.github.get_installation_token(repo_owner, repo_name)
            
            # Get GitHub client
            gh = self.github.get_client(access_token)
            repo = gh.get_user(repo_owner).get_repo(repo_name)
            
            # TODO: Apply fixes
            # - Clone repo
            # - Apply fixes (sitemap, robots.txt, schema, alt text, etc)
            # - Commit changes
            # - Create PR
            
            pr_result = {
                "repo": f"{repo_owner}/{repo_name}",
                "pr_number": 123,
                "pr_url": f"https://github.com/{repo_owner}/{repo_name}/pull/123",
                "fixes_applied": fixes,
                "branch": "sightline/auto-fixes",
            }
            
            return self._format_result(True, pr_result, cost=1.0)
        
        except Exception as e:
            logger.error(f"Fix PR failed: {e}", exc_info=True)
            return self._format_result(False, {"error": str(e)}, cost=0.0)
