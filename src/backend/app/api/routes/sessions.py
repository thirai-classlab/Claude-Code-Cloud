"""
Session Management API

セッション管理エンドポイント
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_session_manager
from app.api.middleware import handle_exceptions
from app.core.session_manager import SessionManager
from app.models.errors import SessionNotFoundError
from app.models.messages import MessageRole
from app.schemas.request import CreateSessionRequest, UpdateSessionRequest, SaveMessageRequest
from app.schemas.response import (
    SessionListResponse,
    SessionResponse,
    ChatMessageResponse,
    MessageHistoryResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
@handle_exceptions
async def create_session(
    request: CreateSessionRequest,
    manager: SessionManager = Depends(get_session_manager),
) -> SessionResponse:
    """
    セッション作成

    Args:
        request: セッション作成リクエスト
        manager: セッションマネージャー (DI)

    Returns:
        SessionResponse: 作成されたセッション
    """
    new_session = await manager.create_session(
        project_id=request.project_id,
        name=request.name,
        user_id=request.user_id,
        model=request.model,
    )

    return SessionResponse(**new_session.model_dump())


@router.get("", response_model=SessionListResponse)
@handle_exceptions
async def list_sessions(
    project_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    manager: SessionManager = Depends(get_session_manager),
) -> SessionListResponse:
    """
    セッション一覧取得

    Args:
        project_id: プロジェクトID (フィルタ用)
        limit: 最大取得件数
        offset: オフセット
        manager: セッションマネージャー (DI)

    Returns:
        SessionListResponse: セッション一覧
    """
    sessions = await manager.list_sessions(
        project_id=project_id, limit=limit, offset=offset
    )

    return SessionListResponse(
        sessions=[SessionResponse(**s.model_dump()) for s in sessions],
        total=len(sessions),
        limit=limit,
        offset=offset,
    )


@router.get("/{session_id}", response_model=SessionResponse)
@handle_exceptions
async def get_session(
    session_id: str,
    manager: SessionManager = Depends(get_session_manager),
) -> SessionResponse:
    """
    セッション取得

    Args:
        session_id: セッションID
        manager: セッションマネージャー (DI)

    Returns:
        SessionResponse: セッション
    """
    target_session = await manager.get_session(session_id)

    if not target_session:
        raise SessionNotFoundError(session_id)

    return SessionResponse(**target_session.model_dump())


@router.put("/{session_id}", response_model=SessionResponse)
@handle_exceptions
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    manager: SessionManager = Depends(get_session_manager),
) -> SessionResponse:
    """
    セッション更新

    Args:
        session_id: セッションID
        request: セッション更新リクエスト
        manager: セッションマネージャー (DI)

    Returns:
        SessionResponse: 更新されたセッション
    """
    updated_session = await manager.update_session(
        session_id=session_id,
        name=request.name,
    )

    if not updated_session:
        raise SessionNotFoundError(session_id)

    return SessionResponse(**updated_session.model_dump())


@router.post("/{session_id}/close", response_model=SessionResponse)
@handle_exceptions
async def close_session(
    session_id: str,
    manager: SessionManager = Depends(get_session_manager),
) -> SessionResponse:
    """
    セッションクローズ

    Args:
        session_id: セッションID
        manager: セッションマネージャー (DI)

    Returns:
        SessionResponse: クローズされたセッション
    """
    closed_session = await manager.close_session(session_id)

    if not closed_session:
        raise SessionNotFoundError(session_id)

    return SessionResponse(**closed_session.model_dump())


@router.delete("/{session_id}", status_code=204)
@handle_exceptions
async def delete_session(
    session_id: str,
    manager: SessionManager = Depends(get_session_manager),
) -> None:
    """
    セッション削除

    Args:
        session_id: セッションID
        manager: セッションマネージャー (DI)
    """
    # セッション存在確認
    target_session = await manager.get_session(session_id)
    if not target_session:
        raise SessionNotFoundError(session_id)

    # メッセージも削除
    await manager.delete_messages(session_id)

    await manager.delete_session(session_id)


# メッセージ履歴エンドポイント
@router.get("/{session_id}/messages", response_model=MessageHistoryResponse)
@handle_exceptions
async def get_session_messages(
    session_id: str,
    limit: Optional[int] = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    manager: SessionManager = Depends(get_session_manager),
) -> MessageHistoryResponse:
    """
    セッションのメッセージ履歴取得

    Args:
        session_id: セッションID
        limit: 最大取得件数
        offset: オフセット
        manager: セッションマネージャー (DI)

    Returns:
        MessageHistoryResponse: メッセージ履歴
    """
    # セッション存在確認
    target_session = await manager.get_session(session_id)
    if not target_session:
        raise SessionNotFoundError(session_id)

    # メッセージ取得
    messages = await manager.get_messages(session_id, limit=limit, offset=offset)

    return MessageHistoryResponse(
        session_id=session_id,
        messages=[
            ChatMessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                role=msg.role.value,
                content=msg.content,
                tokens=msg.tokens,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        total=len(messages),
    )


@router.post("/{session_id}/messages", response_model=ChatMessageResponse, status_code=201)
@handle_exceptions
async def save_session_message(
    session_id: str,
    request: SaveMessageRequest,
    manager: SessionManager = Depends(get_session_manager),
) -> ChatMessageResponse:
    """
    セッションにメッセージを保存

    Args:
        session_id: セッションID
        request: メッセージ保存リクエスト
        manager: セッションマネージャー (DI)

    Returns:
        ChatMessageResponse: 保存されたメッセージ
    """
    # セッション存在確認
    target_session = await manager.get_session(session_id)
    if not target_session:
        raise SessionNotFoundError(session_id)

    # メッセージロール変換
    role = MessageRole(request.role)

    # メッセージ保存
    message = await manager.save_message(
        session_id=session_id, role=role, content=request.content, tokens=request.tokens
    )

    return ChatMessageResponse(
        id=message.id,
        session_id=message.session_id,
        role=message.role.value,
        content=message.content,
        tokens=message.tokens,
        created_at=message.created_at,
    )
