"""
Project Share API

プロジェクト共有管理エンドポイント
"""

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_permission_service, get_share_service
from app.api.middleware import handle_exceptions
from app.models.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.models.project_share import PermissionLevel
from app.schemas.share import (
    ProjectShareListResponse,
    ProjectShareResponse,
    ShareProjectRequest,
    UpdateShareRequest,
)
from app.services.permission_service import PermissionService
from app.services.share_service import ShareService


router = APIRouter(tags=["shares"])


@router.post(
    "/projects/{project_id}/shares",
    response_model=ProjectShareResponse,
    status_code=201,
)
@handle_exceptions
async def share_project(
    project_id: str,
    request: ShareProjectRequest,
    current_user_id: str = Query(..., description="現在のユーザーID (認証情報から取得)"),
    permission_service: PermissionService = Depends(get_permission_service),
    share_service: ShareService = Depends(get_share_service),
) -> ProjectShareResponse:
    """
    プロジェクトを共有

    プロジェクトのオーナーまたは admin 権限を持つユーザーのみ実行可能

    Args:
        project_id: プロジェクトID
        request: 共有リクエスト
        current_user_id: 現在のユーザーID
        permission_service: 権限サービス (DI)
        share_service: 共有サービス (DI)

    Returns:
        ProjectShareResponse: 作成された共有情報
    """
    # 権限チェック (オーナーまたはadmin)
    if not await permission_service.can_admin(current_user_id, project_id):
        raise PermissionDeniedError("You don't have permission to share this project")

    # 共有先ユーザーを検索
    target_user = await permission_service.get_user_by_email(request.email)
    if not target_user:
        raise NotFoundError("User", request.email)

    # 自分自身への共有は不可
    if target_user.id == current_user_id:
        raise ValidationError("Cannot share project with yourself")

    # 既存の共有をチェック
    existing_share = await share_service.get_share(project_id, target_user.id)
    if existing_share:
        raise ValidationError(f"Project is already shared with {request.email}")

    # 共有を作成
    share = await share_service.create_share(
        project_id=project_id,
        user_id=target_user.id,
        shared_by=current_user_id,
        permission_level=request.permission_level,
    )

    # 共有元ユーザー情報を取得
    sharer = await permission_service.get_user_by_id(current_user_id)

    return ProjectShareResponse(
        id=share.id,
        project_id=share.project_id,
        user_id=share.user_id,
        user_email=target_user.email,
        user_name=target_user.display_name or target_user.email,
        permission_level=PermissionLevel(share.permission_level),
        shared_by=share.shared_by,
        shared_by_email=sharer.email if sharer else None,
        created_at=share.created_at,
    )


@router.get(
    "/projects/{project_id}/shares",
    response_model=ProjectShareListResponse,
)
@handle_exceptions
async def list_project_shares(
    project_id: str,
    current_user_id: str = Query(..., description="現在のユーザーID (認証情報から取得)"),
    permission_service: PermissionService = Depends(get_permission_service),
    share_service: ShareService = Depends(get_share_service),
) -> ProjectShareListResponse:
    """
    プロジェクトの共有一覧を取得

    プロジェクトにアクセス可能なユーザーのみ実行可能

    Args:
        project_id: プロジェクトID
        current_user_id: 現在のユーザーID
        permission_service: 権限サービス (DI)
        share_service: 共有サービス (DI)

    Returns:
        ProjectShareListResponse: 共有一覧
    """
    # アクセス権チェック
    if not await permission_service.can_access_project(current_user_id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this project",
        )

    shares = await share_service.list_project_shares(project_id)

    return ProjectShareListResponse(
        shares=shares,
        total=len(shares),
    )


@router.put(
    "/projects/{project_id}/shares/{user_id}",
    response_model=ProjectShareResponse,
)
@handle_exceptions
async def update_project_share(
    project_id: str,
    user_id: str,
    request: UpdateShareRequest,
    current_user_id: str = Query(..., description="現在のユーザーID (認証情報から取得)"),
    permission_service: PermissionService = Depends(get_permission_service),
    share_service: ShareService = Depends(get_share_service),
) -> ProjectShareResponse:
    """
    プロジェクト共有の権限レベルを更新

    プロジェクトのオーナーまたは admin 権限を持つユーザーのみ実行可能

    Args:
        project_id: プロジェクトID
        user_id: 共有先ユーザーID
        request: 更新リクエスト
        current_user_id: 現在のユーザーID
        permission_service: 権限サービス (DI)
        share_service: 共有サービス (DI)

    Returns:
        ProjectShareResponse: 更新された共有情報
    """
    # 権限チェック (オーナーまたはadmin)
    if not await permission_service.can_admin(current_user_id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to modify shares for this project",
        )

    # 共有を更新
    share = await share_service.update_share(
        project_id=project_id,
        user_id=user_id,
        permission_level=request.permission_level,
    )

    if not share:
        raise HTTPException(
            status_code=404,
            detail=f"Share not found for user {user_id}",
        )

    # ユーザー情報を取得
    target_user = await permission_service.get_user_by_id(user_id)
    sharer = await permission_service.get_user_by_id(share.shared_by) if share.shared_by else None

    return ProjectShareResponse(
        id=share.id,
        project_id=share.project_id,
        user_id=share.user_id,
        user_email=target_user.email if target_user else "",
        user_name=target_user.display_name or target_user.email if target_user else "",
        permission_level=PermissionLevel(share.permission_level),
        shared_by=share.shared_by,
        shared_by_email=sharer.email if sharer else None,
        created_at=share.created_at,
    )


@router.delete(
    "/projects/{project_id}/shares/{user_id}",
    status_code=204,
)
@handle_exceptions
async def delete_project_share(
    project_id: str,
    user_id: str,
    current_user_id: str = Query(..., description="現在のユーザーID (認証情報から取得)"),
    permission_service: PermissionService = Depends(get_permission_service),
    share_service: ShareService = Depends(get_share_service),
) -> None:
    """
    プロジェクト共有を解除

    プロジェクトのオーナーまたは admin 権限を持つユーザーのみ実行可能
    共有されているユーザー自身も自分の共有を解除可能

    Args:
        project_id: プロジェクトID
        user_id: 共有先ユーザーID
        current_user_id: 現在のユーザーID
        permission_service: 権限サービス (DI)
        share_service: 共有サービス (DI)
    """
    # 自分自身の共有解除、またはadmin権限が必要
    is_self = current_user_id == user_id
    has_admin = await permission_service.can_admin(current_user_id, project_id)

    if not is_self and not has_admin:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to remove this share",
        )

    # 共有を削除
    deleted = await share_service.delete_share(project_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Share not found for user {user_id}",
        )
