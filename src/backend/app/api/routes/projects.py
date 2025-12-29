"""
Project Management API

プロジェクト管理エンドポイント
認証必須：JWTトークンが必要
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_project_manager, get_session_manager
from app.api.middleware import handle_exceptions
from app.core.auth.users import current_active_user
from app.core.project_manager import ProjectManager
from app.core.security.validator import InputValidator
from app.core.session_manager import SessionManager
from app.models.database import UserModel
from app.schemas.request import CreateProjectRequest, CreateSessionRequest, UpdateProjectRequest
from app.schemas.response import ProjectListResponse, ProjectResponse, SessionListResponse, SessionResponse
from app.schemas.share import SharedProjectInfo
from app.services.permission_service import PermissionService
from app.services.share_service import ShareService

router = APIRouter(prefix="/projects", tags=["projects"])


async def get_permission_service(
    session: AsyncSession = Depends(get_db_session),
) -> PermissionService:
    """PermissionService取得"""
    return PermissionService(session)


async def get_share_service(
    session: AsyncSession = Depends(get_db_session),
) -> ShareService:
    """ShareService取得"""
    return ShareService(session)


@router.post("", response_model=ProjectResponse, status_code=201)
@handle_exceptions
async def create_project(
    request: CreateProjectRequest,
    current_user: UserModel = Depends(current_active_user),
    manager: ProjectManager = Depends(get_project_manager),
) -> ProjectResponse:
    """
    プロジェクト作成（認証必須）

    Args:
        request: プロジェクト作成リクエスト
        current_user: 現在のログインユーザー
        manager: プロジェクトマネージャー (DI)

    Returns:
        ProjectResponse: 作成されたプロジェクト
    """
    # バリデーション
    InputValidator.validate_project_name(request.name)

    # プロジェクト作成（user_idは現在のユーザーに固定）
    project = await manager.create_project(
        name=request.name,
        user_id=current_user.id,
        description=request.description,
    )

    return ProjectResponse(**project.model_dump())


@router.get("", response_model=ProjectListResponse)
@handle_exceptions
async def list_projects(
    current_user: UserModel = Depends(current_active_user),
    include_shared: bool = Query(default=True, description="共有されたプロジェクトも含める"),
    search: Optional[str] = Query(default=None, description="検索クエリ (プロジェクト名、説明、セッション名)"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    manager: ProjectManager = Depends(get_project_manager),
    share_service: ShareService = Depends(get_share_service),
) -> ProjectListResponse:
    """
    プロジェクト一覧取得（認証必須）

    所有プロジェクトと共有されたプロジェクトを返す

    Args:
        current_user: 現在のログインユーザー
        include_shared: 共有されたプロジェクトも含めるか
        search: 検索クエリ (プロジェクト名、説明、セッション名で検索)
        limit: 最大取得件数
        offset: オフセット
        manager: プロジェクトマネージャー (DI)
        share_service: 共有サービス (DI)

    Returns:
        ProjectListResponse: プロジェクト一覧
    """
    # 所有プロジェクト取得（認証ユーザーのプロジェクトのみ）
    owned_projects = await manager.list_projects(
        user_id=current_user.id, limit=limit, offset=offset, search=search
    )
    project_responses = [ProjectResponse(**p.model_dump()) for p in owned_projects]

    # 共有プロジェクトを含める場合
    if include_shared:
        shared_projects = await share_service.list_shared_projects(
            user_id=current_user.id, limit=limit, offset=0
        )
        # 共有プロジェクトをProjectResponseに変換
        for sp in shared_projects:
            # 重複チェック
            if not any(p.id == sp.id for p in project_responses):
                # SharedProjectInfoからProjectResponseを構築
                project_responses.append(
                    ProjectResponse(
                        id=sp.id,
                        name=sp.name,
                        description=sp.description,
                        user_id=sp.owner_id,
                        status="active",
                        workspace_path=None,
                        session_count=0,
                        created_at=sp.shared_at,
                        updated_at=sp.shared_at,
                    )
                )

    return ProjectListResponse(
        projects=project_responses,
        total=len(project_responses),
        limit=limit,
        offset=offset,
    )


@router.get("/shared", response_model=List[SharedProjectInfo])
@handle_exceptions
async def list_shared_projects(
    current_user: UserModel = Depends(current_active_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    share_service: ShareService = Depends(get_share_service),
) -> List[SharedProjectInfo]:
    """
    共有されたプロジェクト一覧取得（認証必須）

    現在のユーザーに共有されているプロジェクトのみを返す

    Args:
        current_user: 現在のログインユーザー
        limit: 最大取得件数
        offset: オフセット
        share_service: 共有サービス (DI)

    Returns:
        List[SharedProjectInfo]: 共有プロジェクト一覧
    """
    return await share_service.list_shared_projects(
        user_id=current_user.id, limit=limit, offset=offset
    )


@router.get("/{project_id}", response_model=ProjectResponse)
@handle_exceptions
async def get_project(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    manager: ProjectManager = Depends(get_project_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> ProjectResponse:
    """
    プロジェクト取得（認証必須）

    Args:
        project_id: プロジェクトID
        current_user: 現在のログインユーザー
        manager: プロジェクトマネージャー (DI)
        permission_service: 権限サービス (DI)

    Returns:
        ProjectResponse: プロジェクト
    """
    project = await manager.get_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # 権限チェック（認証ユーザーがアクセス可能か）
    if not await permission_service.can_access_project(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this project"
        )

    return ProjectResponse(**project.model_dump())


@router.put("/{project_id}", response_model=ProjectResponse)
@handle_exceptions
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    current_user: UserModel = Depends(current_active_user),
    manager: ProjectManager = Depends(get_project_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> ProjectResponse:
    """
    プロジェクト更新（認証必須）

    Args:
        project_id: プロジェクトID
        request: プロジェクト更新リクエスト
        current_user: 現在のログインユーザー
        manager: プロジェクトマネージャー (DI)
        permission_service: 権限サービス (DI)

    Returns:
        ProjectResponse: 更新されたプロジェクト
    """
    # 権限チェック（書き込み権限が必要）
    if not await permission_service.can_write(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update this project"
        )

    if request.name:
        InputValidator.validate_project_name(request.name)

    project = await manager.update_project(
        project_id=project_id,
        name=request.name,
        description=request.description,
        api_key=request.api_key,
    )

    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    return ProjectResponse(**project.model_dump())


@router.delete("/{project_id}", status_code=204)
@handle_exceptions
async def delete_project(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    manager: ProjectManager = Depends(get_project_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """
    プロジェクト削除（認証必須）

    Args:
        project_id: プロジェクトID
        current_user: 現在のログインユーザー
        manager: プロジェクトマネージャー (DI)
        permission_service: 権限サービス (DI)
    """
    # プロジェクト存在確認
    project = await manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # 権限チェック（オーナーのみ削除可能）
    if not await permission_service.is_owner(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="Only the project owner can delete the project"
        )

    await manager.delete_project(project_id)


# プロジェクト配下のセッション管理エンドポイント


@router.get("/{project_id}/sessions", response_model=SessionListResponse)
@handle_exceptions
async def get_project_sessions(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> SessionListResponse:
    """
    プロジェクト配下のセッション一覧取得（認証必須）

    Args:
        project_id: プロジェクトID
        current_user: 現在のログインユーザー
        limit: 最大取得件数
        offset: オフセット
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)
        permission_service: 権限サービス (DI)

    Returns:
        SessionListResponse: セッション一覧
    """
    # プロジェクト存在確認
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # 権限チェック（アクセス権限が必要）
    if not await permission_service.can_access_project(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this project"
        )

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
    current_user: UserModel = Depends(current_active_user),
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> SessionResponse:
    """
    プロジェクト配下に新規セッション作成（認証必須）

    Args:
        project_id: プロジェクトID
        request: セッション作成リクエスト
        current_user: 現在のログインユーザー
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)
        permission_service: 権限サービス (DI)

    Returns:
        SessionResponse: 作成されたセッション
    """
    # プロジェクト存在確認
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # 権限チェック（書き込み権限が必要）
    if not await permission_service.can_write(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create sessions in this project"
        )

    # セッション作成（project_idを強制上書き、user_idは認証ユーザー）
    new_session = await session_manager.create_session(
        project_id=project_id,
        name=request.name,
        user_id=current_user.id,
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
    current_user: UserModel = Depends(current_active_user),
    project_manager: ProjectManager = Depends(get_project_manager),
    session_manager: SessionManager = Depends(get_session_manager),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """
    プロジェクト配下のセッション削除（認証必須）

    Args:
        project_id: プロジェクトID
        session_id: セッションID
        current_user: 現在のログインユーザー
        project_manager: プロジェクトマネージャー (DI)
        session_manager: セッションマネージャー (DI)
        permission_service: 権限サービス (DI)
    """
    # 権限チェック（書き込み権限が必要）
    if not await permission_service.can_write(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete sessions in this project"
        )

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
