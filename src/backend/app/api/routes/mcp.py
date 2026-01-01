"""
MCP Settings API Routes
Handles reading and writing .mcp.json configuration files
"""
import json
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.middleware import handle_exceptions
from app.config import settings
from app.models.errors import NotFoundError, ValidationError

router = APIRouter(prefix="/mcp", tags=["mcp"])


class MCPServerConfig(BaseModel):
    """Configuration for a single MCP server"""
    command: str
    args: list[str] = []
    env: Optional[Dict[str, str]] = None


class MCPConfig(BaseModel):
    """Full MCP configuration"""
    mcpServers: Dict[str, MCPServerConfig] = {}


class MCPConfigResponse(BaseModel):
    """Response containing MCP configuration"""
    config: MCPConfig
    path: str


class UpdateMCPConfigRequest(BaseModel):
    """Request to update MCP configuration"""
    config: MCPConfig


def get_mcp_config_path(project_id: str) -> Path:
    """Get the path to the .mcp.json file for a project"""
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id
    return project_path / ".mcp.json"


@router.get("/projects/{project_id}/config", response_model=MCPConfigResponse)
@handle_exceptions
async def get_mcp_config(project_id: str) -> MCPConfigResponse:
    """
    Get MCP configuration for a project
    Returns empty config if .mcp.json doesn't exist
    """
    config_path = get_mcp_config_path(project_id)

    if not config_path.exists():
        # Return empty config if file doesn't exist
        return MCPConfigResponse(
            config=MCPConfig(mcpServers={}),
            path=str(config_path)
        )

    with open(config_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON in .mcp.json: {str(e)}")

    config = MCPConfig(**data)
    return MCPConfigResponse(config=config, path=str(config_path))


@router.put("/projects/{project_id}/config", response_model=MCPConfigResponse)
@handle_exceptions
async def update_mcp_config(
    project_id: str,
    request: UpdateMCPConfigRequest
) -> MCPConfigResponse:
    """
    Update MCP configuration for a project
    Creates .mcp.json if it doesn't exist
    """
    config_path = get_mcp_config_path(project_id)

    # Ensure project directory exists
    if not config_path.parent.exists():
        raise NotFoundError("Project workspace", project_id)

    # Convert to dict and write
    config_dict = request.config.model_dump(exclude_none=True)

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_dict, f, indent=2, ensure_ascii=False)

    return MCPConfigResponse(config=request.config, path=str(config_path))


@router.delete("/projects/{project_id}/servers/{server_name}")
@handle_exceptions
async def delete_mcp_server(project_id: str, server_name: str) -> Dict[str, Any]:
    """
    Delete a specific MCP server from configuration
    """
    config_path = get_mcp_config_path(project_id)

    if not config_path.exists():
        raise NotFoundError("MCP configuration file", project_id)

    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "mcpServers" not in data or server_name not in data["mcpServers"]:
        raise NotFoundError("Server", server_name)

    del data["mcpServers"][server_name]

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return {"message": f"Server '{server_name}' deleted successfully"}
