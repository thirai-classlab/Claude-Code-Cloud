"""
Project Models

プロジェクト関連のデータモデル
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


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

    id: str = Field(..., description="プロジェクトID (UUID)")
    name: str = Field(..., description="プロジェクト名", min_length=1, max_length=100)
    description: Optional[str] = Field(
        default=None, description="プロジェクト説明", max_length=500
    )
    user_id: Optional[str] = Field(default=None, description="ユーザーID (オプション)")
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, description="プロジェクトステータス")
    workspace_path: Optional[str] = Field(default=None, description="ワークスペースパス")
    session_count: int = Field(default=0, description="セッション数")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="作成日時")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新日時")

    class Config:
        """Pydantic configuration"""

        json_encoders = {datetime: lambda v: v.isoformat()}
        use_enum_values = True
