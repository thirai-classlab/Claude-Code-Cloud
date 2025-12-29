"""
WebSocket Handlers

WebSocket接続とメッセージ処理
Claude Agent SDKを直接使用したリアルタイムチャット
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

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
from app.core.chat_processor import ChatMessageProcessor, ConfigBundle
from app.core.session_manager import SessionManager, MessageSaveError
from app.models.messages import MessageRole
from app.schemas.websocket import WSChatMessage, WSErrorMessage
from app.utils.database import get_session_context
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ConnectionState(str, Enum):
    """WebSocket接続状態"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    PROCESSING = "processing"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"


class ErrorCode(str, Enum):
    """エラーコード定義"""
    SESSION_NOT_FOUND = "session_not_found"
    PROJECT_NOT_FOUND = "project_not_found"
    API_KEY_NOT_CONFIGURED = "api_key_not_configured"
    PROCESSING_ERROR = "processing_error"
    CHAT_ERROR = "chat_error"
    INVALID_MESSAGE_TYPE = "invalid_message_type"
    CONNECTION_TIMEOUT = "connection_timeout"
    STREAM_INTERRUPTED = "stream_interrupted"
    MESSAGE_SAVE_FAILED = "message_save_failed"
    INTERNAL_ERROR = "internal_error"


@dataclass
class SessionState:
    """セッション状態管理"""
    session_id: str
    project_id: str
    workspace_path: str
    state: ConnectionState = ConnectionState.CONNECTED
    is_processing: bool = False
    partial_response: str = ""
    last_activity: float = field(default_factory=time.time)
    message_ack_pending: Dict[str, bool] = field(default_factory=dict)
    reconnect_token: Optional[str] = None


class ConnectionManager:
    """
    WebSocket接続管理

    アクティブな接続を管理し、メッセージのブロードキャストを行います。
    ping/pong機能、タイムアウト管理、メッセージ配信確認を提供します。
    """

    # 設定定数
    PING_INTERVAL = 30  # ping送信間隔（秒）
    PONG_TIMEOUT = 10   # pong応答タイムアウト（秒）
    IDLE_TIMEOUT = 300  # アイドルタイムアウト（秒）

    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_states: Dict[str, SessionState] = {}
        self._ping_tasks: Dict[str, asyncio.Task] = {}
        self._message_id_counter: int = 0
        # SDKクライアント管理（セッション継続性のため）
        self._sdk_clients: Dict[str, ClaudeSDKClient] = {}
        self._sdk_client_options: Dict[str, ClaudeAgentOptions] = {}
        self._sdk_client_locks: Dict[str, asyncio.Lock] = {}

    def _generate_message_id(self) -> str:
        """メッセージIDを生成"""
        self._message_id_counter += 1
        return f"msg_{int(time.time() * 1000)}_{self._message_id_counter}"

    async def connect(
        self, session_id: str, websocket: WebSocket, project_id: str = "", workspace_path: str = ""
    ) -> SessionState:
        """WebSocket接続を受け入れる"""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # セッション状態を作成
        state = SessionState(
            session_id=session_id,
            project_id=project_id,
            workspace_path=workspace_path,
            state=ConnectionState.CONNECTED,
        )
        self.session_states[session_id] = state

        # 接続確認メッセージを送信
        await self.send_message(session_id, {
            "type": "connected",
            "session_id": session_id,
            "timestamp": time.time(),
        })

        # ping タスクを開始
        self._start_ping_task(session_id)

        logger.info("WebSocket connected", session_id=session_id)
        return state

    def _start_ping_task(self, session_id: str) -> None:
        """ping タスクを開始"""
        async def ping_loop():
            while session_id in self.active_connections:
                await asyncio.sleep(self.PING_INTERVAL)
                try:
                    await self.send_message(session_id, {"type": "ping", "timestamp": time.time()})
                except Exception as e:
                    logger.warning("Ping failed", session_id=session_id, error=str(e))
                    break

        self._ping_tasks[session_id] = asyncio.create_task(ping_loop())

    async def get_or_create_sdk_client(
        self, session_id: str, options: ClaudeAgentOptions
    ) -> ClaudeSDKClient:
        """
        SDKクライアントを取得または作成（セッション継続性のため）

        Args:
            session_id: セッションID
            options: Claude Agent SDK オプション

        Returns:
            ClaudeSDKClient: SDKクライアント
        """
        # ロックを取得または作成
        if session_id not in self._sdk_client_locks:
            self._sdk_client_locks[session_id] = asyncio.Lock()

        async with self._sdk_client_locks[session_id]:
            # 既存のクライアントがあれば返す
            if session_id in self._sdk_clients:
                logger.debug("Reusing existing SDK client", session_id=session_id)
                return self._sdk_clients[session_id]

            # 新しいクライアントを作成
            logger.info("Creating new SDK client", session_id=session_id)
            client = ClaudeSDKClient(options=options)
            await client.__aenter__()  # コンテキストマネージャーを開始
            self._sdk_clients[session_id] = client
            self._sdk_client_options[session_id] = options
            return client

    async def close_sdk_client(self, session_id: str) -> None:
        """
        SDKクライアントをクローズ

        Args:
            session_id: セッションID
        """
        if session_id in self._sdk_client_locks:
            async with self._sdk_client_locks[session_id]:
                if session_id in self._sdk_clients:
                    try:
                        client = self._sdk_clients[session_id]
                        await client.__aexit__(None, None, None)
                        logger.info("SDK client closed", session_id=session_id)
                    except Exception as e:
                        logger.warning("Error closing SDK client", session_id=session_id, error=str(e))
                    finally:
                        del self._sdk_clients[session_id]
                        if session_id in self._sdk_client_options:
                            del self._sdk_client_options[session_id]

            # ロックも削除
            del self._sdk_client_locks[session_id]

    def has_sdk_client(self, session_id: str) -> bool:
        """SDKクライアントが存在するか確認"""
        return session_id in self._sdk_clients

    def disconnect(self, session_id: str) -> None:
        """WebSocket接続を切断"""
        # ping タスクをキャンセル
        if session_id in self._ping_tasks:
            self._ping_tasks[session_id].cancel()
            del self._ping_tasks[session_id]

        if session_id in self.active_connections:
            del self.active_connections[session_id]

        if session_id in self.session_states:
            self.session_states[session_id].state = ConnectionState.DISCONNECTED

        logger.info("WebSocket disconnected", session_id=session_id)

    def get_session_state(self, session_id: str) -> Optional[SessionState]:
        """セッション状態を取得"""
        return self.session_states.get(session_id)

    def update_activity(self, session_id: str) -> None:
        """最終アクティビティを更新"""
        if session_id in self.session_states:
            self.session_states[session_id].last_activity = time.time()

    async def send_message(
        self, session_id: str, message: dict, require_ack: bool = False
    ) -> Optional[str]:
        """
        特定のセッションにメッセージを送信

        Args:
            session_id: セッションID
            message: 送信するメッセージ
            require_ack: ACK（配信確認）を必要とするか

        Returns:
            Optional[str]: ACKが必要な場合はメッセージID
        """
        websocket = self.active_connections.get(session_id)
        if websocket:
            try:
                # メッセージIDを追加
                if require_ack:
                    message_id = self._generate_message_id()
                    message["message_id"] = message_id
                    if session_id in self.session_states:
                        self.session_states[session_id].message_ack_pending[message_id] = False

                await websocket.send_json(message)
                self.update_activity(session_id)

                return message.get("message_id") if require_ack else None
            except Exception as e:
                logger.error("Failed to send message", session_id=session_id, error=str(e))
                return None
        return None

    async def send_text(self, session_id: str, text: str) -> None:
        """特定のセッションにテキストを送信"""
        websocket = self.active_connections.get(session_id)
        if websocket:
            try:
                await websocket.send_text(text)
                self.update_activity(session_id)
            except Exception as e:
                logger.error("Failed to send text", session_id=session_id, error=str(e))

    def acknowledge_message(self, session_id: str, message_id: str) -> bool:
        """メッセージのACKを処理"""
        state = self.session_states.get(session_id)
        if state and message_id in state.message_ack_pending:
            state.message_ack_pending[message_id] = True
            return True
        return False

    async def send_error(
        self, session_id: str, error: str, code: ErrorCode, details: Optional[dict] = None
    ) -> None:
        """エラーメッセージを送信"""
        error_msg = {
            "type": "error",
            "error": error,
            "code": code.value,
            "timestamp": time.time(),
        }
        if details:
            error_msg["details"] = details
        await self.send_message(session_id, error_msg)

    def is_processing(self, session_id: str) -> bool:
        """処理中かどうかを確認"""
        state = self.session_states.get(session_id)
        return state.is_processing if state else False

    def set_processing(self, session_id: str, is_processing: bool) -> None:
        """処理中フラグを設定"""
        if session_id in self.session_states:
            self.session_states[session_id].is_processing = is_processing
            self.session_states[session_id].state = (
                ConnectionState.PROCESSING if is_processing else ConnectionState.CONNECTED
            )

    def update_partial_response(self, session_id: str, content: str) -> None:
        """部分レスポンスを更新"""
        if session_id in self.session_states:
            self.session_states[session_id].partial_response += content

    def get_partial_response(self, session_id: str) -> str:
        """部分レスポンスを取得"""
        state = self.session_states.get(session_id)
        return state.partial_response if state else ""

    def clear_partial_response(self, session_id: str) -> None:
        """部分レスポンスをクリア"""
        if session_id in self.session_states:
            self.session_states[session_id].partial_response = ""


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
    workspace_path = ""
    project_id = ""

    # セッション存在確認 (データベースセッションを使用)
    async with get_session_context() as db_session:
        session_manager = SessionManager(db_session)
        session = await session_manager.get_session(session_id)

        if not session:
            logger.warning("Session not found", session_id=session_id)
            await websocket.accept()
            error_msg = WSErrorMessage(
                type="error", error=f"Session {session_id} not found", code=ErrorCode.SESSION_NOT_FOUND.value
            )
            await websocket.send_json(error_msg.model_dump())
            await asyncio.sleep(0.1)
            await websocket.close()
            return

        # ワークスペースパス取得
        project_id = session.project_id
        workspace_path = os.path.join(settings.workspace_base, project_id)
        os.makedirs(workspace_path, exist_ok=True)

    # 接続確立（セッション情報を含める）
    await connection_manager.connect(
        session_id, websocket, project_id=project_id, workspace_path=workspace_path
    )

    logger.info("Session loaded", session_id=session_id, workspace=workspace_path)

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
                await connection_manager.send_error(
                    session_id, f"Invalid JSON: {str(e)}", ErrorCode.PROCESSING_ERROR
                )
                continue

            message_type = message_data.get("type", "chat")

            if message_type == "chat":
                await _handle_chat_type(
                    session_id, message_data, workspace_path, project_id
                )

            elif message_type == "interrupt":
                await _handle_interrupt(session_id)

            elif message_type == "pong":
                # ping に対する応答
                connection_manager.update_activity(session_id)
                logger.debug("Pong received", session_id=session_id)

            elif message_type == "ack":
                # メッセージ配信確認
                message_id = message_data.get("message_id")
                if message_id:
                    connection_manager.acknowledge_message(session_id, message_id)

            elif message_type == "get_state":
                # セッション状態取得リクエスト
                await _handle_get_state(session_id)

            else:
                await connection_manager.send_error(
                    session_id,
                    f"Unknown message type: {message_type}",
                    ErrorCode.INVALID_MESSAGE_TYPE
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client", session_id=session_id)
        await _handle_disconnect(session_id)

    except Exception as e:
        logger.error("WebSocket error", error=str(e), session_id=session_id, exc_info=True)
        await _handle_disconnect(session_id)


async def _handle_chat_type(
    session_id: str, message_data: dict, workspace_path: str, project_id: str
) -> None:
    """チャットメッセージタイプを処理"""
    # 既に処理中の場合は拒否
    if connection_manager.is_processing(session_id):
        await connection_manager.send_error(
            session_id,
            "Already processing a message. Please wait.",
            ErrorCode.PROCESSING_ERROR
        )
        return

    try:
        chat_msg = WSChatMessage(**message_data)
        await handle_chat_message(
            session_id,
            chat_msg,
            workspace_path,
            connection_manager,
            project_id=project_id,
        )
    except Exception as e:
        logger.error("Error processing chat message", error=str(e), exc_info=True)
        await connection_manager.send_error(
            session_id, str(e), ErrorCode.PROCESSING_ERROR
        )


async def _handle_interrupt(session_id: str) -> None:
    """中断リクエストを処理"""
    logger.info("Interrupt requested", session_id=session_id)

    # 部分レスポンスを保存
    partial_response = connection_manager.get_partial_response(session_id)
    if partial_response:
        try:
            async with get_session_context() as db_session:
                session_manager = SessionManager(db_session)
                await session_manager.save_partial_message(
                    session_id, MessageRole.ASSISTANT, partial_response, is_complete=False
                )
            logger.info("Partial response saved on interrupt", session_id=session_id)
        except Exception as e:
            logger.warning("Failed to save partial response", session_id=session_id, error=str(e))

    # 処理中フラグをクリア
    connection_manager.set_processing(session_id, False)
    connection_manager.clear_partial_response(session_id)

    await connection_manager.send_message(
        session_id, {
            "type": "interrupted",
            "message": "Processing interrupted",
            "partial_saved": bool(partial_response),
            "timestamp": time.time(),
        }
    )


async def _handle_get_state(session_id: str) -> None:
    """セッション状態取得リクエストを処理"""
    state = connection_manager.get_session_state(session_id)
    if state:
        await connection_manager.send_message(session_id, {
            "type": "state",
            "session_id": session_id,
            "connection_state": state.state.value,
            "is_processing": state.is_processing,
            "has_partial_response": bool(state.partial_response),
            "last_activity": state.last_activity,
            "timestamp": time.time(),
        })


async def _handle_disconnect(session_id: str) -> None:
    """切断処理"""
    # 処理中だった場合は部分レスポンスを保存
    if connection_manager.is_processing(session_id):
        partial_response = connection_manager.get_partial_response(session_id)
        if partial_response:
            try:
                async with get_session_context() as db_session:
                    session_manager = SessionManager(db_session)
                    await session_manager.save_partial_message(
                        session_id, MessageRole.ASSISTANT, partial_response, is_complete=False
                    )
                logger.info("Partial response saved on disconnect", session_id=session_id)
            except Exception as e:
                logger.warning("Failed to save partial response on disconnect", session_id=session_id, error=str(e))

    # SDKクライアントをクローズ（セッション継続性管理）
    await connection_manager.close_sdk_client(session_id)

    connection_manager.disconnect(session_id)


async def handle_chat_message(
    session_id: str,
    message: WSChatMessage,
    workspace_path: str,
    conn_manager: ConnectionManager,
    project_id: str = "",
) -> None:
    """
    チャットメッセージ処理

    Claude Agent SDKを直接使用してClaudeと通信します。

    Args:
        session_id: セッションID
        message: チャットメッセージ
        workspace_path: ワークスペースパス
        conn_manager: 接続マネージャー
        project_id: プロジェクトID（DB設定読み込み用）
    """
    # 処理中フラグをセット
    conn_manager.set_processing(session_id, True)
    conn_manager.clear_partial_response(session_id)

    try:
        # データベースセッションを使用してメッセージ履歴取得・保存
        async with get_session_context() as db_session:
            session_manager = SessionManager(db_session)

            # ChatMessageProcessor で設定読み込み
            processor = ChatMessageProcessor(db_session, project_id)
            config = await processor.load_config()

            # プロジェクトが見つからない場合
            if not config:
                await conn_manager.send_error(
                    session_id,
                    f"Project {project_id} not found",
                    ErrorCode.PROJECT_NOT_FOUND
                )
                return

            # APIキー検証
            api_key_error = processor.validate_api_key(config)
            if api_key_error:
                await conn_manager.send_error(
                    session_id,
                    api_key_error,
                    ErrorCode.API_KEY_NOT_CONFIGURED
                )
                return

            # メッセージ履歴取得
            message_history = await session_manager.get_message_history(session_id)
            existing_message_count = len(message_history)

            # ユーザーメッセージ追加
            user_message = {"role": "user", "content": message.content}
            message_history.append(user_message)

            # Thinking状態通知
            await conn_manager.send_message(session_id, {
                "type": "thinking",
                "timestamp": time.time(),
            })

            # SDKセッションIDを取得（セッション再開用）
            sdk_session_id = await session_manager.get_sdk_session_id(session_id)

            # SDK オプション構築（既存のSDKセッションIDがあれば再開）
            options = processor.build_sdk_options(config, resume_session_id=sdk_session_id)

            logger.info(
                "Starting Claude Agent SDK session",
                session_id=session_id,
                resume_sdk_session=sdk_session_id,
            )

            # ストリーミング処理
            full_response_text, usage_info, was_interrupted, new_sdk_session_id = await _stream_response(
                session_id, options, message, conn_manager
            )

            # SDKセッションIDをDBに保存（初回または変更があった場合）
            if new_sdk_session_id and new_sdk_session_id != sdk_session_id:
                await session_manager.update_sdk_session_id(session_id, new_sdk_session_id)
                logger.info(
                    "SDK session ID saved",
                    session_id=session_id,
                    sdk_session_id=new_sdk_session_id,
                )

            # メッセージ完了
            logger.info("Message completed", session_id=session_id, interrupted=was_interrupted)

            # 完了通知（使用量情報を含む）
            await conn_manager.send_message(
                session_id,
                {
                    "type": "result",
                    "usage": usage_info,
                    "interrupted": was_interrupted,
                    "timestamp": time.time(),
                },
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
                try:
                    await session_manager.save_message_history(session_id, new_messages)
                except MessageSaveError as e:
                    logger.error("Failed to save message history", session_id=session_id, error=str(e))
                    await conn_manager.send_error(
                        session_id,
                        "Failed to save message history",
                        ErrorCode.MESSAGE_SAVE_FAILED,
                        {"original_error": str(e)}
                    )

            # アクティビティ更新
            await session_manager.update_activity(session_id)

    except Exception as e:
        logger.error("Error in chat message handler", error=str(e), exc_info=True)
        await conn_manager.send_error(
            session_id, str(e), ErrorCode.CHAT_ERROR
        )

    finally:
        # 処理中フラグをクリア
        conn_manager.set_processing(session_id, False)
        conn_manager.clear_partial_response(session_id)


async def _stream_response(
    session_id: str,
    options: ClaudeAgentOptions,
    message: WSChatMessage,
    conn_manager: ConnectionManager,
) -> tuple[str, dict, bool, Optional[str]]:
    """
    Claude Agent SDK でストリーミングレスポンスを処理

    セッション継続性のため、同じセッションでは同じSDKクライアントを再利用します。

    Args:
        session_id: セッションID
        options: Claude Agent SDK オプション
        message: チャットメッセージ
        conn_manager: 接続マネージャー

    Returns:
        tuple[str, dict, bool, Optional[str]]: (応答テキスト, 使用量情報, 中断されたか, SDKセッションID)
    """
    full_response_text = ""
    usage_info = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_cost_usd": 0,
        "duration_ms": 0,
    }
    was_interrupted = False
    sdk_session_id: Optional[str] = None
    start_time = time.time()

    try:
        # セッション継続性のため、既存クライアントを再利用または新規作成
        client = await conn_manager.get_or_create_sdk_client(session_id, options)

        # クエリ送信
        await client.query(message.content)

        # ストリーミングレスポンス処理
        async for sdk_message in client.receive_response():
            # 接続が切れていないか確認
            if session_id not in conn_manager.active_connections:
                logger.warning("Connection lost during streaming", session_id=session_id)
                was_interrupted = True
                break

            # 処理中フラグが解除されていたら中断（interrupt リクエスト）
            if not conn_manager.is_processing(session_id):
                logger.info("Streaming interrupted by request", session_id=session_id)
                was_interrupted = True
                break

            if isinstance(sdk_message, AssistantMessage):
                for block in sdk_message.content:
                    if isinstance(block, TextBlock):
                        # テキストストリーミング
                        full_response_text += block.text
                        # 部分レスポンスを更新（中断時の保存用）
                        conn_manager.update_partial_response(session_id, block.text)
                        await conn_manager.send_message(
                            session_id, {
                                "type": "text",
                                "content": block.text,
                                "timestamp": time.time(),
                            }
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
                                "timestamp": time.time(),
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
                        "timestamp": time.time(),
                    },
                )

            elif isinstance(sdk_message, ResultMessage):
                # 使用量情報
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
                # SDKセッションIDを取得（セッション再開用）
                sdk_session_id = getattr(sdk_message, "session_id", None)
                if sdk_session_id:
                    logger.debug("Got SDK session ID from ResultMessage", sdk_session_id=sdk_session_id)

    except asyncio.CancelledError:
        logger.info("Stream cancelled", session_id=session_id)
        was_interrupted = True
    except Exception as e:
        logger.error("Error during streaming", session_id=session_id, error=str(e), exc_info=True)
        # エラー発生時でもこれまでのレスポンスは保持
        raise

    # 実際の処理時間を計算（SDK から取得できない場合）
    if usage_info["duration_ms"] == 0:
        usage_info["duration_ms"] = int((time.time() - start_time) * 1000)

    return full_response_text, usage_info, was_interrupted, sdk_session_id


def get_default_tools() -> List[str]:
    """デフォルトツール一覧を取得（後方互換性のため維持）"""
    from app.core.chat_processor import DEFAULT_TOOLS

    return DEFAULT_TOOLS.copy()
