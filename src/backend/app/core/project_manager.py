"""
Project Manager

プロジェクトのライフサイクル管理 (SQLAlchemy版)
"""

import os
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, func, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.database import ProjectModel, SessionModel
from app.models.errors import MaxProjectsExceededError, ProjectNotFoundError
from app.models.projects import Project, ProjectStatus
from app.utils.helpers import generate_id
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ProjectManager:
    """
    プロジェクト管理クラス

    責務:
    - プロジェクト作成・取得・削除
    - プロジェクト配下のセッション管理
    - ワークスペースディレクトリ管理
    - MySQL永続化 (SQLAlchemy)
    """

    def __init__(self, session: AsyncSession, workspace_base: Optional[str] = None):
        """
        Args:
            session: SQLAlchemy AsyncSession
            workspace_base: ワークスペース基底ディレクトリ
        """
        self.session = session
        self.workspace_base = workspace_base or settings.workspace_base
        self.max_projects = settings.max_projects
        self.max_sessions_per_project = settings.max_sessions_per_project

    def _model_to_pydantic(self, model: ProjectModel) -> Project:
        """SQLAlchemyモデルをPydanticモデルに変換"""
        return Project.model_validate(model)

    async def create_project(
        self,
        name: str,
        user_id: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Project:
        """
        新規プロジェクト作成

        Args:
            name: プロジェクト名
            user_id: ユーザー識別子 (オプション)
            description: プロジェクト説明 (オプション)

        Returns:
            Project: 作成されたプロジェクト

        Raises:
            MaxProjectsExceededError: 最大プロジェクト数超過
        """
        # プロジェクト数チェック
        project_count = await self._count_projects(user_id)
        if project_count >= self.max_projects:
            raise MaxProjectsExceededError(f"Maximum projects ({self.max_projects}) exceeded")

        # プロジェクト生成
        project_id = generate_id()
        workspace_path = self._get_workspace_path(project_id)
        now = datetime.now(timezone.utc)

        project_model = ProjectModel(
            id=project_id,
            name=name,
            user_id=user_id,
            description=description,
            status="active",
            workspace_path=workspace_path,
            session_count=0,
            created_at=now,
            updated_at=now,
        )

        # ワークスペースディレクトリ作成
        await self._create_workspace(workspace_path)

        # DBに保存
        self.session.add(project_model)
        await self.session.flush()

        logger.info("Project created", project_id=project_id, name=name)
        return self._model_to_pydantic(project_model)

    async def get_project(self, project_id: str) -> Optional[Project]:
        """
        プロジェクト取得

        Args:
            project_id: プロジェクトID

        Returns:
            Optional[Project]: プロジェクト (存在しない場合 None)
        """
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        project_model = result.scalar_one_or_none()

        if not project_model:
            return None

        return self._model_to_pydantic(project_model)

    async def list_projects(
        self,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
    ) -> List[Project]:
        """
        プロジェクト一覧取得

        Args:
            user_id: ユーザーID (指定時はそのユーザーのプロジェクトのみ)
            limit: 最大取得件数
            offset: オフセット
            search: 検索クエリ (プロジェクト名、説明、セッション名で検索)

        Returns:
            List[Project]: プロジェクトリスト
        """
        stmt = select(ProjectModel).where(ProjectModel.status != "deleted")

        if user_id is not None:
            stmt = stmt.where(ProjectModel.user_id == user_id)

        # 検索クエリがある場合
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            # セッション名でも検索するためにサブクエリを作成
            session_subquery = (
                select(SessionModel.project_id)
                .where(SessionModel.name.ilike(search_term))
                .distinct()
            )
            # プロジェクト名、説明、または関連セッション名でマッチ
            stmt = stmt.where(
                or_(
                    ProjectModel.name.ilike(search_term),
                    ProjectModel.description.ilike(search_term),
                    ProjectModel.id.in_(session_subquery),
                )
            )

        stmt = stmt.order_by(ProjectModel.updated_at.desc()).offset(offset).limit(limit)

        result = await self.session.execute(stmt)
        project_models = result.scalars().all()

        return [self._model_to_pydantic(p) for p in project_models]

    async def update_project(
        self,
        project_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Optional[Project]:
        """
        プロジェクト更新

        Args:
            project_id: プロジェクトID
            name: 新しいプロジェクト名 (オプション)
            description: 新しい説明 (オプション)
            api_key: プロジェクト固有のAPIキー (オプション)

        Returns:
            Optional[Project]: 更新されたプロジェクト
        """
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        project_model = result.scalar_one_or_none()

        if not project_model:
            return None

        if name:
            project_model.name = name
        if description is not None:
            project_model.description = description
        if api_key is not None:
            project_model.api_key = api_key
        project_model.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        logger.info("Project updated", project_id=project_id)
        return self._model_to_pydantic(project_model)

    async def delete_project(self, project_id: str) -> None:
        """
        プロジェクト削除

        注意: 配下のすべてのセッションも削除されます (CASCADE)

        Args:
            project_id: プロジェクトID
        """
        stmt = delete(ProjectModel).where(ProjectModel.id == project_id)
        await self.session.execute(stmt)
        await self.session.flush()

        logger.info("Project deleted", project_id=project_id)

    async def get_session_count(self, project_id: str) -> int:
        """
        プロジェクト配下のセッション数取得

        Args:
            project_id: プロジェクトID

        Returns:
            int: セッション数
        """
        stmt = select(func.count(SessionModel.id)).where(
            SessionModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def increment_session_count(self, project_id: str) -> None:
        """セッション数をインクリメント"""
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        project_model = result.scalar_one_or_none()

        if project_model:
            project_model.session_count += 1
            project_model.updated_at = datetime.now(timezone.utc)
            await self.session.flush()

    async def decrement_session_count(self, project_id: str) -> None:
        """セッション数をデクリメント"""
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        project_model = result.scalar_one_or_none()

        if project_model:
            project_model.session_count = max(0, project_model.session_count - 1)
            project_model.updated_at = datetime.now(timezone.utc)
            await self.session.flush()

    async def _count_projects(self, user_id: Optional[str] = None) -> int:
        """プロジェクト数カウント"""
        stmt = select(func.count(ProjectModel.id)).where(ProjectModel.status != "deleted")

        if user_id:
            stmt = stmt.where(ProjectModel.user_id == user_id)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _get_workspace_path(self, project_id: str) -> str:
        """ワークスペースパス取得"""
        return os.path.join(self.workspace_base, project_id)

    async def _create_workspace(self, path: str) -> None:
        """ワークスペースディレクトリ作成"""
        os.makedirs(path, exist_ok=True)
        logger.info("Workspace created", path=path)
