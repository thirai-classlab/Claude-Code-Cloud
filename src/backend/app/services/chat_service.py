"""
Chat Service

チャット関連のビジネスロジック
Claude Agent SDK を使用した実装
"""

import os
from typing import Any, AsyncIterator, Dict, List, Optional

from app.core.claude_client import ClaudeClient, get_default_tools
from app.core.session_manager import SessionManager
from app.models.messages import StreamMessage
from app.utils.logger import get_logger
from app.config import settings

logger = get_logger(__name__)


class ChatService:
    """
    チャットサービス

    Claude Agent SDK を使用したチャット機能のビジネスロジックを提供します。
    """

    def __init__(self, session_manager: SessionManager):
        """
        Args:
            session_manager: セッションマネージャー
        """
        self.session_manager = session_manager

    async def send_message(
        self, session_id: str, message: str, files: Optional[List[dict]] = None
    ) -> AsyncIterator[StreamMessage]:
        """
        メッセージ送信とストリーミングレスポンス取得

        Agent SDK を使用してメッセージを送信し、ストリーミングレスポンスを返します。

        Args:
            session_id: セッションID
            message: ユーザーメッセージ
            files: 添付ファイル（現在未サポート）

        Yields:
            StreamMessage: ストリーミングメッセージ
        """
        # セッション取得
        session = await self.session_manager.get_session(session_id)
        if not session:
            logger.error("Session not found", session_id=session_id)
            yield StreamMessage(
                type="error", content=f"Session {session_id} not found", session_id=session_id
            )
            return

        # プロジェクト情報からワークスペースパス取得
        workspace_path = os.path.join(settings.workspace_base, session.project_id)

        # ワークスペースディレクトリ作成
        os.makedirs(workspace_path, exist_ok=True)

        # Claude Agent SDK クライアント初期化
        claude_client = ClaudeClient(
            workspace_path=workspace_path,
            model=getattr(session, "model", "claude-sonnet-4-20250514"),
        )

        # メッセージ履歴取得
        message_history = await self.session_manager.get_message_history(session_id)

        # ユーザーメッセージ追加
        user_message = {"role": "user", "content": message}
        message_history.append(user_message)

        # Thinking状態通知
        yield StreamMessage(type="thinking", content="", session_id=session_id)

        # 応答テキストを蓄積
        full_response_text = ""
        total_tokens = 0

        try:
            # Agent SDKのストリーミング処理
            async for event in claude_client.send_message_stream(
                messages=message_history,
                system=self._get_system_prompt(workspace_path),
                tools=get_default_tools(),
            ):
                event_type = event.get("type")

                if event_type == "content_block_delta":
                    # テキストストリーミング
                    delta = event.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        full_response_text += text
                        yield StreamMessage(
                            type="text", content=text, session_id=session_id
                        )

                elif event_type == "tool_use":
                    # ツール使用開始通知
                    yield StreamMessage(
                        type="tool_use",
                        content="",
                        session_id=session_id,
                        metadata={
                            "tool": event.get("name"),
                            "tool_use_id": event.get("id"),
                            "input": event.get("input"),
                        },
                    )

                elif event_type == "tool_result":
                    # ツール結果通知
                    yield StreamMessage(
                        type="tool_result",
                        content=str(event.get("content", "")),
                        session_id=session_id,
                        metadata={
                            "tool_use_id": event.get("tool_use_id"),
                            "success": True,
                        },
                    )

                elif event_type == "error":
                    # エラー通知
                    yield StreamMessage(
                        type="error",
                        content=event.get("error", "Unknown error"),
                        session_id=session_id,
                    )
                    return

                elif event_type == "message_stop":
                    # メッセージ完了
                    logger.info("Message completed", session_id=session_id)

            # 完了通知
            yield StreamMessage(
                type="result",
                content=full_response_text,
                session_id=session_id,
                metadata={
                    "input_tokens": 0,  # Agent SDKでは使用量追跡が異なる
                    "output_tokens": 0,
                },
            )

            # アシスタントメッセージを履歴に追加
            if full_response_text:
                message_history.append({
                    "role": "assistant",
                    "content": [{"type": "text", "text": full_response_text}],
                })

            # メッセージ履歴保存
            await self.session_manager.save_message_history(session_id, message_history)

            # アクティビティ更新
            await self.session_manager.update_activity(session_id)

        except Exception as e:
            logger.error("Error in chat service", error=str(e), session_id=session_id, exc_info=True)
            yield StreamMessage(type="error", content=str(e), session_id=session_id)

    def _get_system_prompt(self, workspace_path: str) -> str:
        """
        システムプロンプト生成

        Args:
            workspace_path: ワークスペースパス

        Returns:
            str: システムプロンプト
        """
        return f"""You are Claude Code, an AI coding assistant powered by Claude Agent SDK.

Your workspace is located at: {workspace_path}

You have access to the following tools:
- Read: Read file contents
- Write: Create or overwrite a file
- Edit: Edit a file by replacing text
- Bash: Execute bash commands

Always provide clear explanations of what you're doing.
When creating or modifying files, explain your changes.
Be helpful, safe, and accurate.

Important: Tool execution is handled automatically by the Agent SDK."""
