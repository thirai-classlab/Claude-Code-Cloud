"""
Session Management API

セッション管理エンドポイント
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.session_manager import SessionManager
from app.models.errors import AppException
from app.models.messages import MessageRole
from app.schemas.request import CreateSessionRequest, UpdateSessionRequest, SaveMessageRequest
from app.schemas.response import (
    SessionListResponse,
    SessionResponse,
    ChatMessageResponse,
    MessageHistoryResponse,
)
from app.utils.database import get_session_context
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    request: CreateSessionRequest,
) -> SessionResponse:
    """
    セッション作成

    Args:
        request: セッション作成リクエスト

    Returns:
        SessionResponse: 作成されたセッション
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)
            new_session = await manager.create_session(
                project_id=request.project_id,
                name=request.name,
                user_id=request.user_id,
                model=request.model,
            )

            return SessionResponse(**new_session.model_dump())

    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error creating session", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    project_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> SessionListResponse:
    """
    セッション一覧取得

    Args:
        project_id: プロジェクトID (フィルタ用)
        limit: 最大取得件数
        offset: オフセット

    Returns:
        SessionListResponse: セッション一覧
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)
            sessions = await manager.list_sessions(
                project_id=project_id, limit=limit, offset=offset
            )

            return SessionListResponse(
                sessions=[SessionResponse(**s.model_dump()) for s in sessions],
                total=len(sessions),
                limit=limit,
                offset=offset,
            )

    except Exception as e:
        logger.error("Error listing sessions", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
) -> SessionResponse:
    """
    セッション取得

    Args:
        session_id: セッションID

    Returns:
        SessionResponse: セッション
    """
    async with get_session_context() as session:
        manager = SessionManager(session)
        target_session = await manager.get_session(session_id)

        if not target_session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        return SessionResponse(**target_session.model_dump())


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
) -> SessionResponse:
    """
    セッション更新

    Args:
        session_id: セッションID
        request: セッション更新リクエスト

    Returns:
        SessionResponse: 更新されたセッション
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)
            updated_session = await manager.update_session(
                session_id=session_id,
                name=request.name,
            )

            if not updated_session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

            return SessionResponse(**updated_session.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating session", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{session_id}/close", response_model=SessionResponse)
async def close_session(
    session_id: str,
) -> SessionResponse:
    """
    セッションクローズ

    Args:
        session_id: セッションID

    Returns:
        SessionResponse: クローズされたセッション
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)
            closed_session = await manager.close_session(session_id)

            if not closed_session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

            return SessionResponse(**closed_session.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error closing session", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
) -> None:
    """
    セッション削除

    Args:
        session_id: セッションID
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)

            # セッション存在確認
            target_session = await manager.get_session(session_id)
            if not target_session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

            # メッセージも削除
            await manager.delete_messages(session_id)

            await manager.delete_session(session_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting session", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# メッセージ履歴エンドポイント
@router.get("/{session_id}/messages", response_model=MessageHistoryResponse)
async def get_session_messages(
    session_id: str,
    limit: Optional[int] = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> MessageHistoryResponse:
    """
    セッションのメッセージ履歴取得

    Args:
        session_id: セッションID
        limit: 最大取得件数
        offset: オフセット

    Returns:
        MessageHistoryResponse: メッセージ履歴
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)

            # セッション存在確認
            target_session = await manager.get_session(session_id)
            if not target_session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting session messages", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{session_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def save_session_message(
    session_id: str,
    request: SaveMessageRequest,
) -> ChatMessageResponse:
    """
    セッションにメッセージを保存

    Args:
        session_id: セッションID
        request: メッセージ保存リクエスト

    Returns:
        ChatMessageResponse: 保存されたメッセージ
    """
    try:
        async with get_session_context() as session:
            manager = SessionManager(session)

            # セッション存在確認
            target_session = await manager.get_session(session_id)
            if not target_session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error saving session message", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
