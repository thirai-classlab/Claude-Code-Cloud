"""
Share Service

プロジェクト共有管理サービス
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import ProjectModel, ProjectShareModel, UserModel
from app.models.project_share import PermissionLevel, ProjectShare
from app.schemas.share import ProjectShareResponse, SharedProjectInfo
from app.utils.helpers import generate_id, jst_now
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ShareService:
    """
    共有管理サービス

    責務:
    - プロジェクト共有の作成・削除
    - 共有一覧取得
    - 共有されたプロジェクト取得
    """

    def __init__(self, session: AsyncSession):
        """
        Args:
            session: SQLAlchemy AsyncSession
        """
        self.session = session

    async def create_share(
        self,
        project_id: str,
        user_id: str,
        shared_by: str,
        permission_level: PermissionLevel = PermissionLevel.READ,
    ) -> ProjectShareModel:
        """
        プロジェクト共有を作成

        Args:
            project_id: プロジェクトID
            user_id: 共有先ユーザーID
            shared_by: 共有元ユーザーID
            permission_level: 権限レベル

        Returns:
            ProjectShareModel: 作成された共有
        """
        share = ProjectShareModel(
            id=generate_id(),
            project_id=project_id,
            user_id=user_id,
            shared_by=shared_by,
            permission_level=permission_level.value,
            created_at=datetime.now(timezone.utc),
        )

        self.session.add(share)
        await self.session.flush()

        logger.info(
            "Project share created",
            project_id=project_id,
            user_id=user_id,
            shared_by=shared_by,
            permission_level=permission_level.value,
        )

        return share

    async def get_share(
        self, project_id: str, user_id: str
    ) -> Optional[ProjectShareModel]:
        """
        特定の共有を取得

        Args:
            project_id: プロジェクトID
            user_id: 共有先ユーザーID

        Returns:
            Optional[ProjectShareModel]: 共有 (存在しない場合 None)
        """
        stmt = select(ProjectShareModel).where(
            ProjectShareModel.project_id == project_id,
            ProjectShareModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_share(
        self,
        project_id: str,
        user_id: str,
        permission_level: PermissionLevel,
    ) -> Optional[ProjectShareModel]:
        """
        共有の権限レベルを更新

        Args:
            project_id: プロジェクトID
            user_id: 共有先ユーザーID
            permission_level: 新しい権限レベル

        Returns:
            Optional[ProjectShareModel]: 更新された共有 (存在しない場合 None)
        """
        share = await self.get_share(project_id, user_id)
        if not share:
            return None

        share.permission_level = permission_level.value
        await self.session.flush()

        logger.info(
            "Project share updated",
            project_id=project_id,
            user_id=user_id,
            permission_level=permission_level.value,
        )

        return share

    async def delete_share(self, project_id: str, user_id: str) -> bool:
        """
        プロジェクト共有を削除

        Args:
            project_id: プロジェクトID
            user_id: 共有先ユーザーID

        Returns:
            bool: 削除成功の場合 True
        """
        stmt = delete(ProjectShareModel).where(
            ProjectShareModel.project_id == project_id,
            ProjectShareModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        await self.session.flush()

        deleted = result.rowcount > 0
        if deleted:
            logger.info(
                "Project share deleted",
                project_id=project_id,
                user_id=user_id,
            )

        return deleted

    async def list_project_shares(
        self, project_id: str
    ) -> List[ProjectShareResponse]:
        """
        プロジェクトの共有一覧を取得

        Args:
            project_id: プロジェクトID

        Returns:
            List[ProjectShareResponse]: 共有一覧
        """
        stmt = (
            select(ProjectShareModel)
            .options(
                selectinload(ProjectShareModel.user),
                selectinload(ProjectShareModel.sharer),
            )
            .where(ProjectShareModel.project_id == project_id)
            .order_by(ProjectShareModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        shares = result.scalars().all()

        responses = []
        for share in shares:
            responses.append(
                ProjectShareResponse(
                    id=share.id,
                    project_id=share.project_id,
                    user_id=share.user_id,
                    user_email=share.user.email if share.user else "",
                    user_name=share.user.display_name or share.user.email if share.user else "",
                    permission_level=PermissionLevel(share.permission_level),
                    shared_by=share.shared_by,
                    shared_by_email=share.sharer.email if share.sharer else None,
                    created_at=share.created_at,
                )
            )

        return responses

    async def list_shared_projects(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> List[SharedProjectInfo]:
        """
        ユーザーに共有されたプロジェクト一覧を取得

        Args:
            user_id: ユーザーID
            limit: 最大取得件数
            offset: オフセット

        Returns:
            List[SharedProjectInfo]: 共有プロジェクト一覧
        """
        stmt = (
            select(ProjectShareModel)
            .options(
                selectinload(ProjectShareModel.project).selectinload(ProjectModel.owner),
            )
            .where(ProjectShareModel.user_id == user_id)
            .order_by(ProjectShareModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        shares = result.scalars().all()

        projects = []
        for share in shares:
            if share.project and share.project.status != "deleted":
                owner = share.project.owner
                projects.append(
                    SharedProjectInfo(
                        id=share.project.id,
                        name=share.project.name,
                        description=share.project.description,
                        owner_id=share.project.user_id or "",
                        owner_email=owner.email if owner else "",
                        owner_name=owner.display_name or owner.email if owner else "",
                        permission_level=PermissionLevel(share.permission_level),
                        shared_at=share.created_at,
                    )
                )

        return projects

    async def count_shared_projects(self, user_id: str) -> int:
        """
        ユーザーに共有されたプロジェクト数をカウント

        Args:
            user_id: ユーザーID

        Returns:
            int: 共有プロジェクト数
        """
        from sqlalchemy import func

        stmt = (
            select(func.count(ProjectShareModel.id))
            .join(ProjectModel, ProjectShareModel.project_id == ProjectModel.id)
            .where(
                ProjectShareModel.user_id == user_id,
                ProjectModel.status != "deleted",
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
