"""
Share Schemas

プロジェクト共有関連のAPIスキーマ定義
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.project_share import PermissionLevel


class ShareProjectRequest(BaseModel):
    """プロジェクト共有リクエスト"""

    email: EmailStr = Field(..., description="共有先ユーザーのメールアドレス")
    permission_level: PermissionLevel = Field(
        default=PermissionLevel.READ,
        description="権限レベル (read/write/admin)"
    )


class UpdateShareRequest(BaseModel):
    """共有更新リクエスト"""

    permission_level: PermissionLevel = Field(
        ..., description="新しい権限レベル (read/write/admin)"
    )


class ProjectShareResponse(BaseModel):
    """プロジェクト共有レスポンス"""

    id: str = Field(..., description="共有ID")
    project_id: str = Field(..., description="プロジェクトID")
    user_id: str = Field(..., description="共有先ユーザーID")
    user_email: str = Field(..., description="共有先ユーザーのメールアドレス")
    user_name: str = Field(..., description="共有先ユーザー名")
    permission_level: PermissionLevel = Field(..., description="権限レベル")
    shared_by: Optional[str] = Field(default=None, description="共有元ユーザーID")
    shared_by_email: Optional[str] = Field(default=None, description="共有元ユーザーのメールアドレス")
    created_at: datetime = Field(..., description="共有日時")


class ProjectShareListResponse(BaseModel):
    """プロジェクト共有一覧レスポンス"""

    shares: List[ProjectShareResponse] = Field(..., description="共有一覧")
    total: int = Field(..., description="総数")


class SharedProjectInfo(BaseModel):
    """共有されたプロジェクト情報"""

    id: str = Field(..., description="プロジェクトID")
    name: str = Field(..., description="プロジェクト名")
    description: Optional[str] = Field(default=None, description="プロジェクト説明")
    owner_id: str = Field(..., description="オーナーユーザーID")
    owner_email: str = Field(..., description="オーナーのメールアドレス")
    owner_name: str = Field(..., description="オーナー名")
    permission_level: PermissionLevel = Field(..., description="権限レベル")
    shared_at: datetime = Field(..., description="共有日時")
