"""
Models API

利用可能なClaudeモデル一覧を取得するエンドポイント
"""

from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.middleware import handle_exceptions
from app.config import settings
from app.utils.logger import get_logger

router = APIRouter(prefix="/models", tags=["models"])
logger = get_logger(__name__)

# キャッシュ用変数
_models_cache: Optional[List[dict]] = None
_cache_expires_at: Optional[datetime] = None
CACHE_DURATION = timedelta(hours=1)  # 1時間キャッシュ


class ModelInfo(BaseModel):
    """モデル情報"""
    id: str
    display_name: str
    created_at: Optional[str] = None
    type: str = "model"


class ModelsResponse(BaseModel):
    """モデル一覧レスポンス"""
    models: List[ModelInfo]
    total: int


async def fetch_models_from_anthropic(api_key: Optional[str] = None) -> List[dict]:
    """
    Anthropic APIからモデル一覧を取得

    Args:
        api_key: APIキー（省略時はデフォルト設定を使用）

    Returns:
        List[dict]: モデル情報リスト
    """
    key = api_key or settings.anthropic_api_key

    if not key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except httpx.HTTPStatusError as e:
            logger.error("Failed to fetch models from Anthropic API", status=e.response.status_code)
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to fetch models: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error("Request error when fetching models", error=str(e))
            raise HTTPException(status_code=503, detail="Failed to connect to Anthropic API")


@router.get("", response_model=ModelsResponse)
@handle_exceptions
async def list_models(
    refresh: bool = Query(default=False, description="キャッシュを無視して最新情報を取得"),
) -> ModelsResponse:
    """
    利用可能なClaudeモデル一覧を取得

    Anthropic APIから利用可能なモデル一覧を取得します。
    結果は1時間キャッシュされます。

    Args:
        refresh: キャッシュを無視するかどうか

    Returns:
        ModelsResponse: モデル一覧
    """
    global _models_cache, _cache_expires_at

    # キャッシュが有効な場合はキャッシュを返す
    now = datetime.now()
    if not refresh and _models_cache and _cache_expires_at and now < _cache_expires_at:
        logger.debug("Returning cached models list", count=len(_models_cache))
        return ModelsResponse(
            models=[ModelInfo(**m) for m in _models_cache],
            total=len(_models_cache),
        )

    # Anthropic APIから取得
    logger.info("Fetching models from Anthropic API")
    raw_models = await fetch_models_from_anthropic()

    # モデル情報を整形
    models = []
    for m in raw_models:
        models.append({
            "id": m.get("id", ""),
            "display_name": m.get("display_name", m.get("id", "")),
            "created_at": m.get("created_at"),
            "type": m.get("type", "model"),
        })

    # キャッシュを更新
    _models_cache = models
    _cache_expires_at = now + CACHE_DURATION

    logger.info("Models fetched and cached", count=len(models))

    return ModelsResponse(
        models=[ModelInfo(**m) for m in models],
        total=len(models),
    )


@router.get("/recommended", response_model=ModelsResponse)
@handle_exceptions
async def list_recommended_models() -> ModelsResponse:
    """
    推奨モデル一覧を取得

    チャットに適した推奨モデルをフィルタリングして返します。
    利用できない場合はフォールバックリストを返します。

    Returns:
        ModelsResponse: 推奨モデル一覧
    """
    # フォールバック用の推奨モデルリスト
    fallback_models = [
        ModelInfo(id="claude-sonnet-4-20250514", display_name="Claude Sonnet 4"),
        ModelInfo(id="claude-opus-4-20250514", display_name="Claude Opus 4"),
        ModelInfo(id="claude-3-5-haiku-20241022", display_name="Claude 3.5 Haiku"),
    ]

    try:
        # APIからモデル一覧を取得
        response = await list_models(refresh=False)
        models = response.models

        if not models:
            logger.warning("No models returned from API, using fallback")
            return ModelsResponse(models=fallback_models, total=len(fallback_models))

        # チャット向けモデルのみをフィルタリング（claude- で始まるもの）
        chat_models = [m for m in models if m.id.startswith("claude-")]

        # 最新バージョンを優先してソート
        # Sonnet 4、Opus 4、Haiku 3.5 の順に並べる
        def sort_key(model: ModelInfo) -> tuple:
            id = model.id.lower()
            # 優先度: sonnet-4 > opus-4 > haiku > others
            if "sonnet-4" in id or "sonnet4" in id:
                return (0, id)
            elif "opus-4" in id or "opus4" in id:
                return (1, id)
            elif "haiku" in id:
                return (2, id)
            else:
                return (3, id)

        chat_models.sort(key=sort_key)

        # 最大10件に制限
        recommended = chat_models[:10]

        if not recommended:
            logger.warning("No chat models found, using fallback")
            return ModelsResponse(models=fallback_models, total=len(fallback_models))

        return ModelsResponse(models=recommended, total=len(recommended))

    except Exception as e:
        logger.error("Failed to fetch recommended models, using fallback", error=str(e))
        return ModelsResponse(models=fallback_models, total=len(fallback_models))
