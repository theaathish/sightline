"""Monitoring and alerting via Telegram"""

import logging
from typing import Optional

from telegram import Bot
from telegram.error import TelegramError

from .config import Config

logger = logging.getLogger(__name__)


class TelegramMonitor:
    """Telegram alerts and notifications"""
    
    def __init__(self, config: Config):
        self.config = config
        self.bot = Bot(token=config.telegram_bot_token)
        self.chat_id = config.telegram_chat_id
    
    async def send_message(self, text: str):
        """Send a message to Telegram"""
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=text,
                parse_mode="Markdown"
            )
        except TelegramError as e:
            logger.error(f"Failed to send Telegram message: {e}")
    
    async def send_error(self, text: str):
        """Send error notification"""
        await self.send_message(f"🚨 *Error*\n{text}")
    
    async def send_success(self, text: str):
        """Send success notification"""
        await self.send_message(f"✅ *Success*\n{text}")
    
    async def send_info(self, text: str):
        """Send info message"""
        await self.send_message(f"ℹ️ {text}")
    
    async def send_cost_report(self, total_cost: float, job_count: int):
        """Send cost report"""
        msg = (
            f"💰 *Cost Report*\n"
            f"Jobs: {job_count}\n"
            f"Total: ${total_cost:.4f}\n"
            f"Avg: ${total_cost/max(job_count, 1):.4f}"
        )
        await self.send_message(msg)
