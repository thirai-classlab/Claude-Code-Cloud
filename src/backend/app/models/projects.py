"""
Project Models

プロジェクト関連のデータモデル
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    """Return current UTC datetime with timezone info."""
    return datetime.now(timezone.utc)


class ProjectStatus(str, Enum):
    """プロジェクトステータス"""

    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class Project(BaseModel):
    """
    プロジェクトモデル

    1つのプロジェクトは複数のセッションを持つことができます。
    各プロジェクトは専用のワークスペースディレクトリを持ちます。
    """

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str = Field(..., description="プロジェクトID (UUID)")
    name: str = Field(..., description="プロジェクト名", min_length=1, max_length=100)
    description: Optional[str] = Field(
        default=None, description="プロジェクト説明", max_length=500
    )
    user_id: Optional[str] = Field(default=None, description="ユーザーID (オプション)")
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, description="プロジェクトステータス")
    workspace_path: Optional[str] = Field(default=None, description="ワークスペースパス")
    session_count: int = Field(default=0, description="セッション数")
    api_key: Optional[str] = Field(default=None, description="プロジェクト固有のAPIキー")
    created_at: datetime = Field(default_factory=_utc_now, description="作成日時")
    updated_at: datetime = Field(default_factory=_utc_now, description="更新日時")
