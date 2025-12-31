"""
Project Share Models

プロジェクト共有関連のPydanticデータモデル
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    """UTC現在時刻を返す"""
    return datetime.now(timezone.utc)


class PermissionLevel(str, Enum):
    """権限レベル"""

    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class ProjectShare(BaseModel):
    """
    プロジェクト共有モデル

    プロジェクトを他ユーザーに共有するための情報を管理します。
    """

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str = Field(..., description="共有ID (UUID)")
    project_id: str = Field(..., description="プロジェクトID")
    user_id: str = Field(..., description="共有先ユーザーID")
    permission_level: PermissionLevel = Field(
        default=PermissionLevel.READ, description="権限レベル"
    )
    shared_by: Optional[str] = Field(default=None, description="共有元ユーザーID")
    created_at: datetime = Field(default_factory=_utc_now, description="共有日時")
