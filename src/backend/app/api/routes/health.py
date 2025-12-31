"""
Health Check API

ヘルスチェックエンドポイント
"""

from fastapi import APIRouter

from app.schemas.response import HealthCheckResponse
from app.utils.helpers import current_timestamp

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """
    ヘルスチェック

    Returns:
        HealthCheckResponse: ヘルスチェック結果
    """
    return HealthCheckResponse(
        status="ok",
        version="1.0.0",
        timestamp=current_timestamp(),
    )
