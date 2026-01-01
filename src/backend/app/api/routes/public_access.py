"""
Public Access API

外部公開管理エンドポイント（認証必須）
"""

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_permission_service, get_public_access_service
from app.api.middleware import handle_exceptions
from app.config import get_settings
from app.core.auth.users import current_active_user
from app.models.database import UserModel
from app.models.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.schemas.public_access import (
    CommandPublicSettingListResponse,
    CommandPublicSettingResponse,
    CommandPublicSettingUpdate,
    PublicAccessCreate,
    PublicAccessResponse,
    PublicAccessStatsResponse,
    PublicAccessUpdate,
    PublicSessionListResponse,
    PublicSessionResponse,
)
from app.services.permission_service import PermissionService
from app.services.public_access_service import PublicAccessService


router = APIRouter(tags=["public-access"])
settings = get_settings()


def build_public_url(access_token: str) -> str:
    """公開URLを生成"""
    base_url = settings.FRONTEND_URL or "http://localhost:3000"
    return f"{base_url}/public/{access_token}"


# ============================================
# Public Access Settings
# ============================================


@router.get(
    "/projects/{project_id}/public-access",
    response_model=PublicAccessResponse,
)
@handle_exceptions
async def get_public_access(
    project_id: str,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicAccessResponse:
    """
    外部公開設定を取得

    プロジェクトにアクセス可能なユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_access_project(user.id, project_id):
        raise PermissionDeniedError("You don't have access to this project")

    public_access = await public_access_service.get_public_access(project_id)
    if not public_access:
        raise NotFoundError("PublicAccess", project_id)

    return PublicAccessResponse(
        id=public_access.id,
        project_id=public_access.project_id,
        access_token=public_access.access_token,
        enabled=public_access.enabled,
        has_password=public_access.password_hash is not None,
        allowed_ips=public_access.allowed_ips,
        max_sessions_per_day=public_access.max_sessions_per_day,
        max_messages_per_session=public_access.max_messages_per_session,
        expires_at=public_access.expires_at,
        created_at=public_access.created_at,
        updated_at=public_access.updated_at,
        public_url=build_public_url(public_access.access_token),
    )


@router.post(
    "/projects/{project_id}/public-access",
    response_model=PublicAccessResponse,
    status_code=201,
)
@handle_exceptions
async def create_public_access(
    project_id: str,
    request: PublicAccessCreate,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicAccessResponse:
    """
    外部公開設定を作成

    プロジェクトのオーナーまたはadmin権限を持つユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_admin(user.id, project_id):
        raise PermissionDeniedError("You don't have permission to manage public access")

    try:
        public_access = await public_access_service.create_public_access(
            project_id=project_id,
            enabled=request.enabled,
            password=request.password,
            allowed_ips=request.allowed_ips,
            max_sessions_per_day=request.max_sessions_per_day,
            max_messages_per_session=request.max_messages_per_session,
            expires_at=request.expires_at,
        )
    except ValueError as e:
        raise ValidationError(str(e))

    return PublicAccessResponse(
        id=public_access.id,
        project_id=public_access.project_id,
        access_token=public_access.access_token,
        enabled=public_access.enabled,
        has_password=public_access.password_hash is not None,
        allowed_ips=public_access.allowed_ips,
        max_sessions_per_day=public_access.max_sessions_per_day,
        max_messages_per_session=public_access.max_messages_per_session,
        expires_at=public_access.expires_at,
        created_at=public_access.created_at,
        updated_at=public_access.updated_at,
        public_url=build_public_url(public_access.access_token),
    )


@router.put(
    "/projects/{project_id}/public-access",
    response_model=PublicAccessResponse,
)
@handle_exceptions
async def update_public_access(
    project_id: str,
    request: PublicAccessUpdate,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicAccessResponse:
    """
    外部公開設定を更新

    プロジェクトのオーナーまたはadmin権限を持つユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_admin(user.id, project_id):
        raise PermissionDeniedError("You don't have permission to manage public access")

    public_access = await public_access_service.update_public_access(
        project_id=project_id,
        enabled=request.enabled,
        password=request.password,
        clear_password=request.clear_password or False,
        allowed_ips=request.allowed_ips,
        max_sessions_per_day=request.max_sessions_per_day,
        max_messages_per_session=request.max_messages_per_session,
        expires_at=request.expires_at,
        clear_expires_at=request.clear_expires_at or False,
    )

    if not public_access:
        raise NotFoundError("PublicAccess", project_id)

    return PublicAccessResponse(
        id=public_access.id,
        project_id=public_access.project_id,
        access_token=public_access.access_token,
        enabled=public_access.enabled,
        has_password=public_access.password_hash is not None,
        allowed_ips=public_access.allowed_ips,
        max_sessions_per_day=public_access.max_sessions_per_day,
        max_messages_per_session=public_access.max_messages_per_session,
        expires_at=public_access.expires_at,
        created_at=public_access.created_at,
        updated_at=public_access.updated_at,
        public_url=build_public_url(public_access.access_token),
    )


@router.delete(
    "/projects/{project_id}/public-access",
    status_code=204,
)
@handle_exceptions
async def delete_public_access(
    project_id: str,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> None:
    """
    外部公開設定を削除

    プロジェクトのオーナーまたはadmin権限を持つユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_admin(user.id, project_id):
        raise PermissionDeniedError("You don't have permission to manage public access")

    deleted = await public_access_service.delete_public_access(project_id)
    if not deleted:
        raise NotFoundError("PublicAccess", project_id)


@router.post(
    "/projects/{project_id}/public-access/regenerate-token",
    response_model=PublicAccessResponse,
)
@handle_exceptions
async def regenerate_token(
    project_id: str,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicAccessResponse:
    """
    アクセストークンを再生成

    プロジェクトのオーナーまたはadmin権限を持つユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_admin(user.id, project_id):
        raise PermissionDeniedError("You don't have permission to manage public access")

    new_token = await public_access_service.regenerate_token(project_id)
    if not new_token:
        raise NotFoundError("PublicAccess", project_id)

    # 更新後の情報を取得
    public_access = await public_access_service.get_public_access(project_id)

    return PublicAccessResponse(
        id=public_access.id,
        project_id=public_access.project_id,
        access_token=public_access.access_token,
        enabled=public_access.enabled,
        has_password=public_access.password_hash is not None,
        allowed_ips=public_access.allowed_ips,
        max_sessions_per_day=public_access.max_sessions_per_day,
        max_messages_per_session=public_access.max_messages_per_session,
        expires_at=public_access.expires_at,
        created_at=public_access.created_at,
        updated_at=public_access.updated_at,
        public_url=build_public_url(public_access.access_token),
    )


# ============================================
# Command Public Settings
# ============================================


@router.get(
    "/projects/{project_id}/commands/public-settings",
    response_model=CommandPublicSettingListResponse,
)
@handle_exceptions
async def list_command_public_settings(
    project_id: str,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> CommandPublicSettingListResponse:
    """
    コマンド公開設定一覧を取得

    プロジェクトにアクセス可能なユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_access_project(user.id, project_id):
        raise PermissionDeniedError("You don't have access to this project")

    settings_list = await public_access_service.get_command_public_settings(project_id)

    return CommandPublicSettingListResponse(
        commands=[
            CommandPublicSettingResponse(**s) for s in settings_list
        ],
        total=len(settings_list),
    )


@router.put(
    "/projects/{project_id}/commands/{command_id}/public-setting",
    response_model=CommandPublicSettingResponse,
)
@handle_exceptions
async def update_command_public_setting(
    project_id: str,
    command_id: str,
    request: CommandPublicSettingUpdate,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> CommandPublicSettingResponse:
    """
    コマンド公開設定を更新

    プロジェクトのオーナーまたはadmin権限を持つユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_admin(user.id, project_id):
        raise PermissionDeniedError("You don't have permission to manage public access")

    setting = await public_access_service.update_command_public_setting(
        command_id=command_id,
        is_public=request.is_public,
        priority=request.priority,
    )

    if not setting:
        raise NotFoundError("Command", command_id)

    # コマンド情報を取得
    settings_list = await public_access_service.get_command_public_settings(project_id)
    cmd_setting = next((s for s in settings_list if s["command_id"] == command_id), None)

    if not cmd_setting:
        raise NotFoundError("Command", command_id)

    return CommandPublicSettingResponse(**cmd_setting)


# ============================================
# Public Sessions & Stats
# ============================================


@router.get(
    "/projects/{project_id}/public-access/sessions",
    response_model=PublicSessionListResponse,
)
@handle_exceptions
async def list_public_sessions(
    project_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicSessionListResponse:
    """
    公開セッション一覧を取得

    プロジェクトにアクセス可能なユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_access_project(user.id, project_id):
        raise PermissionDeniedError("You don't have access to this project")

    sessions, total = await public_access_service.list_public_sessions(
        project_id=project_id,
        limit=limit,
        offset=offset,
    )

    return PublicSessionListResponse(
        sessions=[
            PublicSessionResponse(
                id=s.id,
                command_id=s.command_id,
                command_name=s.command.name if s.command else None,
                ip_address=s.ip_address,
                user_agent=s.user_agent,
                message_count=s.message_count,
                created_at=s.created_at,
                last_activity_at=s.last_activity_at,
            )
            for s in sessions
        ],
        total=total,
    )


@router.get(
    "/projects/{project_id}/public-access/stats",
    response_model=PublicAccessStatsResponse,
)
@handle_exceptions
async def get_public_access_stats(
    project_id: str,
    user: UserModel = Depends(current_active_user),
    permission_service: PermissionService = Depends(get_permission_service),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicAccessStatsResponse:
    """
    アクセス統計を取得

    プロジェクトにアクセス可能なユーザーのみ実行可能
    """
    # 権限チェック
    if not await permission_service.can_access_project(user.id, project_id):
        raise PermissionDeniedError("You don't have access to this project")

    stats = await public_access_service.get_public_access_stats(project_id)

    return PublicAccessStatsResponse(**stats)
