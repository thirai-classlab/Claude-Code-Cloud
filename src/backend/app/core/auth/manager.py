"""
User Manager for FastAPI-Users

ユーザー管理ロジック（登録、ログイン時のイベントハンドリング等）
StringベースのIDを使用するカスタム実装
"""

import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager

from app.core.auth.db import get_user_db
from app.config import settings
from app.models.database import UserModel
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UserManager(BaseUserManager[UserModel, str]):
    """
    ユーザーマネージャー

    ユーザーの登録、認証、パスワードリセット等のイベントを処理します。
    StringベースのIDを使用（UUIDではなくString(36)）
    """

    reset_password_token_secret = settings.secret_key
    verification_token_secret = settings.secret_key

    def parse_id(self, value: str) -> str:
        """IDをパース（String型なのでそのまま返す）"""
        return value

    async def on_after_register(
        self, user: UserModel, request: Optional[Request] = None
    ) -> None:
        """
        ユーザー登録後のイベントハンドラー

        Args:
            user: 登録されたユーザー
            request: リクエストオブジェクト
        """
        logger.info(
            "User registered",
            user_id=str(user.id),
            email=user.email,
            display_name=user.display_name,
        )

    async def on_after_login(
        self,
        user: UserModel,
        request: Optional[Request] = None,
        response: Optional[object] = None,
    ) -> None:
        """
        ログイン後のイベントハンドラー

        Args:
            user: ログインしたユーザー
            request: リクエストオブジェクト
            response: レスポンスオブジェクト
        """
        logger.info(
            "User logged in",
            user_id=str(user.id),
            email=user.email,
        )

    async def on_after_forgot_password(
        self, user: UserModel, token: str, request: Optional[Request] = None
    ) -> None:
        """
        パスワードリセットリクエスト後のイベントハンドラー

        Args:
            user: パスワードリセットをリクエストしたユーザー
            token: リセットトークン
            request: リクエストオブジェクト
        """
        logger.info(
            "Password reset requested",
            user_id=str(user.id),
            email=user.email,
        )
        # TODO: メール送信機能を実装する場合はここで実行

    async def on_after_reset_password(
        self, user: UserModel, request: Optional[Request] = None
    ) -> None:
        """
        パスワードリセット完了後のイベントハンドラー

        Args:
            user: パスワードをリセットしたユーザー
            request: リクエストオブジェクト
        """
        logger.info(
            "Password reset completed",
            user_id=str(user.id),
            email=user.email,
        )

    async def on_after_verify(
        self, user: UserModel, request: Optional[Request] = None
    ) -> None:
        """
        メール認証完了後のイベントハンドラー

        Args:
            user: 認証されたユーザー
            request: リクエストオブジェクト
        """
        logger.info(
            "User verified",
            user_id=str(user.id),
            email=user.email,
        )


async def get_user_manager(user_db=Depends(get_user_db)):
    """
    ユーザーマネージャー取得

    Args:
        user_db: ユーザーデータベースアダプター

    Yields:
        UserManager: ユーザーマネージャーインスタンス
    """
    yield UserManager(user_db)
