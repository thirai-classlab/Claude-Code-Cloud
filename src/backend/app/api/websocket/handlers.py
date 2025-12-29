"""
WebSocket Handlers

WebSocket接続とメッセージ処理
Claude Agent SDKを直接使用したリアルタイムチャット
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.project_config import ProjectConfigJSON

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
from claude_agent_sdk.types import McpStdioServerConfig, AgentDefinition

from app.config import settings
from app.core.config_loader import (
    load_project_config,
    generate_enhanced_system_prompt,
    get_enabled_tools,
)
from app.core.session_manager import SessionManager
from app.schemas.websocket import WSChatMessage, WSErrorMessage
from app.services.project_config_service import ProjectConfigService
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
                        project_id=session.project_id,
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

            # プロジェクト設定をDBから読み込み (優先) → ファイルからフォールバック
            config_service = ProjectConfigService(db_session)
            db_config = await config_service.get_project_config_json(project_id)

            # DBに設定がある場合はDBを使用、なければファイルベース
            use_db_config = bool(db_config.mcp_servers or db_config.agents or db_config.skills or db_config.commands)

            # MCP Servers と Agents の構築
            mcp_servers_config: Dict[str, McpStdioServerConfig] = {}
            agents_config: Dict[str, AgentDefinition] = {}

            if use_db_config:
                logger.info(
                    "Project config loaded from DB",
                    session_id=session_id,
                    project_id=project_id,
                    mcp_servers_count=len(db_config.mcp_servers),
                    agents_count=len(db_config.agents),
                    skills_count=len(db_config.skills),
                    commands_count=len(db_config.commands),
                )
                # DB設定からシステムプロンプト生成
                system_prompt = generate_db_system_prompt(workspace_path, db_config)
                tools = get_db_enabled_tools(db_config)

                # MCP Servers 構築
                for mcp in db_config.mcp_servers:
                    mcp_servers_config[mcp["name"]] = McpStdioServerConfig(
                        type="stdio",
                        command=mcp["command"],
                        args=mcp.get("args", []),
                        env=mcp.get("env", {}),
                    )

                # Agents 構築
                for agent in db_config.agents:
                    agents_config[agent["name"]] = AgentDefinition(
                        description=agent.get("description", ""),
                        prompt=agent.get("system_prompt", ""),
                        tools=agent.get("tools"),
                        model=agent.get("model", "sonnet"),
                    )

                # Skills/Commands はCRUD時にファイルシステムに同期済み
                # Skill ツールを有効化
                if db_config.skills and "Skill" not in tools:
                    tools.append("Skill")
            else:
                # ファイルベースのフォールバック
                project_config = load_project_config(workspace_path)
                logger.info(
                    "Project config loaded from files (fallback)",
                    session_id=session_id,
                    mcp_servers=list(project_config.mcp_servers.keys()),
                    agents=list(project_config.agents.keys()),
                    skills=list(project_config.skills.keys()),
                    commands=list(project_config.commands.keys()),
                )
                # ファイルベースのシステムプロンプト生成
                system_prompt = generate_enhanced_system_prompt(workspace_path, project_config)
                tools = get_enabled_tools(project_config)

                # ファイルベースのMCP Servers/Agents構築
                for name, mcp in project_config.mcp_servers.items():
                    mcp_servers_config[name] = McpStdioServerConfig(
                        type="stdio",
                        command=mcp.command,
                        args=mcp.args or [],
                        env=mcp.env or {},
                    )

                for name, agent in project_config.agents.items():
                    agents_config[name] = AgentDefinition(
                        description=agent.description or "",
                        prompt=agent.system_prompt or "",
                        tools=agent.tools,
                        model=agent.model or "sonnet",
                    )

            # 応答テキストを蓄積
            full_response_text = ""
            usage_info = {"input_tokens": 0, "output_tokens": 0, "total_cost_usd": 0, "duration_ms": 0}

            # Claude Agent SDK オプション構築
            options = ClaudeAgentOptions(
                system_prompt=system_prompt,
                allowed_tools=tools,
                permission_mode="acceptEdits",
                cwd=Path(workspace_path),
                mcp_servers=mcp_servers_config if mcp_servers_config else {},
                agents=agents_config if agents_config else None,
                setting_sources=["project"],  # Skills/Commands をファイルシステムから読み込み
            )

            # スキル/コマンド数の取得
            skills_count = len(db_config.skills) if use_db_config else len(project_config.skills) if 'project_config' in locals() else 0
            commands_count = len(db_config.commands) if use_db_config else len(project_config.commands) if 'project_config' in locals() else 0

            logger.info(
                "Starting Claude Agent SDK session",
                session_id=session_id,
                tools_count=len(tools),
                mcp_servers_count=len(mcp_servers_config),
                agents_count=len(agents_config),
                skills_count=skills_count,
                commands_count=commands_count,
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


def generate_db_system_prompt(workspace_path: str, config: "ProjectConfigJSON") -> str:
    """
    DB設定からシステムプロンプトを生成

    Args:
        workspace_path: ワークスペースパス
        config: ProjectConfigJSON (DB設定)

    Returns:
        str: システムプロンプト
    """
    prompt_parts = [
        f"""You are Claude Code, an AI coding assistant powered by Claude Agent SDK.

Your workspace is located at: {workspace_path}

## Default Tools
You have access to the following default tools:
- Read: Read file contents
- Write: Create or overwrite a file
- Edit: Edit a file by replacing text
- Bash: Execute bash commands
- Glob: Find files by pattern
- Grep: Search file contents
"""
    ]

    # Add MCP servers section
    if config.mcp_servers:
        mcp_section = "\n## MCP Servers\nYou have access to the following MCP servers:\n"
        for server in config.mcp_servers:
            mcp_section += f"- {server['name']}: MCP server (command: {server['command']})\n"
        prompt_parts.append(mcp_section)

    # Add agents section
    if config.agents:
        agents_section = "\n## Available Agents\nYou can delegate tasks to the following specialized agents using the Task tool:\n"
        for agent in config.agents:
            agents_section += f"- {agent['name']}: {agent.get('description', '')} (model: {agent.get('model', 'sonnet')})\n"
        prompt_parts.append(agents_section)

    # Add skills section
    if config.skills:
        skills_section = "\n## Available Skills\nYou can invoke the following skills:\n"
        for skill in config.skills:
            skills_section += f"- {skill['name']}: {skill.get('description', '')}\n"
        prompt_parts.append(skills_section)

    # Add commands section
    if config.commands:
        commands_section = "\n## Available Commands\nYou can execute the following commands:\n"
        for cmd in config.commands:
            commands_section += f"- /{cmd['name']}: {cmd.get('description', '')}\n"
        prompt_parts.append(commands_section)

    # Add general instructions
    prompt_parts.append("""
## Instructions
- Always provide clear explanations of what you're doing.
- When creating or modifying files, explain your changes.
- Be helpful, safe, and accurate.
- Use the appropriate MCP server, agent, skill, or command for the task at hand.
- Tool execution is handled automatically by the Agent SDK.
""")

    return "\n".join(prompt_parts)


def get_db_enabled_tools(config: "ProjectConfigJSON") -> List[str]:
    """
    DB設定から有効なツール一覧を取得

    Args:
        config: ProjectConfigJSON (DB設定)

    Returns:
        List[str]: ツール名リスト
    """
    tools = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]

    # Add enabled MCP servers
    for server in config.mcp_servers:
        tools.append(f"mcp__{server['name']}")

    # Add enabled agents (as Task tool targets)
    for agent in config.agents:
        tools.append(f"agent__{agent['name']}")

    return tools
