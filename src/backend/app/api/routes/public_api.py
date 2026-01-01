"""
Public API

外部公開エンドポイント（認証不要）
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, Request

from app.api.dependencies import get_db_session, get_public_access_service
from app.api.middleware import handle_exceptions
from app.models.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.schemas.public_access import (
    CreatePublicSessionRequest,
    CreatePublicSessionResponse,
    PublicCommandListResponse,
    PublicCommandResponse,
    PublicProjectInfoResponse,
    VerifyPasswordRequest,
    VerifyPasswordResponse,
)
from app.services.public_access_service import PublicAccessService
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(tags=["public"])


def get_client_ip(request: Request) -> str:
    """クライアントIPを取得"""
    # X-Forwarded-For ヘッダーがある場合は最初のIPを使用
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # X-Real-IP ヘッダー
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # 直接接続
    if request.client:
        return request.client.host

    return "unknown"


@router.get(
    "/public/{token}",
    response_model=PublicProjectInfoResponse,
)
@handle_exceptions
async def get_public_project_info(
    token: str,
    request: Request,
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicProjectInfoResponse:
    """
    公開プロジェクト情報を取得

    パスワード認証前でもアクセス可能な情報のみ返す
    """
    client_ip = get_client_ip(request)

    # トークン検証
    public_access = await public_access_service.get_public_access_by_token(token)
    if not public_access:
        return PublicProjectInfoResponse(
            project_name="",
            description=None,
            requires_password=False,
            is_accessible=False,
            error="Invalid access token",
        )

    # 有効フラグチェック
    if not public_access.enabled:
        return PublicProjectInfoResponse(
            project_name="",
            description=None,
            requires_password=False,
            is_accessible=False,
            error="Public access is disabled",
        )

    # IP制限チェック
    if not public_access_service.check_ip_allowed(public_access, client_ip):
        return PublicProjectInfoResponse(
            project_name="",
            description=None,
            requires_password=False,
            is_accessible=False,
            error="Access denied from your IP address",
        )

    # 期限チェック
    if public_access_service.check_expired(public_access):
        return PublicProjectInfoResponse(
            project_name="",
            description=None,
            requires_password=False,
            is_accessible=False,
            error="Public access has expired",
        )

    # セッション上限チェック
    if await public_access_service.check_session_limit(public_access):
        return PublicProjectInfoResponse(
            project_name="",
            description=None,
            requires_password=False,
            is_accessible=False,
            error="Daily session limit reached",
        )

    return PublicProjectInfoResponse(
        project_name=public_access.project.name,
        description=public_access.project.description,
        requires_password=public_access.password_hash is not None,
        is_accessible=True,
    )


@router.post(
    "/public/{token}/verify-password",
    response_model=VerifyPasswordResponse,
)
@handle_exceptions
async def verify_password(
    token: str,
    request_data: VerifyPasswordRequest,
    request: Request,
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> VerifyPasswordResponse:
    """
    パスワード認証

    パスワード設定時のみ必要
    """
    client_ip = get_client_ip(request)

    # トークン検証
    public_access = await public_access_service.get_public_access_by_token(token)
    if not public_access:
        return VerifyPasswordResponse(
            verified=False,
            error="Invalid access token",
        )

    # 有効フラグチェック
    if not public_access.enabled:
        return VerifyPasswordResponse(
            verified=False,
            error="Public access is disabled",
        )

    # IP制限チェック
    if not public_access_service.check_ip_allowed(public_access, client_ip):
        return VerifyPasswordResponse(
            verified=False,
            error="Access denied from your IP address",
        )

    # パスワード検証
    if not public_access_service.verify_password(public_access, request_data.password):
        return VerifyPasswordResponse(
            verified=False,
            error="Invalid password",
        )

    # セッショントークン生成
    session_token = public_access_service.create_session_token(public_access.id)

    return VerifyPasswordResponse(
        verified=True,
        session_token=session_token,
    )


@router.get(
    "/public/{token}/commands",
    response_model=PublicCommandListResponse,
)
@handle_exceptions
async def list_public_commands(
    token: str,
    request: Request,
    authorization: Optional[str] = Header(default=None),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> PublicCommandListResponse:
    """
    公開コマンド一覧を取得

    パスワード設定時はsession_tokenが必要
    """
    client_ip = get_client_ip(request)

    # トークン検証
    public_access = await public_access_service.get_public_access_by_token(token)
    if not public_access:
        raise NotFoundError("PublicAccess", token)

    # 有効フラグチェック
    if not public_access.enabled:
        raise PermissionDeniedError("Public access is disabled")

    # IP制限チェック
    if not public_access_service.check_ip_allowed(public_access, client_ip):
        raise PermissionDeniedError("Access denied from your IP address")

    # パスワード認証チェック
    if public_access.password_hash:
        if not authorization:
            raise PermissionDeniedError("Authentication required")

        # Bearer token形式
        if not authorization.startswith("Bearer "):
            raise PermissionDeniedError("Invalid authorization format")

        session_token = authorization[7:]
        verified_access_id = public_access_service.verify_session_token(session_token)

        if verified_access_id != public_access.id:
            raise PermissionDeniedError("Invalid or expired session token")

    # 公開コマンド取得
    commands = await public_access_service.get_public_commands(public_access)

    return PublicCommandListResponse(
        commands=[
            PublicCommandResponse(
                id=cmd.id,
                name=cmd.name,
                description=cmd.description,
            )
            for cmd in commands
        ]
    )


@router.post(
    "/public/{token}/sessions",
    response_model=CreatePublicSessionResponse,
    status_code=201,
)
@handle_exceptions
async def create_public_session(
    token: str,
    request_data: CreatePublicSessionRequest,
    request: Request,
    authorization: Optional[str] = Header(default=None),
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> CreatePublicSessionResponse:
    """
    公開セッションを作成
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    # トークン検証
    public_access = await public_access_service.get_public_access_by_token(token)
    if not public_access:
        raise NotFoundError("PublicAccess", token)

    # 有効フラグチェック
    if not public_access.enabled:
        raise PermissionDeniedError("Public access is disabled")

    # IP制限チェック
    if not public_access_service.check_ip_allowed(public_access, client_ip):
        raise PermissionDeniedError("Access denied from your IP address")

    # 期限チェック
    if public_access_service.check_expired(public_access):
        raise PermissionDeniedError("Public access has expired")

    # セッション上限チェック
    if await public_access_service.check_session_limit(public_access):
        raise ValidationError("Daily session limit reached")

    # パスワード認証チェック
    if public_access.password_hash:
        if not authorization:
            raise PermissionDeniedError("Authentication required")

        if not authorization.startswith("Bearer "):
            raise PermissionDeniedError("Invalid authorization format")

        session_token = authorization[7:]
        verified_access_id = public_access_service.verify_session_token(session_token)

        if verified_access_id != public_access.id:
            raise PermissionDeniedError("Invalid or expired session token")

    # セッション作成
    session = await public_access_service.create_public_session(
        public_access=public_access,
        command_id=request_data.command_id,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not session:
        raise ValidationError("Invalid command or command is not public")

    # コマンド情報取得
    commands = await public_access_service.get_public_commands(public_access)
    cmd = next((c for c in commands if c.id == request_data.command_id), None)

    return CreatePublicSessionResponse(
        session_id=session.id,
        command=PublicCommandResponse(
            id=cmd.id if cmd else request_data.command_id,
            name=cmd.name if cmd else "",
            description=cmd.description if cmd else None,
        ),
        limits={
            "max_messages": public_access.max_messages_per_session,
            "remaining_messages": (
                public_access.max_messages_per_session - session.message_count
                if public_access.max_messages_per_session
                else None
            ),
        },
    )


@router.get(
    "/public/sessions/{session_id}",
)
@handle_exceptions
async def get_public_session_info(
    session_id: str,
    request: Request,
    public_access_service: PublicAccessService = Depends(get_public_access_service),
) -> dict:
    """
    公開セッション情報を取得
    """
    client_ip = get_client_ip(request)

    session = await public_access_service.get_public_session(session_id)
    if not session:
        raise NotFoundError("PublicSession", session_id)

    # IP確認（セッション作成時と同じIPからのみアクセス可能）
    if session.ip_address != client_ip:
        raise PermissionDeniedError("Session access denied")

    # メッセージ上限チェック
    at_limit = await public_access_service.check_message_limit(session)

    return {
        "session_id": session.id,
        "command_id": session.command_id,
        "command_name": session.command.name if session.command else None,
        "message_count": session.message_count,
        "max_messages": session.public_access.max_messages_per_session if session.public_access else None,
        "at_limit": at_limit,
    }
