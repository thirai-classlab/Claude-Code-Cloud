"""
Database Adapter for FastAPI-Users

既存のdatabaseユーティリティを使用したユーザーDB設定
StringベースのIDを使用するカスタムUserDatabase実装
"""

from typing import AsyncGenerator, Optional
import uuid

from fastapi import Depends
from fastapi_users.db import BaseUserDatabase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import UserModel
from app.utils.database import get_session


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI-Users用セッション取得

    既存のget_sessionジェネレータを使用してセッションを提供します。
    """
    async for session in get_session():
        yield session


class SQLAlchemyUserDatabaseString(BaseUserDatabase[UserModel, str]):
    """
    StringベースのIDを使用するカスタムUserDatabase

    FastAPI-UsersのデフォルトはUUIDですが、既存システムとの
    互換性のためString(36)を使用します。
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, id: str) -> Optional[UserModel]:
        """IDでユーザーを取得"""
        statement = select(UserModel).where(UserModel.id == id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[UserModel]:
        """メールアドレスでユーザーを取得"""
        statement = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def create(self, create_dict: dict) -> UserModel:
        """新規ユーザーを作成"""
        # IDを生成（UUIDの文字列形式）
        if "id" not in create_dict or create_dict["id"] is None:
            create_dict["id"] = str(uuid.uuid4())

        # Boolean値をIntegerに変換（MySQL互換性）
        for bool_field in ["is_active", "is_superuser", "is_verified"]:
            if bool_field in create_dict:
                create_dict[bool_field] = 1 if create_dict[bool_field] else 0

        user = UserModel(**create_dict)
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update(self, user: UserModel, update_dict: dict) -> UserModel:
        """ユーザー情報を更新"""
        # Boolean値をIntegerに変換
        for bool_field in ["is_active", "is_superuser", "is_verified"]:
            if bool_field in update_dict:
                update_dict[bool_field] = 1 if update_dict[bool_field] else 0

        for key, value in update_dict.items():
            setattr(user, key, value)
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def delete(self, user: UserModel) -> None:
        """ユーザーを削除"""
        await self.session.delete(user)
        await self.session.flush()


async def get_user_db(
    session: AsyncSession = Depends(get_async_session),
) -> AsyncGenerator[SQLAlchemyUserDatabaseString, None]:
    """
    ユーザーデータベースアダプター取得

    Args:
        session: AsyncSession インスタンス

    Yields:
        SQLAlchemyUserDatabaseString: ユーザーDB操作用アダプター
    """
    yield SQLAlchemyUserDatabaseString(session)
