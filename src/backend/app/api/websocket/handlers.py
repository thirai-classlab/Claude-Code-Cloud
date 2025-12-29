"""
WebSocket Handlers

WebSocket接続とメッセージ処理
Claude Agent SDKを直接使用したリアルタイムチャット
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

from fastapi import WebSocket, WebSocketDisconnect

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
)

from app.config import settings
from app.core.config_loader import (
    load_project_config,
    generate_enhanced_system_prompt,
    get_enabled_tools,
)
from app.core.session_manager import SessionManager
from app.schemas.websocket import WSChatMessage, WSErrorMessage
from app.utils.database import get_session_context
from app.utils.logger import get_logger

logger = get_logger(__name__)

# デフォルトツール一覧
DEFAULT_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]


class ConnectionManager:
    """
    WebSocket接続管理

    アクティブな接続を管理し、メッセージのブロードキャストを行います。
    """

    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """WebSocket接続を受け入れる"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info("WebSocket connected", session_id=session_id)

    def disconnect(self, session_id: str) -> None:
        """WebSocket接続を切断"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info("WebSocket disconnected", session_id=session_id)

    async def send_message(self, session_id: str, message: dict) -> None:
        """特定のセッションにメッセージを送信"""
        websocket = self.active_connections.get(session_id)
        if websocket:
            await websocket.send_json(message)

    async def send_text(self, session_id: str, text: str) -> None:
        """特定のセッションにテキストを送信"""
        websocket = self.active_connections.get(session_id)
        if websocket:
            await websocket.send_text(text)


# グローバル接続マネージャー
connection_manager = ConnectionManager()


async def handle_chat_websocket(
    websocket: WebSocket, session_id: str
) -> None:
    """
    チャットWebSocketハンドラー

    Args:
        websocket: WebSocketインスタンス
        session_id: セッションID
    """
    import asyncio

    # 接続確立
    await connection_manager.connect(session_id, websocket)

    # セッション存在確認 (データベースセッションを使用)
    async with get_session_context() as db_session:
        session_manager = SessionManager(db_session)
        session = await session_manager.get_session(session_id)

        if not session:
            logger.warning("Session not found", session_id=session_id)
            error_msg = WSErrorMessage(
                type="error", error=f"Session {session_id} not found", code="session_not_found"
            )
            await websocket.send_json(error_msg.model_dump())
            await asyncio.sleep(0.1)
            await websocket.close()
            return

        # ワークスペースパス取得
        workspace_path = os.path.join(settings.workspace_base, session.project_id)
        os.makedirs(workspace_path, exist_ok=True)

    logger.info("Session loaded", session_id=session_id, workspace=workspace_path)

    try:
        # メッセージループ
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_type = message_data.get("type", "chat")

            if message_type == "chat":
                try:
                    chat_msg = WSChatMessage(**message_data)
                    await handle_chat_message(
                        session_id,
                        chat_msg,
                        workspace_path,
                        connection_manager,
                    )
                except Exception as e:
                    logger.error("Error processing chat message", error=str(e))
                    error_msg = WSErrorMessage(
                        type="error", error=str(e), code="processing_error"
                    )
                    await connection_manager.send_message(session_id, error_msg.model_dump())

            elif message_type == "interrupt":
                logger.info("Interrupt requested", session_id=session_id)
                await connection_manager.send_message(
                    session_id, {"type": "interrupted", "message": "Processing interrupted"}
                )

            else:
                error_msg = WSErrorMessage(
                    type="error",
                    error=f"Unknown message type: {message_type}",
                    code="invalid_message_type",
                )
                await connection_manager.send_message(session_id, error_msg.model_dump())

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client", session_id=session_id)
        connection_manager.disconnect(session_id)

    except Exception as e:
        logger.error("WebSocket error", error=str(e), session_id=session_id)
        connection_manager.disconnect(session_id)


async def handle_chat_message(
    session_id: str,
    message: WSChatMessage,
    workspace_path: str,
    conn_manager: ConnectionManager,
) -> None:
    """
    チャットメッセージ処理

    Claude Agent SDKを直接使用してClaudeと通信します。

    Args:
        session_id: セッションID
        message: チャットメッセージ
        workspace_path: ワークスペースパス
        conn_manager: 接続マネージャー
    """
    try:
        # データベースセッションを使用してメッセージ履歴取得・保存
        async with get_session_context() as db_session:
            session_manager = SessionManager(db_session)

            # メッセージ履歴取得
            message_history = await session_manager.get_message_history(session_id)
            existing_message_count = len(message_history)

            # ユーザーメッセージ追加
            user_message = {"role": "user", "content": message.content}
            message_history.append(user_message)

            # Thinking状態通知
            await conn_manager.send_message(session_id, {"type": "thinking"})

            # プロジェクト設定を読み込み (MCP, Agents, Skills, Commands)
            project_config = load_project_config(workspace_path)
            logger.info(
                "Project config loaded",
                session_id=session_id,
                mcp_servers=list(project_config.mcp_servers.keys()),
                agents=list(project_config.agents.keys()),
                skills=list(project_config.skills.keys()),
                commands=list(project_config.commands.keys()),
            )

            # システムプロンプト生成（MCP, Agents, Skills, Commandsを含む）
            system_prompt = generate_enhanced_system_prompt(workspace_path, project_config)

            # ツール一覧取得
            tools = get_enabled_tools(project_config)

            # 応答テキストを蓄積
            full_response_text = ""
            usage_info = {"input_tokens": 0, "output_tokens": 0, "total_cost_usd": 0, "duration_ms": 0}

            # Claude Agent SDK オプション構築
            options = ClaudeAgentOptions(
                system_prompt=system_prompt,
                allowed_tools=tools,
                permission_mode="acceptEdits",
                cwd=Path(workspace_path),
            )

            logger.info(
                "Starting Claude Agent SDK session",
                session_id=session_id,
                tools_count=len(tools),
            )

            # Claude Agent SDK でストリーミング処理
            async with ClaudeSDKClient(options=options) as client:
                # クエリ送信
                await client.query(message.content)

                # ストリーミングレスポンス処理
                async for sdk_message in client.receive_response():
                    if isinstance(sdk_message, AssistantMessage):
                        for block in sdk_message.content:
                            if isinstance(block, TextBlock):
                                # テキストストリーミング
                                full_response_text += block.text
                                await conn_manager.send_message(
                                    session_id,
                                    {"type": "text", "content": block.text}
                                )
                            elif isinstance(block, ToolUseBlock):
                                # ツール使用開始通知
                                await conn_manager.send_message(
                                    session_id,
                                    {
                                        "type": "tool_use_start",
                                        "tool": block.name,
                                        "tool_use_id": block.id,
                                        "input": block.input,
                                    },
                                )

                    elif isinstance(sdk_message, ToolResultBlock):
                        # ツール結果通知
                        await conn_manager.send_message(
                            session_id,
                            {
                                "type": "tool_result",
                                "tool_use_id": sdk_message.tool_use_id,
                                "success": True,
                                "output": str(sdk_message.content),
                            },
                        )

                    elif isinstance(sdk_message, ResultMessage):
                        # 使用量情報
                        usage_info = {
                            "total_cost_usd": getattr(sdk_message, 'total_cost_usd', 0),
                            "duration_ms": getattr(sdk_message, 'duration_ms', 0),
                            "input_tokens": getattr(sdk_message.usage, 'input_tokens', 0) if hasattr(sdk_message, 'usage') else 0,
                            "output_tokens": getattr(sdk_message.usage, 'output_tokens', 0) if hasattr(sdk_message, 'usage') else 0,
                        }

            # メッセージ完了
            logger.info("Message completed", session_id=session_id)

            # 完了通知（使用量情報を含む）
            await conn_manager.send_message(
                session_id,
                {"type": "result", "usage": usage_info},
            )

            # アシスタントメッセージを履歴に追加
            if full_response_text:
                message_history.append({
                    "role": "assistant",
                    "content": [{"type": "text", "text": full_response_text}],
                })

            # メッセージ履歴保存（新規メッセージのみ）
            new_messages = message_history[existing_message_count:]
            if new_messages:
                await session_manager.save_message_history(session_id, new_messages)

            # アクティビティ更新
            await session_manager.update_activity(session_id)

    except Exception as e:
        logger.error("Error in chat message handler", error=str(e), exc_info=True)
        error_msg = WSErrorMessage(type="error", error=str(e), code="chat_error")
        await conn_manager.send_message(session_id, error_msg.model_dump())


def get_default_tools() -> List[str]:
    """デフォルトツール一覧を取得（後方互換性のため維持）"""
    return DEFAULT_TOOLS.copy()
