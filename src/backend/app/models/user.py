"""
User Models

ユーザー関連のPydanticデータモデル
FastAPI-Users互換フォーマット
"""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


def _utc_now() -> datetime:
    """Return current UTC datetime with timezone info."""
    return datetime.now(timezone.utc)


class User(BaseModel):
    """
    ユーザーモデル

    FastAPI-Users互換のユーザー情報を管理します。
    """

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str = Field(..., description="ユーザーID (UUID)")
    email: EmailStr = Field(..., description="メールアドレス")
    display_name: Optional[str] = Field(default=None, description="表示名", max_length=100)
    is_active: bool = Field(default=True, description="アクティブフラグ")
    is_superuser: bool = Field(default=False, description="スーパーユーザーフラグ")
    is_verified: bool = Field(default=False, description="メール認証済みフラグ")
    created_at: datetime = Field(default_factory=_utc_now, description="作成日時")
    updated_at: datetime = Field(default_factory=_utc_now, description="更新日時")


class UserCreate(BaseModel):
    """ユーザー作成リクエスト"""

    email: EmailStr = Field(..., description="メールアドレス")
    password: str = Field(..., min_length=8, description="パスワード")
    display_name: Optional[str] = Field(default=None, description="表示名", max_length=100)


class UserUpdate(BaseModel):
    """ユーザー更新リクエスト"""

    display_name: Optional[str] = Field(default=None, description="表示名", max_length=100)
    password: Optional[str] = Field(default=None, min_length=8, description="新しいパスワード")


class UserResponse(BaseModel):
    """ユーザーレスポンス (パスワードなし)"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="ユーザーID")
    email: EmailStr = Field(..., description="メールアドレス")
    display_name: Optional[str] = Field(default=None, description="表示名")
    is_active: bool = Field(default=True, description="アクティブフラグ")
    is_verified: bool = Field(default=False, description="メール認証済みフラグ")
    created_at: datetime = Field(..., description="作成日時")
