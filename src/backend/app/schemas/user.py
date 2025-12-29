"""
User Schemas

FastAPI-Users用ユーザースキーマ定義
StringベースのIDを使用
"""

from typing import Optional

from fastapi_users import schemas
from pydantic import Field


class UserRead(schemas.BaseUser[str]):
    """
    ユーザー読み取りスキーマ

    APIレスポンスでユーザー情報を返す際に使用します。

    Attributes:
        id: String形式のユーザーID（UUID文字列）
        email: メールアドレス
        is_active: アクティブ状態
        is_superuser: スーパーユーザーフラグ
        is_verified: メール認証済みフラグ
        display_name: 表示名
    """

    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="表示名"
    )


class UserCreate(schemas.BaseUserCreate):
    """
    ユーザー作成スキーマ

    新規ユーザー登録時に使用します。

    Attributes:
        email: メールアドレス（必須）
        password: パスワード（必須）
        display_name: 表示名（オプション）
    """

    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="表示名"
    )


class UserUpdate(schemas.BaseUserUpdate):
    """
    ユーザー更新スキーマ

    ユーザー情報の更新時に使用します。

    Attributes:
        password: 新しいパスワード（オプション）
        email: 新しいメールアドレス（オプション）
        display_name: 新しい表示名（オプション）
        is_active: アクティブ状態（オプション）
        is_superuser: スーパーユーザーフラグ（オプション）
        is_verified: メール認証済みフラグ（オプション）
    """

    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="表示名"
    )
