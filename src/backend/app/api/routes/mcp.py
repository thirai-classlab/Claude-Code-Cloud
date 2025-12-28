"""
MCP Settings API Routes
Handles reading and writing .mcp.json configuration files
"""
import json
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

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

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        config = MCPConfig(**data)
        return MCPConfigResponse(config=config, path=str(config_path))
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON in .mcp.json: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading .mcp.json: {str(e)}"
        )


@router.put("/projects/{project_id}/config", response_model=MCPConfigResponse)
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
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    try:
        # Convert to dict and write
        config_dict = request.config.model_dump(exclude_none=True)

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)

        return MCPConfigResponse(config=request.config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error writing .mcp.json: {str(e)}"
        )


@router.delete("/projects/{project_id}/servers/{server_name}")
async def delete_mcp_server(project_id: str, server_name: str) -> Dict[str, Any]:
    """
    Delete a specific MCP server from configuration
    """
    config_path = get_mcp_config_path(project_id)

    if not config_path.exists():
        raise HTTPException(
            status_code=404,
            detail="MCP configuration file not found"
        )

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "mcpServers" not in data or server_name not in data["mcpServers"]:
            raise HTTPException(
                status_code=404,
                detail=f"Server '{server_name}' not found in configuration"
            )

        del data["mcpServers"][server_name]

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return {"message": f"Server '{server_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating .mcp.json: {str(e)}"
        )
