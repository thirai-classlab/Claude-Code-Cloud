"""
Session Models

セッション関連のデータモデル
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    """UTC現在時刻を返す"""
    return datetime.now(timezone.utc)


class SessionStatus(str, Enum):
    """セッションステータス"""

    ACTIVE = "active"
    IDLE = "idle"
    PROCESSING = "processing"
    CLOSED = "closed"


class Session(BaseModel):
    """
    セッションモデル

    各セッションは1つのプロジェクトに紐付きます。
    """

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str = Field(..., description="セッションID (UUID)")
    project_id: str = Field(..., description="所属プロジェクトID")
    name: Optional[str] = Field(default=None, description="セッション名", max_length=100)
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, description="セッションステータス")
    user_id: Optional[str] = Field(default=None, description="ユーザーID (オプション)")
    model: str = Field(default="claude-opus-4-5", description="使用Claudeモデル")
    sdk_session_id: Optional[str] = Field(default=None, description="Claude SDKセッションID（resume用）")
    message_count: int = Field(default=0, description="メッセージ数")
    total_tokens: int = Field(default=0, description="累計トークン数")
    total_cost_usd: float = Field(default=0.0, description="累計コスト (USD)")
    # 処理状態（ストリーム再開用）
    is_processing: bool = Field(default=False, description="処理中フラグ")
    processing_started_at: Optional[datetime] = Field(default=None, description="処理開始時刻")
    created_at: datetime = Field(default_factory=_utc_now, description="作成日時")
    updated_at: datetime = Field(default_factory=_utc_now, description="更新日時")
    last_activity_at: datetime = Field(
        default_factory=_utc_now, description="最終アクティビティ日時"
    )
