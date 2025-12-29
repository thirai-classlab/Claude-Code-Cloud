"""
API Dependencies

FastAPI依存性注入パターン
"""

from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.project_manager import ProjectManager
from app.core.session_manager import SessionManager
from app.services.file_service import FileService
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
