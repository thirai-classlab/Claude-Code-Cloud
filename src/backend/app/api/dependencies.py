"""
API Dependencies

FastAPI依存性注入パターン

共通のDependency関数を集約し、各routeファイルから利用します。
"""

from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.project_manager import ProjectManager
from app.core.session_manager import SessionManager
from app.services.file_service import FileService
from app.services.permission_service import PermissionService
from app.services.project_config_service import ProjectConfigService
from app.services.public_access_service import PublicAccessService
from app.services.share_service import ShareService
from app.services.usage_service import UsageService
from app.utils.database import get_session_context


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """データベースセッション取得"""
    async with get_session_context() as session:
        yield session


async def get_project_manager(
    session: AsyncSession = Depends(get_db_session)
) -> ProjectManager:
    """ProjectManager取得"""
    return ProjectManager(session, workspace_base=settings.workspace_base)


async def get_session_manager(
    session: AsyncSession = Depends(get_db_session)
) -> SessionManager:
    """SessionManager取得"""
    return SessionManager(session)


def get_file_service() -> FileService:
    """FileService取得"""
    return FileService(workspace_base=settings.workspace_base)


async def get_permission_service(
    session: AsyncSession = Depends(get_db_session),
) -> PermissionService:
    """PermissionService取得

    プロジェクトへのアクセス権限チェックに使用します。
    """
    return PermissionService(session)


async def get_share_service(
    session: AsyncSession = Depends(get_db_session),
) -> ShareService:
    """ShareService取得

    プロジェクト共有機能に使用します。
    """
    return ShareService(session)


async def get_usage_service(
    session: AsyncSession = Depends(get_db_session),
) -> UsageService:
    """UsageService取得

    使用量統計・利用制限チェックに使用します。
    """
    return UsageService(session)


async def get_project_config_service(
    session: AsyncSession = Depends(get_db_session),
) -> ProjectConfigService:
    """ProjectConfigService取得

    MCP Server, Agent, Skill, CommandのCRUD操作に使用します。
    """
    return ProjectConfigService(session)


async def get_public_access_service(
    session: AsyncSession = Depends(get_db_session),
) -> PublicAccessService:
    """PublicAccessService取得

    外部公開機能に使用します。
    """
    return PublicAccessService(session)
