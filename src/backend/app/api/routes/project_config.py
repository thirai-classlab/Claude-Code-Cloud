"""
Project Configuration API Routes

MCP Server, Agent, Skill, Command のCRUD API
認証必須エンドポイント
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.api.middleware import handle_exceptions
from app.core.auth.users import current_active_user
from app.models.database import UserModel
from app.services.permission_service import PermissionService
from app.services.project_config_service import ProjectConfigService
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

router = APIRouter(prefix="/projects/{project_id}", tags=["project-config"])


async def get_config_service(
    session: AsyncSession = Depends(get_db_session),
) -> ProjectConfigService:
    """ProjectConfigService取得"""
    return ProjectConfigService(session)


async def get_permission_service(
    session: AsyncSession = Depends(get_db_session),
) -> PermissionService:
    """PermissionService取得"""
    return PermissionService(session)


async def check_read_permission(
    project_id: str,
    current_user: UserModel,
    permission_service: PermissionService,
) -> None:
    """読み取り権限チェック"""
    if not await permission_service.can_access_project(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this project"
        )


async def check_write_permission(
    project_id: str,
    current_user: UserModel,
    permission_service: PermissionService,
) -> None:
    """書き込み権限チェック"""
    if not await permission_service.can_write(current_user.id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to modify this project"
        )


# ============================================
# Project Config Aggregate Endpoint
# ============================================


@router.get("/config", response_model=ProjectConfigJSON)
@handle_exceptions
async def get_project_config(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> ProjectConfigJSON:
    """
    プロジェクト設定全体をJSON形式で取得（認証必須）

    AgentSdkClientに渡すための設定を取得
    """
    await check_read_permission(project_id, current_user, permission_service)
    return await config_service.get_project_config_json(project_id)


# ============================================
# MCP Server Endpoints
# ============================================


@router.get("/mcp-servers", response_model=List[MCPServerResponse])
@handle_exceptions
async def list_mcp_servers(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> List[MCPServerResponse]:
    """MCPサーバー一覧取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    servers = await config_service.list_mcp_servers(project_id)
    return [MCPServerResponse.model_validate(s) for s in servers]


@router.post("/mcp-servers", response_model=MCPServerResponse, status_code=201)
@handle_exceptions
async def create_mcp_server(
    project_id: str,
    request: MCPServerCreate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> MCPServerResponse:
    """MCPサーバー作成（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    server = await config_service.create_mcp_server(project_id, request)
    return MCPServerResponse.model_validate(server)


@router.get("/mcp-servers/{mcp_id}", response_model=MCPServerResponse)
@handle_exceptions
async def get_mcp_server(
    project_id: str,
    mcp_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> MCPServerResponse:
    """MCPサーバー取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    server = await config_service.get_mcp_server(project_id, mcp_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return MCPServerResponse.model_validate(server)


@router.put("/mcp-servers/{mcp_id}", response_model=MCPServerResponse)
@handle_exceptions
async def update_mcp_server(
    project_id: str,
    mcp_id: str,
    request: MCPServerUpdate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> MCPServerResponse:
    """MCPサーバー更新（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    server = await config_service.update_mcp_server(project_id, mcp_id, request)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return MCPServerResponse.model_validate(server)


@router.delete("/mcp-servers/{mcp_id}", status_code=204)
@handle_exceptions
async def delete_mcp_server(
    project_id: str,
    mcp_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """MCPサーバー削除（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    if not await config_service.delete_mcp_server(project_id, mcp_id):
        raise HTTPException(status_code=404, detail="MCP server not found")


# ============================================
# Agent Endpoints
# ============================================


@router.get("/agents", response_model=List[AgentResponse])
@handle_exceptions
async def list_agents(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> List[AgentResponse]:
    """エージェント一覧取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    agents = await config_service.list_agents(project_id)
    return [AgentResponse.model_validate(a) for a in agents]


@router.post("/agents", response_model=AgentResponse, status_code=201)
@handle_exceptions
async def create_agent(
    project_id: str,
    request: AgentCreate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> AgentResponse:
    """エージェント作成（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    agent = await config_service.create_agent(project_id, request)
    return AgentResponse.model_validate(agent)


@router.get("/agents/{agent_id}", response_model=AgentResponse)
@handle_exceptions
async def get_agent(
    project_id: str,
    agent_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> AgentResponse:
    """エージェント取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    agent = await config_service.get_agent(project_id, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse.model_validate(agent)


@router.put("/agents/{agent_id}", response_model=AgentResponse)
@handle_exceptions
async def update_agent(
    project_id: str,
    agent_id: str,
    request: AgentUpdate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> AgentResponse:
    """エージェント更新（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    agent = await config_service.update_agent(project_id, agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse.model_validate(agent)


@router.delete("/agents/{agent_id}", status_code=204)
@handle_exceptions
async def delete_agent(
    project_id: str,
    agent_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """エージェント削除（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    if not await config_service.delete_agent(project_id, agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")


# ============================================
# Skill Endpoints
# ============================================


@router.get("/skills", response_model=List[SkillResponse])
@handle_exceptions
async def list_skills(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> List[SkillResponse]:
    """スキル一覧取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    skills = await config_service.list_skills(project_id)
    return [SkillResponse.model_validate(s) for s in skills]


@router.post("/skills", response_model=SkillResponse, status_code=201)
@handle_exceptions
async def create_skill(
    project_id: str,
    request: SkillCreate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> SkillResponse:
    """スキル作成（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    skill = await config_service.create_skill(project_id, request)
    return SkillResponse.model_validate(skill)


@router.get("/skills/{skill_id}", response_model=SkillResponse)
@handle_exceptions
async def get_skill(
    project_id: str,
    skill_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> SkillResponse:
    """スキル取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    skill = await config_service.get_skill(project_id, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return SkillResponse.model_validate(skill)


@router.put("/skills/{skill_id}", response_model=SkillResponse)
@handle_exceptions
async def update_skill(
    project_id: str,
    skill_id: str,
    request: SkillUpdate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> SkillResponse:
    """スキル更新（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    skill = await config_service.update_skill(project_id, skill_id, request)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return SkillResponse.model_validate(skill)


@router.delete("/skills/{skill_id}", status_code=204)
@handle_exceptions
async def delete_skill(
    project_id: str,
    skill_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """スキル削除（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    if not await config_service.delete_skill(project_id, skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")


# ============================================
# Command Endpoints
# ============================================


@router.get("/commands", response_model=List[CommandResponse])
@handle_exceptions
async def list_commands(
    project_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> List[CommandResponse]:
    """コマンド一覧取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    commands = await config_service.list_commands(project_id)
    return [CommandResponse.model_validate(c) for c in commands]


@router.post("/commands", response_model=CommandResponse, status_code=201)
@handle_exceptions
async def create_command(
    project_id: str,
    request: CommandCreate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> CommandResponse:
    """コマンド作成（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    command = await config_service.create_command(project_id, request)
    return CommandResponse.model_validate(command)


@router.get("/commands/{command_id}", response_model=CommandResponse)
@handle_exceptions
async def get_command(
    project_id: str,
    command_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> CommandResponse:
    """コマンド取得（認証必須）"""
    await check_read_permission(project_id, current_user, permission_service)
    command = await config_service.get_command(project_id, command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return CommandResponse.model_validate(command)


@router.put("/commands/{command_id}", response_model=CommandResponse)
@handle_exceptions
async def update_command(
    project_id: str,
    command_id: str,
    request: CommandUpdate,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> CommandResponse:
    """コマンド更新（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    command = await config_service.update_command(project_id, command_id, request)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return CommandResponse.model_validate(command)


@router.delete("/commands/{command_id}", status_code=204)
@handle_exceptions
async def delete_command(
    project_id: str,
    command_id: str,
    current_user: UserModel = Depends(current_active_user),
    config_service: ProjectConfigService = Depends(get_config_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> None:
    """コマンド削除（認証必須、書き込み権限）"""
    await check_write_permission(project_id, current_user, permission_service)
    if not await config_service.delete_command(project_id, command_id):
        raise HTTPException(status_code=404, detail="Command not found")
