"""
Redis Client

Redis接続の管理
"""

from typing import Optional

from redis.asyncio import Redis

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_redis_client: Optional[Redis] = None


async def get_redis() -> Redis:
    """
    Redisクライアント取得

    グローバルRedis接続を返します。初回呼び出し時に接続を確立します。

    Returns:
        Redis: 非同期Redisクライアント
    """
    global _redis_client

    if _redis_client is None:
        logger.info("Initializing Redis connection", url=settings.redis_url)
        _redis_client = Redis.from_url(
            settings.redis_url,
            password=settings.redis_password if settings.redis_password else None,
            db=settings.redis_db,
            encoding="utf-8",
            decode_responses=True,
        )
        # 接続テスト
        await _redis_client.ping()
        logger.info("Redis connection established")

    return _redis_client


async def close_redis() -> None:
    """Redis接続をクローズ"""
    global _redis_client

    if _redis_client:
        logger.info("Closing Redis connection")
        await _redis_client.close()
        _redis_client = None
