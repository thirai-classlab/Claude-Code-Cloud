"""
Chat Message Processor

チャットメッセージ処理を担当するクラス
設定読み込み、SDKオプション構築、システムプロンプト生成を分離
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from claude_agent_sdk import ClaudeAgentOptions
from claude_agent_sdk.types import McpStdioServerConfig, AgentDefinition

from app.config import settings
from app.core.config_loader import (
    ProjectConfig,
    load_project_config,
    generate_enhanced_system_prompt,
    get_enabled_tools,
)
from app.core.project_manager import ProjectManager
from app.models.database import ProjectModel
from app.schemas.project_config import ProjectConfigJSON
from app.services.project_config_service import ProjectConfigService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# デフォルトツール一覧
DEFAULT_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]


@dataclass
class ConfigBundle:
    """設定をまとめて保持するデータクラス"""

    project: ProjectModel
    db_config: ProjectConfigJSON
    file_config: Optional[ProjectConfig] = None
    use_db_config: bool = False
    workspace_path: str = ""
    mcp_servers_config: Dict[str, McpStdioServerConfig] = field(default_factory=dict)
    agents_config: Dict[str, AgentDefinition] = field(default_factory=dict)


class ChatMessageProcessor:
    """
    チャットメッセージ処理を担当するクラス

    責務:
    - プロジェクト設定の読み込み（DB優先、ファイルフォールバック）
    - Claude Agent SDK オプションの構築
    - システムプロンプトの生成
    - 有効なツールリストの取得
    """

    def __init__(self, session: AsyncSession, project_id: str):
        """
        Args:
            session: データベースセッション
            project_id: プロジェクトID
        """
        self.session = session
        self.project_id = project_id
        self._project_manager = ProjectManager(session)
        self._config_service = ProjectConfigService(session)

    async def load_config(self) -> Optional[ConfigBundle]:
        """
        プロジェクト設定を読み込む

        DB設定を優先し、存在しない場合はファイルベースにフォールバック

        Returns:
            ConfigBundle: 設定バンドル（プロジェクトが見つからない場合はNone）
        """
        # プロジェクト取得
        project = await self._project_manager.get_project(self.project_id)
        if not project:
            logger.warning("Project not found", project_id=self.project_id)
            return None

        # ワークスペースパス
        workspace_path = str(Path(settings.workspace_base) / self.project_id)

        # DB設定を読み込み
        db_config = await self._config_service.get_project_config_json(self.project_id)

        # DB設定が存在するか判定
        use_db_config = bool(
            db_config.mcp_servers
            or db_config.agents
            or db_config.skills
            or db_config.commands
        )

        # 設定バンドル作成
        config = ConfigBundle(
            project=project,
            db_config=db_config,
            use_db_config=use_db_config,
            workspace_path=workspace_path,
        )

        # MCP Servers / Agents を構築
        if use_db_config:
            config.mcp_servers_config = self._build_mcp_servers_from_db(db_config)
            config.agents_config = self._build_agents_from_db(db_config)
            logger.info(
                "Project config loaded from DB",
                project_id=self.project_id,
                mcp_servers_count=len(db_config.mcp_servers),
                agents_count=len(db_config.agents),
                skills_count=len(db_config.skills),
                commands_count=len(db_config.commands),
            )
        else:
            # ファイルベースのフォールバック
            file_config = load_project_config(workspace_path)
            config.file_config = file_config
            config.mcp_servers_config = self._build_mcp_servers_from_file(file_config)
            config.agents_config = self._build_agents_from_file(file_config)
            logger.info(
                "Project config loaded from files (fallback)",
                project_id=self.project_id,
                mcp_servers=list(file_config.mcp_servers.keys()),
                agents=list(file_config.agents.keys()),
                skills=list(file_config.skills.keys()),
                commands=list(file_config.commands.keys()),
            )

        return config

    def _build_mcp_servers_from_db(
        self, db_config: ProjectConfigJSON
    ) -> Dict[str, McpStdioServerConfig]:
        """DB設定からMCP Servers構成を構築"""
        mcp_servers: Dict[str, McpStdioServerConfig] = {}
        for mcp in db_config.mcp_servers:
            mcp_servers[mcp["name"]] = McpStdioServerConfig(
                type="stdio",
                command=mcp["command"],
                args=mcp.get("args", []),
                env=mcp.get("env", {}),
            )
        return mcp_servers

    def _build_agents_from_db(
        self, db_config: ProjectConfigJSON
    ) -> Dict[str, AgentDefinition]:
        """DB設定からAgents構成を構築"""
        agents: Dict[str, AgentDefinition] = {}
        for agent in db_config.agents:
            agents[agent["name"]] = AgentDefinition(
                description=agent.get("description", ""),
                prompt=agent.get("system_prompt", ""),
                tools=agent.get("tools"),
                model=agent.get("model", "sonnet"),
            )
        return agents

    def _build_mcp_servers_from_file(
        self, file_config: ProjectConfig
    ) -> Dict[str, McpStdioServerConfig]:
        """ファイル設定からMCP Servers構成を構築"""
        mcp_servers: Dict[str, McpStdioServerConfig] = {}
        for name, mcp in file_config.mcp_servers.items():
            mcp_servers[name] = McpStdioServerConfig(
                type="stdio",
                command=mcp.command,
                args=mcp.args or [],
                env=mcp.env or {},
            )
        return mcp_servers

    def _build_agents_from_file(
        self, file_config: ProjectConfig
    ) -> Dict[str, AgentDefinition]:
        """ファイル設定からAgents構成を構築"""
        agents: Dict[str, AgentDefinition] = {}
        for name, agent in file_config.agents.items():
            agents[name] = AgentDefinition(
                description=agent.description or "",
                prompt=agent.system_prompt or "",
                tools=agent.tools,
                model=agent.model or "sonnet",
            )
        return agents

    def generate_system_prompt(self, config: ConfigBundle) -> str:
        """
        システムプロンプトを生成する

        Args:
            config: 設定バンドル

        Returns:
            str: システムプロンプト
        """
        if config.use_db_config:
            return self._generate_db_system_prompt(
                config.workspace_path, config.db_config
            )
        elif config.file_config:
            return generate_enhanced_system_prompt(
                config.workspace_path, config.file_config
            )
        else:
            # フォールバック: 基本的なプロンプト
            return self._generate_basic_system_prompt(config.workspace_path)

    def _generate_basic_system_prompt(self, workspace_path: str) -> str:
        """基本システムプロンプトを生成"""
        return f"""You are Claude Code, an AI coding assistant powered by Claude Agent SDK.

Your workspace is located at: {workspace_path}

## Default Tools
You have access to the following default tools:
- Read: Read file contents
- Write: Create or overwrite a file
- Edit: Edit a file by replacing text
- Bash: Execute bash commands
- Glob: Find files by pattern
- Grep: Search file contents

## Instructions
- Always provide clear explanations of what you're doing.
- When creating or modifying files, explain your changes.
- Be helpful, safe, and accurate.
- Tool execution is handled automatically by the Agent SDK.
"""

    def _generate_db_system_prompt(
        self, workspace_path: str, config: ProjectConfigJSON
    ) -> str:
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
            mcp_section = (
                "\n## MCP Servers\nYou have access to the following MCP servers:\n"
            )
            for server in config.mcp_servers:
                mcp_section += (
                    f"- {server['name']}: MCP server (command: {server['command']})\n"
                )
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
            commands_section = (
                "\n## Available Commands\nYou can execute the following commands:\n"
            )
            for cmd in config.commands:
                commands_section += f"- /{cmd['name']}: {cmd.get('description', '')}\n"
            prompt_parts.append(commands_section)

        # Add general instructions
        prompt_parts.append(
            """
## Instructions
- Always provide clear explanations of what you're doing.
- When creating or modifying files, explain your changes.
- Be helpful, safe, and accurate.
- Use the appropriate MCP server, agent, skill, or command for the task at hand.
- Tool execution is handled automatically by the Agent SDK.
"""
        )

        return "\n".join(prompt_parts)

    def get_enabled_tools(self, config: ConfigBundle) -> List[str]:
        """
        有効なツールリストを取得する

        Args:
            config: 設定バンドル

        Returns:
            List[str]: ツール名リスト
        """
        if config.use_db_config:
            return self._get_db_enabled_tools(config.db_config)
        elif config.file_config:
            return get_enabled_tools(config.file_config)
        else:
            return DEFAULT_TOOLS.copy()

    def _get_db_enabled_tools(self, config: ProjectConfigJSON) -> List[str]:
        """
        DB設定から有効なツール一覧を取得

        Args:
            config: ProjectConfigJSON (DB設定)

        Returns:
            List[str]: ツール名リスト
        """
        tools = DEFAULT_TOOLS.copy()

        # Add enabled MCP servers
        for server in config.mcp_servers:
            tools.append(f"mcp__{server['name']}")

        # Add enabled agents (as Task tool targets)
        for agent in config.agents:
            tools.append(f"agent__{agent['name']}")

        return tools

    def build_sdk_options(
        self,
        config: ConfigBundle,
        system_prompt: Optional[str] = None,
    ) -> ClaudeAgentOptions:
        """
        Claude Agent SDK オプションを構築する

        Args:
            config: 設定バンドル
            system_prompt: カスタムシステムプロンプト（Noneの場合は自動生成）

        Returns:
            ClaudeAgentOptions: SDKオプション
        """
        # システムプロンプト
        prompt = system_prompt or self.generate_system_prompt(config)

        # ツールリスト
        tools = self.get_enabled_tools(config)

        # Skill ツールを有効化（DB設定でskillsがある場合）
        if config.use_db_config and config.db_config.skills and "Skill" not in tools:
            tools.append("Skill")

        # SDKオプション構築
        options = ClaudeAgentOptions(
            system_prompt=prompt,
            allowed_tools=tools,
            permission_mode="acceptEdits",
            cwd=Path(config.workspace_path),
            mcp_servers=config.mcp_servers_config if config.mcp_servers_config else {},
            agents=config.agents_config if config.agents_config else None,
            setting_sources=["project"],  # Skills/Commands をファイルシステムから読み込み
            env={"ANTHROPIC_API_KEY": config.project.api_key},  # プロジェクト固有のAPIキー
        )

        # ログ出力
        skills_count = (
            len(config.db_config.skills)
            if config.use_db_config
            else len(config.file_config.skills)
            if config.file_config
            else 0
        )
        commands_count = (
            len(config.db_config.commands)
            if config.use_db_config
            else len(config.file_config.commands)
            if config.file_config
            else 0
        )

        logger.info(
            "Built Claude Agent SDK options",
            project_id=self.project_id,
            tools_count=len(tools),
            mcp_servers_count=len(config.mcp_servers_config),
            agents_count=len(config.agents_config),
            skills_count=skills_count,
            commands_count=commands_count,
        )

        return options

    def validate_api_key(self, config: ConfigBundle) -> Optional[str]:
        """
        APIキーの検証

        Args:
            config: 設定バンドル

        Returns:
            Optional[str]: エラーメッセージ（問題がなければNone）
        """
        if not config.project.api_key:
            return "プロジェクトにAPIキーが設定されていません。設定画面でAPIキーを設定してください。"
        return None
