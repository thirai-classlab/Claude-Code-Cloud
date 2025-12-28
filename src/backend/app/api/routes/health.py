"""
Health Check API

ヘルスチェックエンドポイント
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from app.schemas.response import HealthCheckResponse
from app.utils.redis_client import get_redis

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(redis: Redis = Depends(get_redis)) -> HealthCheckResponse:
    """
    ヘルスチェック

    Returns:
        HealthCheckResponse: ヘルスチェック結果
    """
    # Redis接続確認
    redis_connected = False
    try:
        await redis.ping()
        redis_connected = True
    except Exception:
        pass

    return HealthCheckResponse(
        status="ok" if redis_connected else "degraded",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        redis_connected=redis_connected,
    )
