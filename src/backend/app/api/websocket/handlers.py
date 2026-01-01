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
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    UserMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
    HookMatcher,
    PostToolUseHookInput,
    HookContext,
)

from app.config import settings
from app.core.chat_processor import ChatMessageProcessor, ConfigBundle
from app.core.session_manager import SessionManager, MessageSaveError
from app.models.messages import MessageRole
from app.schemas.websocket import WSChatMessage, WSErrorMessage
from app.services.usage_service import UsageService
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
    COST_LIMIT_EXCEEDED = "cost_limit_exceeded"
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
    # AskUserQuestion 対応
    pending_question: Optional[dict] = None  # 質問内容
    pending_tool_use_id: Optional[str] = None  # tool_use_id
    is_waiting_for_answer: bool = False  # 回答待ちフラグ
    is_interactive: bool = True  # True=フロントエンド接続、False=Cron実行
    answer_event: Optional[asyncio.Event] = None  # 回答待ちイベント
    pending_answer: Optional[dict] = None  # 受信した回答


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
                # チャット処理をバックグラウンドタスクとして実行
                # これによりメインループはブロックされず、question_answer などのメッセージを受信できる
                asyncio.create_task(_handle_chat_type(
                    session_id, message_data, workspace_path, project_id
                ))

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

            elif message_type == "resume":
                # ストリーム再開リクエスト
                await _handle_resume(session_id, workspace_path, project_id)

            elif message_type == "question_answer":
                # AskUserQuestion への回答
                await _handle_question_answer(session_id, message_data)

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


async def _handle_resume(session_id: str, workspace_path: str, project_id: str) -> None:
    """ストリーム再開リクエストを処理"""
    logger.info("Resume requested", session_id=session_id)

    try:
        async with get_session_context() as db_session:
            session_manager = SessionManager(db_session)

            # セッションの処理状態を確認
            is_processing, processing_started_at = await session_manager.get_processing_state(session_id)
            sdk_session_id = await session_manager.get_sdk_session_id(session_id)

            if not is_processing:
                # 処理中ではない場合
                await connection_manager.send_message(session_id, {
                    "type": "resume_not_needed",
                    "message": "No active processing to resume",
                    "timestamp": time.time(),
                })
                return

            if not sdk_session_id:
                # SDKセッションIDがない場合は再開不可
                logger.warning("Cannot resume: no SDK session ID", session_id=session_id)
                await connection_manager.send_message(session_id, {
                    "type": "resume_failed",
                    "error": "No SDK session ID available for resume",
                    "timestamp": time.time(),
                })
                # 処理状態をクリア
                await session_manager.set_processing(session_id, False)
                return

            # 処理開始時刻からの経過時間をチェック（30分タイムアウト）
            if processing_started_at:
                from datetime import timedelta
                elapsed = datetime.now(timezone.utc) - processing_started_at
                if elapsed > timedelta(minutes=30):
                    logger.warning("Resume timeout exceeded", session_id=session_id, elapsed=elapsed)
                    await connection_manager.send_message(session_id, {
                        "type": "resume_failed",
                        "error": "Processing timeout exceeded (30 minutes)",
                        "timestamp": time.time(),
                    })
                    await session_manager.set_processing(session_id, False)
                    return

            # ストリーム再開を通知
            await connection_manager.send_message(session_id, {
                "type": "resume_started",
                "sdk_session_id": sdk_session_id,
                "timestamp": time.time(),
            })

            logger.info(
                "Stream resume initiated",
                session_id=session_id,
                sdk_session_id=sdk_session_id,
            )

            # Note: 実際のストリーム再開はClaude SDKの機能に依存
            # 現在のClaude Agent SDKでは、session_idを使用して
            # 過去のコンテキストを維持したまま新しいクエリを送信可能
            # 完全なストリーム再開（途中から再開）は将来のSDK機能として検討

    except Exception as e:
        logger.error("Error handling resume", session_id=session_id, error=str(e), exc_info=True)
        await connection_manager.send_error(
            session_id,
            f"Failed to resume: {str(e)}",
            ErrorCode.PROCESSING_ERROR
        )


async def _handle_question_answer(session_id: str, message_data: dict) -> None:
    """AskUserQuestion への回答を処理"""
    logger.info(
        "Question answer received",
        session_id=session_id,
        message_data=message_data,
    )

    state = connection_manager.get_session_state(session_id)
    if not state:
        logger.warning("Session state not found for question answer", session_id=session_id)
        return

    logger.info(
        "Session state for question answer",
        session_id=session_id,
        is_waiting_for_answer=state.is_waiting_for_answer,
        pending_tool_use_id=state.pending_tool_use_id,
        has_answer_event=state.answer_event is not None,
    )

    if not state.is_waiting_for_answer:
        logger.warning("Not waiting for answer", session_id=session_id)
        await connection_manager.send_error(
            session_id,
            "No pending question to answer",
            ErrorCode.PROCESSING_ERROR
        )
        return

    tool_use_id = message_data.get("tool_use_id")
    answers = message_data.get("answers", {})

    if tool_use_id != state.pending_tool_use_id:
        logger.warning(
            "Tool use ID mismatch",
            session_id=session_id,
            expected=state.pending_tool_use_id,
            received=tool_use_id
        )
        await connection_manager.send_error(
            session_id,
            "Tool use ID mismatch",
            ErrorCode.PROCESSING_ERROR
        )
        return

    # 回答を保存してイベントをセット
    state.pending_answer = answers
    if state.answer_event:
        logger.info("Setting answer event", session_id=session_id)
        state.answer_event.set()
    else:
        logger.warning("No answer event to set!", session_id=session_id)

    logger.info("Question answer processed", session_id=session_id, answers=answers)


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
    # 処理中フラグをセット（メモリ上）
    conn_manager.set_processing(session_id, True)
    conn_manager.clear_partial_response(session_id)

    try:
        # データベースセッションを使用してメッセージ履歴取得・保存
        async with get_session_context() as db_session:
            session_manager = SessionManager(db_session)

            # 処理状態をDBに永続化（ストリーム再開用）
            await session_manager.set_processing(session_id, True)

            # セッション情報を取得（モデル情報含む）
            session_info = await session_manager.get_session(session_id)
            session_model = session_info.model if session_info else None

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

            # 利用制限チェック
            usage_service = UsageService(db_session)
            cost_check = await usage_service.check_cost_limits(project_id)
            if not cost_check.get("can_use", True):
                exceeded_limits = cost_check.get("exceeded_limits", [])
                limit_names = {
                    "daily": "1日",
                    "weekly": "7日",
                    "monthly": "30日",
                }
                exceeded_names = [limit_names.get(l, l) for l in exceeded_limits]
                error_msg = f"利用制限に達しました（{', '.join(exceeded_names)}の上限）。制限設定を確認してください。"
                await conn_manager.send_error(
                    session_id,
                    error_msg,
                    ErrorCode.COST_LIMIT_EXCEEDED,
                    {
                        "exceeded_limits": exceeded_limits,
                        "cost_daily": cost_check.get("cost_daily", 0),
                        "cost_weekly": cost_check.get("cost_weekly", 0),
                        "cost_monthly": cost_check.get("cost_monthly", 0),
                        "limit_daily": cost_check.get("limit_daily"),
                        "limit_weekly": cost_check.get("limit_weekly"),
                        "limit_monthly": cost_check.get("limit_monthly"),
                    }
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

            # SDK オプション構築（既存のSDKセッションIDがあれば再開、セッションのモデルを使用）
            options = processor.build_sdk_options(
                config,
                resume_session_id=sdk_session_id,
                model=session_model,
            )

            # セッション状態を取得
            session_state = conn_manager.get_session_state(session_id)

            # PostToolUse フックとAskUserQuestion用の変数を先に定義
            # tool_use_id -> tool_name のマッピングを保持（順序も重要）
            tool_use_id_map: Dict[str, str] = {}
            # 処理済みtool_use_idを追跡
            completed_tool_use_ids: set = set()
            # ツール結果を保存（DB保存用）
            hook_tool_results: Dict[str, dict] = {}

            # AskUserQuestion 対応の can_use_tool コールバック
            async def can_use_tool_callback(
                tool_name: str,
                tool_input: dict,
                context: dict
            ):
                """AskUserQuestion ツールを検出し、フロントエンドに質問を送信"""
                logger.debug(
                    "can_use_tool_callback called",
                    session_id=session_id,
                    tool_name=tool_name,
                )

                if tool_name != "AskUserQuestion":
                    # AskUserQuestion 以外はそのまま許可
                    return {"behavior": "allow", "updatedInput": tool_input}

                # インタラクティブモードでない場合（Cron実行など）はスキップ
                if session_state and not session_state.is_interactive:
                    logger.info("Skipping AskUserQuestion in non-interactive mode", session_id=session_id)
                    # デフォルト回答を生成
                    return {
                        "behavior": "allow",
                        "updatedInput": {**tool_input, "answers": {"0": "0"}}
                    }

                # 質問データを取得
                questions = tool_input.get("questions", [])

                if not questions:
                    logger.warning("AskUserQuestion called with no questions", session_id=session_id)
                    return {"behavior": "allow", "updatedInput": tool_input}

                # tool_use_id を tool_use_id_map から取得（_stream_responseで登録済み）
                # 最新のAskUserQuestionのIDを探す
                tool_use_id = None
                for uid, name in reversed(list(tool_use_id_map.items())):
                    if name == "AskUserQuestion" and uid not in completed_tool_use_ids:
                        tool_use_id = uid
                        break

                # 見つからない場合はフォールバックIDを生成
                if not tool_use_id:
                    tool_use_id = f"ask_{int(time.time() * 1000)}"
                    logger.warning(
                        "Could not find tool_use_id for AskUserQuestion, using fallback",
                        session_id=session_id,
                        fallback_id=tool_use_id,
                    )

                logger.info(
                    "AskUserQuestion detected, sending to frontend",
                    session_id=session_id,
                    tool_use_id=tool_use_id,
                    question_count=len(questions),
                )

                # セッション状態を更新
                if session_state:
                    session_state.pending_question = tool_input
                    session_state.pending_tool_use_id = tool_use_id
                    session_state.is_waiting_for_answer = True
                    session_state.answer_event = asyncio.Event()
                    session_state.pending_answer = None

                # フロントエンドに質問を送信
                await conn_manager.send_message(
                    session_id,
                    {
                        "type": "user_question",
                        "tool_use_id": tool_use_id,
                        "questions": questions,
                        "timestamp": time.time(),
                    }
                )

                # 回答を待つ（タイムアウト: 5分）
                try:
                    await asyncio.wait_for(
                        session_state.answer_event.wait(),
                        timeout=300.0
                    )
                except asyncio.TimeoutError:
                    logger.warning("AskUserQuestion timeout", session_id=session_id)
                    if session_state:
                        session_state.is_waiting_for_answer = False
                    return {
                        "behavior": "deny",
                        "message": "User did not respond in time",
                        "interrupt": False
                    }

                # 回答を取得
                answers = session_state.pending_answer if session_state else {}

                # 状態をリセット
                if session_state:
                    session_state.is_waiting_for_answer = False
                    session_state.pending_question = None
                    session_state.pending_tool_use_id = None
                    session_state.answer_event = None

                logger.info(
                    "AskUserQuestion answered",
                    session_id=session_id,
                    answers=answers,
                )

                # 回答をツール入力に追加して許可
                return {
                    "behavior": "allow",
                    "updatedInput": {**tool_input, "answers": answers}
                }

            # can_use_tool コールバックをオプションに設定
            options.can_use_tool = can_use_tool_callback

            # PostToolUse フックを追加（ツール実行完了通知用）
            async def post_tool_use_hook(
                hook_input: PostToolUseHookInput,
                message_text: Optional[str],
                context: HookContext,
            ):
                """ツール実行完了時の処理（DB保存用データ蓄積のみ）

                Note: WebSocket通知はUserMessage処理で行うため、ここではDB保存用データのみ蓄積
                """
                nonlocal completed_tool_use_ids, hook_tool_results

                try:
                    tool_name = hook_input.tool_name
                    tool_response = hook_input.tool_response

                    # tool_use_id_mapから該当するtool_nameの未処理のIDを探す
                    tool_use_id = None
                    for uid, name in tool_use_id_map.items():
                        if name == tool_name and uid not in completed_tool_use_ids:
                            tool_use_id = uid
                            completed_tool_use_ids.add(uid)
                            break

                    # 見つからない場合はフォールバック（通常は発生しない）
                    if tool_use_id is None:
                        tool_use_id = f"{tool_name}_{int(time.time() * 1000)}"
                        logger.warning(
                            "Could not find tool_use_id for tool, using fallback",
                            session_id=session_id,
                            tool_name=tool_name,
                            fallback_id=tool_use_id,
                        )

                    logger.debug(
                        "PostToolUse hook triggered",
                        session_id=session_id,
                        tool_name=tool_name,
                        tool_use_id=tool_use_id,
                    )

                    # ツール結果をDB保存用に記録（WebSocket通知はUserMessage処理で行う）
                    output_str = str(tool_response) if tool_response else ""
                    hook_tool_results[tool_use_id] = {
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": output_str,
                        "is_error": False,
                    }

                except Exception as e:
                    logger.error(
                        "Error in PostToolUse hook",
                        session_id=session_id,
                        error=str(e),
                        exc_info=True,
                    )

                # フックは継続を許可（continue_はPythonの予約語を避けるための名前）
                return {"continue_": True}

            # フックをオプションに追加
            options.hooks = {
                "PostToolUse": [
                    HookMatcher(
                        matcher=None,  # 全てのツールにマッチ
                        hooks=[post_tool_use_hook],
                        timeout=30.0,
                    )
                ]
            }

            logger.info(
                "Starting Claude Agent SDK session",
                session_id=session_id,
                resume_sdk_session=sdk_session_id,
            )

            # ストリーミング処理（リトライ対応）
            try:
                full_response_text, content_blocks, usage_info, was_interrupted, new_sdk_session_id = await _stream_response(
                    session_id, options, message, conn_manager, tool_use_id_map, hook_tool_results
                )
            except Exception as stream_error:
                error_str = str(stream_error)
                # SDKセッション再開失敗の場合、新規セッションでリトライ
                is_resume_error = (
                    "No conversation found" in error_str or
                    "terminated process" in error_str or
                    "exit code: 1" in error_str
                )
                if is_resume_error:
                    logger.warning(
                        "SDK session resume failed, retrying without resume",
                        session_id=session_id,
                        error=error_str,
                    )

                    # SDKクライアントキャッシュをクリア
                    await conn_manager.close_sdk_client(session_id)

                    # sdk_session_idをクリアしてリビルド
                    await session_manager.update_sdk_session_id(session_id, None)
                    options = processor.build_sdk_options(
                        config,
                        resume_session_id=None,  # 新規セッション
                        model=session_model,
                    )

                    # リトライ
                    full_response_text, content_blocks, usage_info, was_interrupted, new_sdk_session_id = await _stream_response(
                        session_id, options, message, conn_manager, tool_use_id_map, hook_tool_results
                    )
                else:
                    raise

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

            # アシスタントメッセージを履歴に追加（ContentBlocks形式で保存）
            if content_blocks:
                message_history.append({
                    "role": "assistant",
                    "content": content_blocks,
                })
            elif full_response_text:
                # フォールバック：テキストのみの場合
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

            # 使用量情報をDBに保存（料金追跡用）
            total_tokens = usage_info.get("input_tokens", 0) + usage_info.get("output_tokens", 0)
            total_cost = usage_info.get("total_cost_usd", 0)
            if total_tokens > 0 or total_cost > 0:
                await session_manager.update_usage(session_id, total_tokens, total_cost)
                logger.debug(
                    "Usage saved to DB",
                    session_id=session_id,
                    tokens=total_tokens,
                    cost=total_cost,
                )

            # 処理状態をDBでクリア（正常完了）
            await session_manager.set_processing(session_id, False)

    except Exception as e:
        logger.error("Error in chat message handler", error=str(e), exc_info=True)
        await conn_manager.send_error(
            session_id, str(e), ErrorCode.CHAT_ERROR
        )
        # エラー時も処理状態をクリア
        try:
            async with get_session_context() as db_session:
                session_manager = SessionManager(db_session)
                await session_manager.set_processing(session_id, False)
        except Exception as db_error:
            logger.warning("Failed to clear processing state on error", session_id=session_id, error=str(db_error))

    finally:
        # 処理中フラグをクリア（メモリ上）
        conn_manager.set_processing(session_id, False)
        conn_manager.clear_partial_response(session_id)


async def _stream_response(
    session_id: str,
    options: ClaudeAgentOptions,
    message: WSChatMessage,
    conn_manager: ConnectionManager,
    tool_use_id_map: Optional[Dict[str, str]] = None,
    hook_tool_results: Optional[Dict[str, dict]] = None,
) -> tuple[str, List[dict], dict, bool, Optional[str]]:
    """
    Claude Agent SDK でストリーミングレスポンスを処理

    セッション継続性のため、同じセッションでは同じSDKクライアントを再利用します。

    Args:
        session_id: セッションID
        options: Claude Agent SDK オプション
        message: チャットメッセージ
        conn_manager: 接続マネージャー

    Returns:
        tuple[str, List[dict], dict, bool, Optional[str]]:
            (応答テキスト, ContentBlocks配列, 使用量情報, 中断されたか, SDKセッションID)
    """
    full_response_text = ""
    content_blocks: List[dict] = []  # 時系列順のContentBlock配列
    current_text_block = ""  # 現在のテキストブロックを蓄積
    tool_results: Dict[str, dict] = {}  # tool_use_id -> tool_result mapping

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
            # デバッグログ: 受信したメッセージタイプを記録
            logger.info(
                "SDK message received",
                session_id=session_id,
                message_type=type(sdk_message).__name__,
                message_str=str(sdk_message)[:200],
            )

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
                        current_text_block += block.text
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
                        # テキストが蓄積されていれば先にContentBlockに追加
                        if current_text_block:
                            content_blocks.append({
                                "type": "text",
                                "text": current_text_block,
                            })
                            current_text_block = ""

                        # AskUserQuestion は専用の user_question メッセージで処理するためスキップ
                        if block.name == "AskUserQuestion":
                            logger.debug(
                                "Skipping tool_use_start for AskUserQuestion (handled via user_question message)",
                                session_id=session_id,
                                tool_use_id=block.id,
                            )
                            # tool_use_id_map には登録（フック用）
                            if tool_use_id_map is not None:
                                tool_use_id_map[block.id] = block.name
                            continue

                        # ツール使用をContentBlockに追加
                        content_blocks.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })

                        # tool_use_id -> tool_name のマッピングを保存（PostToolUseフック用）
                        if tool_use_id_map is not None:
                            tool_use_id_map[block.id] = block.name

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

            elif isinstance(sdk_message, UserMessage):
                # UserMessage内のToolResultBlockを処理
                for block in sdk_message.content:
                    if isinstance(block, ToolResultBlock):
                        # ツール結果を保存
                        is_error = getattr(block, 'is_error', False) or False
                        tool_results[block.tool_use_id] = {
                            "type": "tool_result",
                            "tool_use_id": block.tool_use_id,
                            "content": str(block.content),
                            "is_error": is_error,
                        }

                        # ツール結果通知
                        await conn_manager.send_message(
                            session_id,
                            {
                                "type": "tool_result",
                                "tool_use_id": block.tool_use_id,
                                "success": not is_error,
                                "output": str(block.content),
                                "timestamp": time.time(),
                            },
                        )

            elif isinstance(sdk_message, ToolResultBlock):
                # 直接ToolResultBlockが来る場合のフォールバック（通常は発生しない）
                is_error = getattr(sdk_message, 'is_error', False) or False
                tool_results[sdk_message.tool_use_id] = {
                    "type": "tool_result",
                    "tool_use_id": sdk_message.tool_use_id,
                    "content": str(sdk_message.content),
                    "is_error": is_error,
                }

                # ツール結果通知
                await conn_manager.send_message(
                    session_id,
                    {
                        "type": "tool_result",
                        "tool_use_id": sdk_message.tool_use_id,
                        "success": not is_error,
                        "output": str(sdk_message.content),
                        "timestamp": time.time(),
                    },
                )

            elif isinstance(sdk_message, ResultMessage):
                # 使用量情報（usageは辞書型）
                usage_dict = sdk_message.usage or {}
                usage_info = {
                    "total_cost_usd": sdk_message.total_cost_usd or 0,
                    "duration_ms": sdk_message.duration_ms or 0,
                    "input_tokens": usage_dict.get("input_tokens", 0),
                    "output_tokens": usage_dict.get("output_tokens", 0),
                    "cache_creation_input_tokens": usage_dict.get("cache_creation_input_tokens", 0),
                    "cache_read_input_tokens": usage_dict.get("cache_read_input_tokens", 0),
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

    # 残りのテキストをContentBlockに追加
    if current_text_block:
        content_blocks.append({
            "type": "text",
            "text": current_text_block,
        })

    # hook_tool_resultsとtool_resultsをマージ（hook優先）
    all_tool_results = {**tool_results}
    if hook_tool_results:
        all_tool_results.update(hook_tool_results)

    # tool_use の後に対応する tool_result を挿入
    final_content_blocks = []
    for block in content_blocks:
        final_content_blocks.append(block)
        if block.get("type") == "tool_use":
            tool_use_id = block.get("id")
            if tool_use_id and tool_use_id in all_tool_results:
                final_content_blocks.append(all_tool_results[tool_use_id])

    # 実際の処理時間を計算（SDK から取得できない場合）
    if usage_info["duration_ms"] == 0:
        usage_info["duration_ms"] = int((time.time() - start_time) * 1000)

    return full_response_text, final_content_blocks, usage_info, was_interrupted, sdk_session_id


def get_default_tools() -> List[str]:
    """デフォルトツール一覧を取得（後方互換性のため維持）"""
    from app.core.chat_processor import DEFAULT_TOOLS

    return DEFAULT_TOOLS.copy()
