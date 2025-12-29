"""
Project Configuration Service

MCP Server, Agent, Skill, Command のCRUD操作
"""

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.database import (
    ProjectMCPServerModel,
    ProjectAgentModel,
    ProjectSkillModel,
    ProjectCommandModel,
)
from app.schemas.project_config import (
    MCPServerCreate,
    MCPServerUpdate,
    MCPServerResponse,
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    CommandCreate,
    CommandUpdate,
    CommandResponse,
    ProjectConfigJSON,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ProjectConfigService:
    """プロジェクト設定サービス"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ============================================
    # Filesystem Sync Methods
    # ============================================

    def _get_workspace_path(self, project_id: str) -> Path:
        """ワークスペースパス取得"""
        return Path(settings.workspace_base) / project_id

    async def sync_skills_to_filesystem(self, project_id: str) -> None:
        """
        スキルをファイルシステムに同期

        DBの有効なスキルを .claude/skills/ に書き出し
        """
        workspace_path = self._get_workspace_path(project_id)
        skills_dir = workspace_path / ".claude" / "skills"

        # 既存のスキルディレクトリをクリア
        if skills_dir.exists():
            shutil.rmtree(skills_dir)

        # 有効なスキルを取得
        skills = await self.list_skills(project_id, enabled_only=True)

        if not skills:
            logger.info("No skills to sync", project_id=project_id)
            return

        for skill in skills:
            skill_name = skill.name.replace(" ", "-").lower()
            if not skill_name:
                continue

            skill_folder = skills_dir / skill_name
            skill_folder.mkdir(parents=True, exist_ok=True)

            # SKILL.md を作成
            skill_file = skill_folder / "SKILL.md"
            skill_content = f"""---
description: {skill.description or ''}
category: {skill.category or 'custom'}
---

{skill.content or ''}
"""
            skill_file.write_text(skill_content, encoding="utf-8")

        logger.info(
            "Skills synced to filesystem",
            project_id=project_id,
            count=len(skills),
            path=str(skills_dir),
        )

    async def sync_commands_to_filesystem(self, project_id: str) -> None:
        """
        コマンドをファイルシステムに同期

        DBの有効なコマンドを .claude/commands/ に書き出し
        """
        workspace_path = self._get_workspace_path(project_id)
        commands_dir = workspace_path / ".claude" / "commands"

        # 既存のコマンドディレクトリをクリア
        if commands_dir.exists():
            shutil.rmtree(commands_dir)

        # 有効なコマンドを取得
        commands = await self.list_commands(project_id, enabled_only=True)

        if not commands:
            logger.info("No commands to sync", project_id=project_id)
            return

        commands_dir.mkdir(parents=True, exist_ok=True)

        for cmd in commands:
            cmd_name = cmd.name.replace(" ", "-").lower()
            if not cmd_name:
                continue

            # カテゴリ別サブディレクトリ
            category = cmd.category or ""
            if category and category != "custom":
                cmd_folder = commands_dir / category
                cmd_folder.mkdir(parents=True, exist_ok=True)
                cmd_file = cmd_folder / f"{cmd_name}.md"
            else:
                cmd_file = commands_dir / f"{cmd_name}.md"

            cmd_content = f"""---
description: {cmd.description or ''}
---

{cmd.content or ''}
"""
            cmd_file.write_text(cmd_content, encoding="utf-8")

        logger.info(
            "Commands synced to filesystem",
            project_id=project_id,
            count=len(commands),
            path=str(commands_dir),
        )

    # ============================================
    # MCP Server CRUD
    # ============================================

    async def list_mcp_servers(
        self, project_id: str, enabled_only: bool = False
    ) -> List[ProjectMCPServerModel]:
        """MCPサーバー一覧取得"""
        query = select(ProjectMCPServerModel).where(
            ProjectMCPServerModel.project_id == project_id
        )
        if enabled_only:
            query = query.where(ProjectMCPServerModel.enabled == True)
        query = query.order_by(ProjectMCPServerModel.name)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_mcp_server(
        self, project_id: str, mcp_id: str
    ) -> Optional[ProjectMCPServerModel]:
        """MCPサーバー取得"""
        query = select(ProjectMCPServerModel).where(
            ProjectMCPServerModel.project_id == project_id,
            ProjectMCPServerModel.id == mcp_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_mcp_server(
        self, project_id: str, data: MCPServerCreate
    ) -> ProjectMCPServerModel:
        """MCPサーバー作成"""
        mcp_server = ProjectMCPServerModel(
            project_id=project_id,
            name=data.name,
            command=data.command,
            args=data.args,
            env=data.env,
            enabled=data.enabled,
            enabled_tools=data.enabled_tools,
        )
        self.session.add(mcp_server)
        await self.session.commit()
        await self.session.refresh(mcp_server)
        logger.info("Created MCP server", project_id=project_id, name=data.name)
        return mcp_server

    async def update_mcp_server(
        self, project_id: str, mcp_id: str, data: MCPServerUpdate
    ) -> Optional[ProjectMCPServerModel]:
        """MCPサーバー更新"""
        mcp_server = await self.get_mcp_server(project_id, mcp_id)
        if not mcp_server:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mcp_server, field, value)

        await self.session.commit()
        await self.session.refresh(mcp_server)
        logger.info("Updated MCP server", project_id=project_id, mcp_id=mcp_id)
        return mcp_server

    async def delete_mcp_server(self, project_id: str, mcp_id: str) -> bool:
        """MCPサーバー削除"""
        mcp_server = await self.get_mcp_server(project_id, mcp_id)
        if not mcp_server:
            return False

        await self.session.delete(mcp_server)
        await self.session.commit()
        logger.info("Deleted MCP server", project_id=project_id, mcp_id=mcp_id)
        return True

    # ============================================
    # Agent CRUD
    # ============================================

    async def list_agents(
        self, project_id: str, enabled_only: bool = False
    ) -> List[ProjectAgentModel]:
        """エージェント一覧取得"""
        query = select(ProjectAgentModel).where(
            ProjectAgentModel.project_id == project_id
        )
        if enabled_only:
            query = query.where(ProjectAgentModel.enabled == True)
        query = query.order_by(ProjectAgentModel.category, ProjectAgentModel.name)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_agent(
        self, project_id: str, agent_id: str
    ) -> Optional[ProjectAgentModel]:
        """エージェント取得"""
        query = select(ProjectAgentModel).where(
            ProjectAgentModel.project_id == project_id,
            ProjectAgentModel.id == agent_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_agent(
        self, project_id: str, data: AgentCreate
    ) -> ProjectAgentModel:
        """エージェント作成"""
        agent = ProjectAgentModel(
            project_id=project_id,
            name=data.name,
            description=data.description,
            category=data.category,
            model=data.model,
            tools=data.tools,
            system_prompt=data.system_prompt,
            enabled=data.enabled,
        )
        self.session.add(agent)
        await self.session.commit()
        await self.session.refresh(agent)
        logger.info("Created agent", project_id=project_id, name=data.name)
        return agent

    async def update_agent(
        self, project_id: str, agent_id: str, data: AgentUpdate
    ) -> Optional[ProjectAgentModel]:
        """エージェント更新"""
        agent = await self.get_agent(project_id, agent_id)
        if not agent:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        await self.session.commit()
        await self.session.refresh(agent)
        logger.info("Updated agent", project_id=project_id, agent_id=agent_id)
        return agent

    async def delete_agent(self, project_id: str, agent_id: str) -> bool:
        """エージェント削除"""
        agent = await self.get_agent(project_id, agent_id)
        if not agent:
            return False

        await self.session.delete(agent)
        await self.session.commit()
        logger.info("Deleted agent", project_id=project_id, agent_id=agent_id)
        return True

    # ============================================
    # Skill CRUD
    # ============================================

    async def list_skills(
        self, project_id: str, enabled_only: bool = False
    ) -> List[ProjectSkillModel]:
        """スキル一覧取得"""
        query = select(ProjectSkillModel).where(
            ProjectSkillModel.project_id == project_id
        )
        if enabled_only:
            query = query.where(ProjectSkillModel.enabled == True)
        query = query.order_by(ProjectSkillModel.category, ProjectSkillModel.name)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_skill(
        self, project_id: str, skill_id: str
    ) -> Optional[ProjectSkillModel]:
        """スキル取得"""
        query = select(ProjectSkillModel).where(
            ProjectSkillModel.project_id == project_id,
            ProjectSkillModel.id == skill_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_skill(
        self, project_id: str, data: SkillCreate
    ) -> ProjectSkillModel:
        """スキル作成"""
        skill = ProjectSkillModel(
            project_id=project_id,
            name=data.name,
            description=data.description,
            category=data.category,
            content=data.content,
            enabled=data.enabled,
        )
        self.session.add(skill)
        await self.session.commit()
        await self.session.refresh(skill)
        logger.info("Created skill", project_id=project_id, name=data.name)

        # ファイルシステムに同期
        await self.sync_skills_to_filesystem(project_id)

        return skill

    async def update_skill(
        self, project_id: str, skill_id: str, data: SkillUpdate
    ) -> Optional[ProjectSkillModel]:
        """スキル更新"""
        skill = await self.get_skill(project_id, skill_id)
        if not skill:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(skill, field, value)

        await self.session.commit()
        await self.session.refresh(skill)
        logger.info("Updated skill", project_id=project_id, skill_id=skill_id)

        # ファイルシステムに同期
        await self.sync_skills_to_filesystem(project_id)

        return skill

    async def delete_skill(self, project_id: str, skill_id: str) -> bool:
        """スキル削除"""
        skill = await self.get_skill(project_id, skill_id)
        if not skill:
            return False

        await self.session.delete(skill)
        await self.session.commit()
        logger.info("Deleted skill", project_id=project_id, skill_id=skill_id)

        # ファイルシステムに同期
        await self.sync_skills_to_filesystem(project_id)

        return True

    # ============================================
    # Command CRUD
    # ============================================

    async def list_commands(
        self, project_id: str, enabled_only: bool = False
    ) -> List[ProjectCommandModel]:
        """コマンド一覧取得"""
        query = select(ProjectCommandModel).where(
            ProjectCommandModel.project_id == project_id
        )
        if enabled_only:
            query = query.where(ProjectCommandModel.enabled == True)
        query = query.order_by(ProjectCommandModel.category, ProjectCommandModel.name)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_command(
        self, project_id: str, command_id: str
    ) -> Optional[ProjectCommandModel]:
        """コマンド取得"""
        query = select(ProjectCommandModel).where(
            ProjectCommandModel.project_id == project_id,
            ProjectCommandModel.id == command_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_command(
        self, project_id: str, data: CommandCreate
    ) -> ProjectCommandModel:
        """コマンド作成"""
        command = ProjectCommandModel(
            project_id=project_id,
            name=data.name,
            description=data.description,
            category=data.category,
            content=data.content,
            enabled=data.enabled,
        )
        self.session.add(command)
        await self.session.commit()
        await self.session.refresh(command)
        logger.info("Created command", project_id=project_id, name=data.name)

        # ファイルシステムに同期
        await self.sync_commands_to_filesystem(project_id)

        return command

    async def update_command(
        self, project_id: str, command_id: str, data: CommandUpdate
    ) -> Optional[ProjectCommandModel]:
        """コマンド更新"""
        command = await self.get_command(project_id, command_id)
        if not command:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(command, field, value)

        await self.session.commit()
        await self.session.refresh(command)
        logger.info("Updated command", project_id=project_id, command_id=command_id)

        # ファイルシステムに同期
        await self.sync_commands_to_filesystem(project_id)

        return command

    async def delete_command(self, project_id: str, command_id: str) -> bool:
        """コマンド削除"""
        command = await self.get_command(project_id, command_id)
        if not command:
            return False

        await self.session.delete(command)
        await self.session.commit()
        logger.info("Deleted command", project_id=project_id, command_id=command_id)

        # ファイルシステムに同期
        await self.sync_commands_to_filesystem(project_id)

        return True

    # ============================================
    # Aggregate Methods
    # ============================================

    async def get_project_config_json(self, project_id: str) -> ProjectConfigJSON:
        """
        AgentSdkClient用のプロジェクト設定をJSON形式で取得

        有効な設定のみを返す
        """
        mcp_servers = await self.list_mcp_servers(project_id, enabled_only=True)
        agents = await self.list_agents(project_id, enabled_only=True)
        skills = await self.list_skills(project_id, enabled_only=True)
        commands = await self.list_commands(project_id, enabled_only=True)

        return ProjectConfigJSON(
            mcp_servers=[
                {
                    "name": s.name,
                    "command": s.command,
                    "args": s.args or [],
                    "env": s.env or {},
                    "enabled_tools": s.enabled_tools,
                }
                for s in mcp_servers
            ],
            agents=[
                {
                    "name": a.name,
                    "description": a.description,
                    "category": a.category,
                    "model": a.model,
                    "tools": a.tools or [],
                    "system_prompt": a.system_prompt,
                }
                for a in agents
            ],
            skills=[
                {
                    "name": s.name,
                    "description": s.description,
                    "category": s.category,
                    "content": s.content,
                }
                for s in skills
            ],
            commands=[
                {
                    "name": c.name,
                    "description": c.description,
                    "category": c.category,
                    "content": c.content,
                }
                for c in commands
            ],
        )
