"""
Project Management API

プロジェクト管理エンドポイント
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_project_manager, get_session_manager
from app.api.middleware import handle_exceptions
from app.core.project_manager import ProjectManager
from app.core.security.validator import InputValidator
from app.core.session_manager import SessionManager
from app.schemas.request import CreateProjectRequest, CreateSessionRequest, UpdateProjectRequest
from app.schemas.response import ProjectListResponse, ProjectResponse, SessionListResponse, SessionResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
@handle_exceptions
async def create_project(
    request: CreateProjectRequest,
    manager: ProjectManager = Depends(get_project_manager),
) -> ProjectResponse:
    """
    プロジェクト作成

    Args:
        request: プロジェクト作成リクエスト
        manager: プロジェクトマネージャー (DI)

    Returns:
        ProjectResponse: 作成されたプロジェクト
    """
    # バリデーション
    InputValidator.validate_project_name(request.name)

    # プロジェクト作成
    project = await manager.create_project(
        name=request.name,
        user_id=request.user_id,
        description=request.description,
    )

    return ProjectResponse(**project.model_dump())


@router.get("", response_model=ProjectListResponse)
@handle_exceptions
async def list_projects(
    user_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    manager: ProjectManager = Depends(get_project_manager),
) -> ProjectListResponse:
    """
    プロジェクト一覧取得

    Args:
        user_id: ユーザーID (フィルタ用)
        limit: 最大取得件数
        offset: オフセット
        manager: プロジェクトマネージャー (DI)

    Returns:
        ProjectListResponse: プロジェクト一覧
    """
    projects = await manager.list_projects(user_id=user_id, limit=limit, offset=offset)

    return ProjectListResponse(
        projects=[ProjectResponse(**p.model_dump()) for p in projects],
        total=len(projects),
        limit=limit,
        offset=offset,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
@handle_exceptions
async def get_project(
    project_id: str,
    manager: ProjectManager = Depends(get_project_manager),
) -> ProjectResponse:
    """
    プロジェクト取得

    Args:
        project_id: プロジェクトID
        manager: プロジェクトマネージャー (DI)

    Returns:
        ProjectResponse: プロジェクト
    """
    project = await manager.get_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    return ProjectResponse(**project.model_dump())


@router.put("/{project_id}", response_model=ProjectResponse)
@handle_exceptions
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    manager: ProjectManager = Depends(get_project_manager),
) -> ProjectResponse:
    """
    プロジェクト更新

    Args:
        project_id: プロジェクトID
        request: プロジェクト更新リクエスト
        manager: プロジェクトマネージャー (DI)

    Returns:
        ProjectResponse: 更新されたプロジェクト
    """
    if request.name:
        InputValidator.validate_project_name(request.name)

    project = await manager.update_project(
        project_id=project_id,
        name=request.name,
        description=request.description,
    )

    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    return ProjectResponse(**project.model_dump())


@router.delete("/{project_id}", status_code=204)
@handle_exceptions
async def delete_project(
    project_id: str,
    manager: ProjectManager = Depends(get_project_manager),
) -> None:
    """
    プロジェクト削除

    Args:
        project_id: プロジェクトID
        manager: プロジェクトマネージャー (DI)
    """
    # プロジェクト存在確認
    project = await manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    await manager.delete_project(project_id)


# プロジェクト配下のセッション管理エンドポイント


@router.get("/{project_id}/sessions", response_model=SessionListResponse)
@handle_exceptions
async def get_project_sessions(
    project_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
) -> SessionListResponse:
    """
    プロジェクト配下のセッション一覧取得

    Args:
        project_id: プロジェクトID
        limit: 最大取得件数
        offset: オフセット
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)

    Returns:
        SessionListResponse: セッション一覧
    """
    # プロジェクト存在確認
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # プロジェクト配下のセッション取得
    sessions = await session_manager.list_sessions(
        project_id=project_id, limit=limit, offset=offset
    )

    return SessionListResponse(
        sessions=[SessionResponse(**s.model_dump()) for s in sessions],
        total=len(sessions),
        limit=limit,
        offset=offset,
    )


@router.post("/{project_id}/sessions", response_model=SessionResponse, status_code=201)
@handle_exceptions
async def create_project_session(
    project_id: str,
    request: CreateSessionRequest,
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
) -> SessionResponse:
    """
    プロジェクト配下に新規セッション作成

    Args:
        project_id: プロジェクトID
        request: セッション作成リクエスト
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)

    Returns:
        SessionResponse: 作成されたセッション
    """
    # プロジェクト存在確認
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # セッション作成（project_idを強制上書き）
    new_session = await session_manager.create_session(
        project_id=project_id,
        name=request.name,
        user_id=request.user_id,
        model=request.model,
    )

    # プロジェクトのセッション数をインクリメント
    await project_manager.increment_session_count(project_id)

    return SessionResponse(**new_session.model_dump())


@router.delete("/{project_id}/sessions/{session_id}", status_code=204)
@handle_exceptions
async def delete_project_session(
    project_id: str,
    session_id: str,
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
) -> None:
    """
    プロジェクト配下のセッション削除

    Args:
        project_id: プロジェクトID
        session_id: セッションID
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)
    """
    # セッション存在確認
    target_session = await session_manager.get_session(session_id)
    if not target_session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # プロジェクト所属確認
    if target_session.project_id != project_id:
        raise HTTPException(
            status_code=400, detail=f"Session {session_id} does not belong to project {project_id}"
        )

    # セッション削除
    await session_manager.delete_session(session_id)

    # プロジェクトのセッション数をデクリメント
    await project_manager.decrement_session_count(project_id)
