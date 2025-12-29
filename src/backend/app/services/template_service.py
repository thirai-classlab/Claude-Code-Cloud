"""
Template Service

プロジェクトテンプレートのCRUD操作とプロジェクト初期化/テンプレート化ロジック
"""

import fnmatch
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.database import (
    ProjectModel,
    ProjectMCPServerModel,
    ProjectAgentModel,
    ProjectSkillModel,
    ProjectCommandModel,
    ProjectTemplateModel,
    ProjectTemplateFileModel,
)
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateFileCreate,
    TemplateListResponse,
    CreateProjectFromTemplateRequest,
    CreateTemplateFromProjectRequest,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TemplateService:
    """テンプレートサービス"""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _get_workspace_path(self, project_id: str) -> Path:
        """ワークスペースパス取得"""
        return Path(settings.workspace_base) / project_id

    # ============================================
    # Template CRUD
    # ============================================

    async def list_templates(
        self,
        user_id: str,
        include_public: bool = True,
        search: Optional[str] = None,
    ) -> List[TemplateListResponse]:
        """
        テンプレート一覧取得

        Args:
            user_id: ユーザーID
            include_public: 公開テンプレートを含めるか
            search: 検索キーワード
        """
        query = select(ProjectTemplateModel).options(
            selectinload(ProjectTemplateModel.files)
        )

        # 自分のテンプレート + 公開テンプレート
        if include_public:
            query = query.where(
                or_(
                    ProjectTemplateModel.user_id == user_id,
                    ProjectTemplateModel.is_public == True,
                )
            )
        else:
            query = query.where(ProjectTemplateModel.user_id == user_id)

        # 検索フィルタ
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    ProjectTemplateModel.name.ilike(search_pattern),
                    ProjectTemplateModel.description.ilike(search_pattern),
                )
            )

        query = query.order_by(
            ProjectTemplateModel.updated_at.desc()
        )

        result = await self.session.execute(query)
        templates = result.scalars().all()

        return [
            TemplateListResponse(
                id=t.id,
                user_id=t.user_id,
                name=t.name,
                description=t.description,
                is_public=t.is_public,
                file_count=len(t.files) if t.files else 0,
                mcp_server_count=len(t.mcp_servers) if t.mcp_servers else 0,
                agent_count=len(t.agents) if t.agents else 0,
                skill_count=len(t.skills) if t.skills else 0,
                command_count=len(t.commands) if t.commands else 0,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in templates
        ]

    async def get_template(
        self, template_id: str, user_id: Optional[str] = None
    ) -> Optional[ProjectTemplateModel]:
        """
        テンプレート取得

        Args:
            template_id: テンプレートID
            user_id: ユーザーID（権限チェック用、Noneの場合は公開テンプレートのみ）
        """
        query = select(ProjectTemplateModel).options(
            selectinload(ProjectTemplateModel.files)
        ).where(ProjectTemplateModel.id == template_id)

        result = await self.session.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return None

        # 権限チェック: 自分のテンプレートまたは公開テンプレート
        if user_id:
            if template.user_id != user_id and not template.is_public:
                return None
        else:
            if not template.is_public:
                return None

        return template

    async def create_template(
        self, user_id: str, data: TemplateCreate
    ) -> ProjectTemplateModel:
        """テンプレート作成"""
        template = ProjectTemplateModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name,
            description=data.description,
            is_public=data.is_public,
            mcp_servers=data.mcp_servers,
            agents=data.agents,
            skills=data.skills,
            commands=data.commands,
        )
        self.session.add(template)

        # ファイルを追加
        for file_data in data.files:
            template_file = ProjectTemplateFileModel(
                id=str(uuid.uuid4()),
                template_id=template.id,
                file_path=file_data.file_path,
                content=file_data.content,
            )
            self.session.add(template_file)

        await self.session.commit()
        await self.session.refresh(template)

        logger.info("Created template", user_id=user_id, template_id=template.id, name=data.name)
        return template

    async def update_template(
        self, template_id: str, user_id: str, data: TemplateUpdate
    ) -> Optional[ProjectTemplateModel]:
        """テンプレート更新（所有者のみ）"""
        query = select(ProjectTemplateModel).where(
            ProjectTemplateModel.id == template_id,
            ProjectTemplateModel.user_id == user_id,
        )
        result = await self.session.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        await self.session.commit()
        await self.session.refresh(template)

        logger.info("Updated template", template_id=template_id)
        return template

    async def delete_template(self, template_id: str, user_id: str) -> bool:
        """テンプレート削除（所有者のみ）"""
        query = select(ProjectTemplateModel).where(
            ProjectTemplateModel.id == template_id,
            ProjectTemplateModel.user_id == user_id,
        )
        result = await self.session.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return False

        await self.session.delete(template)
        await self.session.commit()

        logger.info("Deleted template", template_id=template_id)
        return True

    # ============================================
    # Template File Operations
    # ============================================

    async def add_template_file(
        self, template_id: str, user_id: str, file_data: TemplateFileCreate
    ) -> Optional[ProjectTemplateFileModel]:
        """テンプレートにファイルを追加"""
        # 所有者チェック
        query = select(ProjectTemplateModel).where(
            ProjectTemplateModel.id == template_id,
            ProjectTemplateModel.user_id == user_id,
        )
        result = await self.session.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return None

        template_file = ProjectTemplateFileModel(
            id=str(uuid.uuid4()),
            template_id=template_id,
            file_path=file_data.file_path,
            content=file_data.content,
        )
        self.session.add(template_file)
        await self.session.commit()
        await self.session.refresh(template_file)

        logger.info("Added template file", template_id=template_id, file_path=file_data.file_path)
        return template_file

    async def delete_template_file(
        self, template_id: str, user_id: str, file_id: str
    ) -> bool:
        """テンプレートからファイルを削除"""
        # 所有者チェック
        query = select(ProjectTemplateModel).where(
            ProjectTemplateModel.id == template_id,
            ProjectTemplateModel.user_id == user_id,
        )
        result = await self.session.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return False

        # ファイル取得
        file_query = select(ProjectTemplateFileModel).where(
            ProjectTemplateFileModel.id == file_id,
            ProjectTemplateFileModel.template_id == template_id,
        )
        file_result = await self.session.execute(file_query)
        template_file = file_result.scalar_one_or_none()

        if not template_file:
            return False

        await self.session.delete(template_file)
        await self.session.commit()

        logger.info("Deleted template file", template_id=template_id, file_id=file_id)
        return True

    # ============================================
    # Project <-> Template Operations
    # ============================================

    async def create_template_from_project(
        self, user_id: str, data: CreateTemplateFromProjectRequest
    ) -> Optional[ProjectTemplateModel]:
        """
        既存プロジェクトからテンプレートを作成

        プロジェクトの設定とワークスペースファイルをテンプレート化
        """
        # プロジェクト取得
        project_query = select(ProjectModel).where(
            ProjectModel.id == data.project_id,
        )
        project_result = await self.session.execute(project_query)
        project = project_result.scalar_one_or_none()

        if not project:
            logger.warning("Project not found", project_id=data.project_id)
            return None

        # MCP Servers取得
        mcp_query = select(ProjectMCPServerModel).where(
            ProjectMCPServerModel.project_id == data.project_id
        )
        mcp_result = await self.session.execute(mcp_query)
        mcp_servers = mcp_result.scalars().all()

        # Agents取得
        agent_query = select(ProjectAgentModel).where(
            ProjectAgentModel.project_id == data.project_id
        )
        agent_result = await self.session.execute(agent_query)
        agents = agent_result.scalars().all()

        # Skills取得
        skill_query = select(ProjectSkillModel).where(
            ProjectSkillModel.project_id == data.project_id
        )
        skill_result = await self.session.execute(skill_query)
        skills = skill_result.scalars().all()

        # Commands取得
        command_query = select(ProjectCommandModel).where(
            ProjectCommandModel.project_id == data.project_id
        )
        command_result = await self.session.execute(command_query)
        commands = command_result.scalars().all()

        # テンプレート作成
        template = ProjectTemplateModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.template_name,
            description=data.template_description,
            is_public=data.is_public,
            mcp_servers=[
                {
                    "name": s.name,
                    "command": s.command,
                    "args": s.args or [],
                    "env": s.env or {},
                    "enabled": s.enabled,
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
                    "enabled": a.enabled,
                }
                for a in agents
            ],
            skills=[
                {
                    "name": s.name,
                    "description": s.description,
                    "category": s.category,
                    "content": s.content,
                    "enabled": s.enabled,
                }
                for s in skills
            ],
            commands=[
                {
                    "name": c.name,
                    "description": c.description,
                    "category": c.category,
                    "content": c.content,
                    "enabled": c.enabled,
                }
                for c in commands
            ],
        )
        self.session.add(template)

        # ワークスペースファイルを追加
        if data.include_files:
            workspace_path = self._get_workspace_path(data.project_id)
            if workspace_path.exists():
                files = self._collect_workspace_files(
                    workspace_path,
                    data.file_patterns,
                    data.exclude_patterns,
                )
                for file_path, content in files:
                    template_file = ProjectTemplateFileModel(
                        id=str(uuid.uuid4()),
                        template_id=template.id,
                        file_path=file_path,
                        content=content,
                    )
                    self.session.add(template_file)

        await self.session.commit()
        await self.session.refresh(template)

        logger.info(
            "Created template from project",
            user_id=user_id,
            project_id=data.project_id,
            template_id=template.id,
        )
        return template

    def _collect_workspace_files(
        self,
        workspace_path: Path,
        include_patterns: List[str],
        exclude_patterns: List[str],
    ) -> List[tuple]:
        """
        ワークスペースからファイルを収集

        Returns:
            List of (relative_path, content) tuples
        """
        files = []
        max_file_size = 1024 * 1024  # 1MB

        for root, dirs, filenames in os.walk(workspace_path):
            # 除外パターンにマッチするディレクトリをスキップ
            dirs[:] = [
                d for d in dirs
                if not any(
                    fnmatch.fnmatch(d, pattern.rstrip("/**"))
                    for pattern in exclude_patterns
                    if pattern.endswith("/**")
                )
            ]

            for filename in filenames:
                file_path = Path(root) / filename
                relative_path = str(file_path.relative_to(workspace_path))

                # 除外パターンチェック
                if any(fnmatch.fnmatch(relative_path, pattern) for pattern in exclude_patterns):
                    continue

                # 含めるパターンチェック
                if not any(fnmatch.fnmatch(filename, pattern) for pattern in include_patterns):
                    continue

                # ファイルサイズチェック
                try:
                    if file_path.stat().st_size > max_file_size:
                        logger.warning(f"Skipping large file: {relative_path}")
                        continue

                    content = file_path.read_text(encoding="utf-8")
                    files.append((relative_path, content))
                except (UnicodeDecodeError, IOError) as e:
                    logger.warning(f"Skipping file {relative_path}: {e}")
                    continue

        return files

    async def create_project_from_template(
        self, user_id: str, data: CreateProjectFromTemplateRequest
    ) -> Optional[ProjectModel]:
        """
        テンプレートから新規プロジェクトを作成

        テンプレートの設定とファイルをプロジェクトにコピー
        """
        # テンプレート取得
        template = await self.get_template(data.template_id, user_id)
        if not template:
            logger.warning("Template not found or access denied", template_id=data.template_id)
            return None

        # プロジェクト作成
        project_id = str(uuid.uuid4())
        project = ProjectModel(
            id=project_id,
            name=data.project_name,
            description=data.project_description,
            user_id=user_id,
            status="active",
            workspace_path=str(self._get_workspace_path(project_id)),
            session_count=0,
        )
        self.session.add(project)

        # MCP Servers作成
        for mcp_data in template.mcp_servers or []:
            mcp_server = ProjectMCPServerModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                name=mcp_data.get("name", ""),
                command=mcp_data.get("command", ""),
                args=mcp_data.get("args", []),
                env=mcp_data.get("env", {}),
                enabled=mcp_data.get("enabled", True),
                enabled_tools=mcp_data.get("enabled_tools"),
            )
            self.session.add(mcp_server)

        # Agents作成
        for agent_data in template.agents or []:
            agent = ProjectAgentModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                name=agent_data.get("name", ""),
                description=agent_data.get("description"),
                category=agent_data.get("category", "custom"),
                model=agent_data.get("model", "sonnet"),
                tools=agent_data.get("tools", []),
                system_prompt=agent_data.get("system_prompt"),
                enabled=agent_data.get("enabled", True),
            )
            self.session.add(agent)

        # Skills作成
        for skill_data in template.skills or []:
            skill = ProjectSkillModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                name=skill_data.get("name", ""),
                description=skill_data.get("description"),
                category=skill_data.get("category", "custom"),
                content=skill_data.get("content"),
                enabled=skill_data.get("enabled", True),
            )
            self.session.add(skill)

        # Commands作成
        for cmd_data in template.commands or []:
            command = ProjectCommandModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                name=cmd_data.get("name", ""),
                description=cmd_data.get("description"),
                category=cmd_data.get("category", "custom"),
                content=cmd_data.get("content"),
                enabled=cmd_data.get("enabled", True),
            )
            self.session.add(command)

        await self.session.commit()

        # ワークスペースディレクトリ作成とファイル配置
        workspace_path = self._get_workspace_path(project_id)
        workspace_path.mkdir(parents=True, exist_ok=True)

        for template_file in template.files or []:
            file_path = workspace_path / template_file.file_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            if template_file.content:
                file_path.write_text(template_file.content, encoding="utf-8")

        await self.session.refresh(project)

        logger.info(
            "Created project from template",
            user_id=user_id,
            template_id=data.template_id,
            project_id=project_id,
        )
        return project
