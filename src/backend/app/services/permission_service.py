"""
Permission Service

プロジェクトアクセス権限管理サービス
"""

from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import ProjectModel, ProjectShareModel, UserModel
from app.models.project_share import PermissionLevel
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PermissionService:
    """
    権限管理サービス

    責務:
    - プロジェクトアクセス権限の確認
    - 所有者チェック
    - 権限レベル取得
    """

    def __init__(self, session: AsyncSession):
        """
        Args:
            session: SQLAlchemy AsyncSession
        """
        self.session = session

    async def can_access_project(self, user_id: str, project_id: str) -> bool:
        """
        ユーザーがプロジェクトにアクセスできるか確認

        アクセス可能な条件:
        1. プロジェクトのオーナーである
        2. プロジェクトが共有されている

        Args:
            user_id: ユーザーID
            project_id: プロジェクトID

        Returns:
            bool: アクセス可能な場合 True
        """
        # オーナーチェック
        if await self.is_owner(user_id, project_id):
            return True

        # 共有チェック
        permission = await self.get_permission_level(user_id, project_id)
        return permission is not None

    async def is_owner(self, user_id: str, project_id: str) -> bool:
        """
        ユーザーがプロジェクトのオーナーかどうか確認

        Args:
            user_id: ユーザーID
            project_id: プロジェクトID

        Returns:
            bool: オーナーの場合 True
        """
        stmt = select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.user_id == user_id,
            ProjectModel.status != "deleted"
        )
        result = await self.session.execute(stmt)
        project = result.scalar_one_or_none()
        return project is not None

    async def get_permission_level(
        self, user_id: str, project_id: str
    ) -> Optional[PermissionLevel]:
        """
        ユーザーのプロジェクトに対する権限レベルを取得

        オーナーの場合は admin を返す

        Args:
            user_id: ユーザーID
            project_id: プロジェクトID

        Returns:
            Optional[PermissionLevel]: 権限レベル (アクセス不可の場合 None)
        """
        # オーナーチェック
        if await self.is_owner(user_id, project_id):
            return PermissionLevel.ADMIN

        # 共有権限チェック
        stmt = select(ProjectShareModel).where(
            ProjectShareModel.project_id == project_id,
            ProjectShareModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        share = result.scalar_one_or_none()

        if share:
            return PermissionLevel(share.permission_level)

        return None

    async def can_write(self, user_id: str, project_id: str) -> bool:
        """
        ユーザーがプロジェクトに書き込みできるか確認

        Args:
            user_id: ユーザーID
            project_id: プロジェクトID

        Returns:
            bool: 書き込み可能な場合 True
        """
        permission = await self.get_permission_level(user_id, project_id)
        if permission is None:
            return False
        return permission in [PermissionLevel.WRITE, PermissionLevel.ADMIN]

    async def can_admin(self, user_id: str, project_id: str) -> bool:
        """
        ユーザーがプロジェクトの管理権限を持つか確認

        Args:
            user_id: ユーザーID
            project_id: プロジェクトID

        Returns:
            bool: 管理権限がある場合 True
        """
        permission = await self.get_permission_level(user_id, project_id)
        if permission is None:
            return False
        return permission == PermissionLevel.ADMIN

    async def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """
        メールアドレスからユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            Optional[UserModel]: ユーザー (存在しない場合 None)
        """
        stmt = select(UserModel).where(
            UserModel.email == email,
            UserModel.is_active == 1
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: str) -> Optional[UserModel]:
        """
        IDからユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[UserModel]: ユーザー (存在しない場合 None)
        """
        stmt = select(UserModel).where(
            UserModel.id == user_id,
            UserModel.is_active == 1
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
