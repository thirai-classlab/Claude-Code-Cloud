"""
Public WebSocket Handlers

外部公開用WebSocket接続とメッセージ処理
"""

import asyncio
import json
import os
import time
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)

from app.config import settings
from app.core.chat_processor import ChatMessageProcessor
from app.models.database import PublicSessionModel, ProjectCommandModel
from app.services.public_access_service import PublicAccessService
from app.utils.database import get_session_context
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PublicConnectionManager:
    """公開WebSocket接続管理"""

    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}
        self.processing: Dict[str, bool] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """WebSocket接続を受け入れる"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.processing[session_id] = False

        await self.send_message(session_id, {
            "type": "connected",
            "session_id": session_id,
            "timestamp": time.time(),
        })

        logger.info("Public WebSocket connected", session_id=session_id)

    def disconnect(self, session_id: str) -> None:
        """WebSocket接続を切断"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.processing:
            del self.processing[session_id]
        logger.info("Public WebSocket disconnected", session_id=session_id)

    async def send_message(self, session_id: str, message: dict) -> None:
        """メッセージを送信"""
        websocket = self.active_connections.get(session_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error("Failed to send message", session_id=session_id, error=str(e))

    def is_processing(self, session_id: str) -> bool:
        """処理中かどうかを確認"""
        return self.processing.get(session_id, False)

    def set_processing(self, session_id: str, is_processing: bool) -> None:
        """処理中フラグを設定"""
        self.processing[session_id] = is_processing


# グローバル接続マネージャー
public_connection_manager = PublicConnectionManager()


async def handle_public_chat_websocket(
    websocket: WebSocket,
    token: str,
    session_id: str,
) -> None:
    """
    公開チャットWebSocketハンドラー

    Args:
        websocket: WebSocketインスタンス
        token: 公開アクセストークン
        session_id: 公開セッションID
    """
    async with get_session_context() as db_session:
        public_service = PublicAccessService(db_session)

        # 公開セッション取得
        public_session = await public_service.get_public_session(session_id)
        if not public_session:
            logger.warning("Public session not found", session_id=session_id)
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "error": "Session not found",
                "code": "session_not_found",
            })
            await websocket.close()
            return

        # トークン検証
        if public_session.public_access.access_token != token:
            logger.warning("Token mismatch", session_id=session_id)
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "error": "Invalid token",
                "code": "invalid_token",
            })
            await websocket.close()
            return

        # 有効フラグチェック
        if not public_session.public_access.enabled:
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "error": "Public access is disabled",
                "code": "access_disabled",
            })
            await websocket.close()
            return

        # 期限チェック
        if public_service.check_expired(public_session.public_access):
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "error": "Public access has expired",
                "code": "access_expired",
            })
            await websocket.close()
            return

        # コマンドとプロジェクト情報を取得
        command = public_session.command
        project_id = public_session.public_access.project_id
        workspace_path = os.path.join(settings.workspace_base, project_id)

    # 接続確立
    await public_connection_manager.connect(session_id, websocket)

    try:
        # メッセージループ
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.warning("Failed to receive message", session_id=session_id, error=str(e))
                continue

            try:
                message_data = json.loads(data)
            except json.JSONDecodeError as e:
                logger.warning("Invalid JSON received", session_id=session_id, error=str(e))
                await public_connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": f"Invalid JSON: {str(e)}",
                    "code": "invalid_json",
                })
                continue

            message_type = message_data.get("type", "chat")

            if message_type == "chat":
                content = message_data.get("content", "")
                if content:
                    asyncio.create_task(_handle_public_chat(
                        session_id, content, project_id, workspace_path, command
                    ))

            elif message_type == "ping":
                await public_connection_manager.send_message(session_id, {
                    "type": "pong",
                    "timestamp": time.time(),
                })

    except WebSocketDisconnect:
        logger.info("Public WebSocket disconnected by client", session_id=session_id)
    except Exception as e:
        logger.error("Public WebSocket error", error=str(e), session_id=session_id, exc_info=True)
    finally:
        public_connection_manager.disconnect(session_id)


async def _handle_public_chat(
    session_id: str,
    content: str,
    project_id: str,
    workspace_path: str,
    command: Optional[ProjectCommandModel],
) -> None:
    """公開チャットメッセージを処理"""
    if public_connection_manager.is_processing(session_id):
        await public_connection_manager.send_message(session_id, {
            "type": "error",
            "error": "Already processing a message",
            "code": "already_processing",
        })
        return

    public_connection_manager.set_processing(session_id, True)

    try:
        async with get_session_context() as db_session:
            public_service = PublicAccessService(db_session)

            # セッション取得
            public_session = await public_service.get_public_session(session_id)
            if not public_session:
                await public_connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": "Session not found",
                    "code": "session_not_found",
                })
                return

            # メッセージ上限チェック
            if await public_service.check_message_limit(public_session):
                await public_connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": "Message limit reached",
                    "code": "message_limit",
                })
                return

            # コマンドのプロンプトを取得
            system_prompt = None
            if command and command.content:
                system_prompt = command.content

            # ChatMessageProcessor で設定読み込み
            processor = ChatMessageProcessor(db_session, project_id)
            config = await processor.load_config()

            if not config:
                await public_connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": "Project not found",
                    "code": "project_not_found",
                })
                return

            # APIキー検証
            api_key_error = processor.validate_api_key(config)
            if api_key_error:
                await public_connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": api_key_error,
                    "code": "api_key_error",
                })
                return

            # Thinking状態通知
            await public_connection_manager.send_message(session_id, {
                "type": "thinking",
                "timestamp": time.time(),
            })

            # SDK オプション構築（公開用はシンプルに）
            options = processor.build_sdk_options(
                config,
                resume_session_id=public_session.sdk_session_id,
                system_prompt_override=system_prompt,
            )

            # ストリーミング処理
            full_response, usage_info, new_sdk_session_id = await _stream_public_response(
                session_id, options, content
            )

            # SDKセッションIDを更新
            if new_sdk_session_id and new_sdk_session_id != public_session.sdk_session_id:
                public_session.sdk_session_id = new_sdk_session_id
                await db_session.commit()

            # メッセージカウントをインクリメント
            await public_service.increment_message_count(session_id)

            # 完了通知
            remaining = None
            if public_session.public_access.max_messages_per_session:
                remaining = public_session.public_access.max_messages_per_session - (public_session.message_count + 1)

            await public_connection_manager.send_message(session_id, {
                "type": "result",
                "usage": usage_info,
                "remaining_messages": remaining,
                "timestamp": time.time(),
            })

    except Exception as e:
        logger.error("Error in public chat handler", error=str(e), exc_info=True)
        await public_connection_manager.send_message(session_id, {
            "type": "error",
            "error": str(e),
            "code": "chat_error",
        })
    finally:
        public_connection_manager.set_processing(session_id, False)


async def _stream_public_response(
    session_id: str,
    options: ClaudeAgentOptions,
    content: str,
) -> tuple[str, dict, Optional[str]]:
    """
    公開用ストリーミングレスポンス処理（シンプル版）

    Args:
        session_id: セッションID
        options: Claude Agent SDK オプション
        content: ユーザーメッセージ

    Returns:
        tuple[str, dict, Optional[str]]: (応答テキスト, 使用量情報, SDKセッションID)
    """
    full_response = ""
    usage_info = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_cost_usd": 0,
        "duration_ms": 0,
    }
    sdk_session_id: Optional[str] = None
    start_time = time.time()

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(content)

            async for sdk_message in client.receive_response():
                # 接続確認
                if session_id not in public_connection_manager.active_connections:
                    logger.warning("Connection lost during streaming", session_id=session_id)
                    break

                if isinstance(sdk_message, AssistantMessage):
                    for block in sdk_message.content:
                        if isinstance(block, TextBlock):
                            full_response += block.text
                            await public_connection_manager.send_message(session_id, {
                                "type": "text",
                                "content": block.text,
                                "timestamp": time.time(),
                            })
                        elif isinstance(block, ToolUseBlock):
                            # 公開版ではツール使用は通知のみ
                            await public_connection_manager.send_message(session_id, {
                                "type": "tool_use",
                                "tool": block.name,
                                "timestamp": time.time(),
                            })

                elif isinstance(sdk_message, ResultMessage):
                    usage_info = {
                        "total_cost_usd": getattr(sdk_message, "total_cost_usd", 0),
                        "duration_ms": getattr(sdk_message, "duration_ms", 0),
                        "input_tokens": (
                            getattr(sdk_message.usage, "input_tokens", 0)
                            if hasattr(sdk_message, "usage")
                            else 0
                        ),
                        "output_tokens": (
                            getattr(sdk_message.usage, "output_tokens", 0)
                            if hasattr(sdk_message, "usage")
                            else 0
                        ),
                    }
                    sdk_session_id = getattr(sdk_message, "session_id", None)

    except Exception as e:
        logger.error("Error during public streaming", session_id=session_id, error=str(e), exc_info=True)
        raise

    # 実際の処理時間を計算
    if usage_info["duration_ms"] == 0:
        usage_info["duration_ms"] = int((time.time() - start_time) * 1000)

    return full_response, usage_info, sdk_session_id
