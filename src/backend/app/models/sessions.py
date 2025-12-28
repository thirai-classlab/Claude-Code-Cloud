"""
Session Models

セッション関連のデータモデル
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


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

    id: str = Field(..., description="セッションID (UUID)")
    project_id: str = Field(..., description="所属プロジェクトID")
    name: Optional[str] = Field(default=None, description="セッション名", max_length=100)
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, description="セッションステータス")
    user_id: Optional[str] = Field(default=None, description="ユーザーID (オプション)")
    model: str = Field(default="claude-opus-4-5", description="使用Claudeモデル")
    message_count: int = Field(default=0, description="メッセージ数")
    total_tokens: int = Field(default=0, description="累計トークン数")
    total_cost_usd: float = Field(default=0.0, description="累計コスト (USD)")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="作成日時")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新日時")
    last_activity_at: datetime = Field(
        default_factory=datetime.utcnow, description="最終アクティビティ日時"
    )

    class Config:
        """Pydantic configuration"""

        json_encoders = {datetime: lambda v: v.isoformat()}
        use_enum_values = True
