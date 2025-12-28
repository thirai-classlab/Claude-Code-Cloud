"""
Agents Settings API Routes
Handles reading and writing .agents.json configuration files
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/agents", tags=["agents"])


# Available agent definitions
AVAILABLE_AGENTS: List[Dict[str, Any]] = [
    # Exploration
    {"name": "Explore", "description": "Fast codebase exploration and file search", "category": "exploration", "defaultEnabled": True},
    {"name": "Plan", "description": "Software architect for designing implementation plans", "category": "exploration", "defaultEnabled": True},
    {"name": "general-purpose", "description": "General-purpose agent for complex multi-step tasks", "category": "exploration", "defaultEnabled": True},
    {"name": "claude-code-guide", "description": "Claude Code and Agent SDK documentation guide", "category": "exploration", "defaultEnabled": False},

    # Development
    {"name": "frontend-developer", "description": "Expert React/Next.js UI engineer", "category": "development", "defaultEnabled": True},
    {"name": "backend-developer", "description": "Senior backend engineer for scalable APIs", "category": "development", "defaultEnabled": True},
    {"name": "fullstack-developer", "description": "End-to-end feature developer", "category": "development", "defaultEnabled": False},
    {"name": "python-pro", "description": "Expert Python developer with type safety focus", "category": "development", "defaultEnabled": True},
    {"name": "typescript-pro", "description": "Expert TypeScript developer", "category": "development", "defaultEnabled": True},
    {"name": "nextjs-developer", "description": "Next.js 14+ specialist with App Router", "category": "development", "defaultEnabled": False},
    {"name": "django-developer", "description": "Django/FastAPI specialist", "category": "development", "defaultEnabled": False},

    # Quality
    {"name": "code-reviewer", "description": "Expert code reviewer for quality and security", "category": "quality", "defaultEnabled": True},
    {"name": "test-automator", "description": "Test automation engineer", "category": "quality", "defaultEnabled": True},
    {"name": "qa-expert", "description": "Comprehensive quality assurance engineer", "category": "quality", "defaultEnabled": False},
    {"name": "debugger", "description": "Expert debugger for complex issue diagnosis", "category": "quality", "defaultEnabled": True},
    {"name": "performance-engineer", "description": "System optimization specialist", "category": "quality", "defaultEnabled": False},

    # Documentation
    {"name": "technical-writer", "description": "Expert technical documentation writer", "category": "documentation", "defaultEnabled": True},
    {"name": "documentation-engineer", "description": "Documentation systems engineer", "category": "documentation", "defaultEnabled": False},
    {"name": "api-documenter", "description": "API documentation specialist", "category": "documentation", "defaultEnabled": False},

    # DevOps
    {"name": "devops-engineer", "description": "DevOps engineer for CI/CD and automation", "category": "devops", "defaultEnabled": False},
    {"name": "kubernetes-specialist", "description": "Kubernetes and container orchestration expert", "category": "devops", "defaultEnabled": False},
    {"name": "docker", "description": "Docker environment specialist", "category": "devops", "defaultEnabled": False},
    {"name": "security-engineer", "description": "Infrastructure security and DevSecOps engineer", "category": "devops", "defaultEnabled": False},

    # Data/AI
    {"name": "data-analyst", "description": "Business intelligence and data visualization expert", "category": "data", "defaultEnabled": False},
    {"name": "sql-pro", "description": "SQL optimization specialist", "category": "data", "defaultEnabled": False},
    {"name": "postgres-pro", "description": "PostgreSQL specialist", "category": "data", "defaultEnabled": False},
    {"name": "prompt-engineer", "description": "Prompt design and optimization expert", "category": "data", "defaultEnabled": False},
    {"name": "mcp-developer", "description": "MCP server and client developer", "category": "data", "defaultEnabled": False},
]


class AgentConfig(BaseModel):
    """Configuration for a single agent"""
    enabled: bool = True
    description: Optional[str] = None
    category: str = "exploration"
    settings: Dict[str, Any] = {}


class AgentsConfig(BaseModel):
    """Full agents configuration"""
    agents: Dict[str, AgentConfig] = {}
    defaultEnabled: List[str] = []
    version: str = "1.0"


class AgentsConfigResponse(BaseModel):
    """Response containing agents configuration"""
    config: AgentsConfig
    path: str


class UpdateAgentsConfigRequest(BaseModel):
    """Request to update agents configuration"""
    config: AgentsConfig


class ToggleAgentRequest(BaseModel):
    """Request to toggle a single agent"""
    enabled: bool


class AgentDefinition(BaseModel):
    """Agent definition for frontend"""
    name: str
    description: str
    category: str
    defaultEnabled: bool


class CreateCustomAgentRequest(BaseModel):
    """Request to create a custom agent file"""
    name: str
    description: str
    category: str = "development"
    model: str = "sonnet"
    tools: List[str] = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]


class CreateCustomAgentResponse(BaseModel):
    """Response after creating a custom agent file"""
    message: str
    file_path: str
    relative_path: str


def get_agents_config_path(project_id: str) -> Path:
    """Get the path to the .agents.json file for a project"""
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id
    return project_path / ".agents.json"


def get_empty_config() -> AgentsConfig:
    """Get empty agents configuration (no global defaults)"""
    return AgentsConfig(
        agents={},
        defaultEnabled=[],
        version="1.0"
    )


def get_default_config() -> AgentsConfig:
    """Get default agents configuration with all agents enabled by default"""
    agents: Dict[str, AgentConfig] = {}
    default_enabled: List[str] = []

    for agent in AVAILABLE_AGENTS:
        agents[agent["name"]] = AgentConfig(
            enabled=agent["defaultEnabled"],
            description=agent["description"],
            category=agent["category"],
            settings={}
        )
        if agent["defaultEnabled"]:
            default_enabled.append(agent["name"])

    return AgentsConfig(
        agents=agents,
        defaultEnabled=default_enabled,
        version="1.0"
    )


@router.get("/available", response_model=List[AgentDefinition])
async def get_available_agents() -> List[AgentDefinition]:
    """
    Get list of all available agents
    """
    return [AgentDefinition(**agent) for agent in AVAILABLE_AGENTS]


@router.get("/projects/{project_id}/config", response_model=AgentsConfigResponse)
async def get_agents_config(project_id: str) -> AgentsConfigResponse:
    """
    Get agents configuration for a project
    Returns empty config if .agents.json doesn't exist (no global defaults)
    """
    config_path = get_agents_config_path(project_id)

    if not config_path.exists():
        # Return empty config if file doesn't exist (no global defaults)
        return AgentsConfigResponse(
            config=get_empty_config(),
            path=str(config_path)
        )

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        config = AgentsConfig(**data)
        return AgentsConfigResponse(config=config, path=str(config_path))
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON in .agents.json: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading .agents.json: {str(e)}"
        )


@router.put("/projects/{project_id}/config", response_model=AgentsConfigResponse)
async def update_agents_config(
    project_id: str,
    request: UpdateAgentsConfigRequest
) -> AgentsConfigResponse:
    """
    Update agents configuration for a project
    Creates .agents.json if it doesn't exist
    """
    config_path = get_agents_config_path(project_id)

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

        return AgentsConfigResponse(config=request.config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error writing .agents.json: {str(e)}"
        )


@router.patch("/projects/{project_id}/agents/{agent_name}")
async def toggle_agent(
    project_id: str,
    agent_name: str,
    request: ToggleAgentRequest
) -> Dict[str, Any]:
    """
    Toggle a specific agent's enabled status
    """
    config_path = get_agents_config_path(project_id)

    # Get current config or empty (no global defaults)
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            config = AgentsConfig(**data)
        except Exception:
            config = get_empty_config()
    else:
        config = get_empty_config()

    # Check if agent exists
    valid_agent_names = [a["name"] for a in AVAILABLE_AGENTS]
    if agent_name not in valid_agent_names:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent_name}' not found"
        )

    # Update agent config
    if agent_name not in config.agents:
        # Find agent definition
        agent_def = next((a for a in AVAILABLE_AGENTS if a["name"] == agent_name), None)
        if agent_def:
            config.agents[agent_name] = AgentConfig(
                enabled=request.enabled,
                description=agent_def["description"],
                category=agent_def["category"],
                settings={}
            )
    else:
        config.agents[agent_name].enabled = request.enabled

    # Ensure project directory exists
    if not config_path.parent.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    try:
        # Save updated config
        config_dict = config.model_dump(exclude_none=True)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)

        return {
            "message": f"Agent '{agent_name}' {'enabled' if request.enabled else 'disabled'} successfully",
            "agent": agent_name,
            "enabled": request.enabled
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating .agents.json: {str(e)}"
        )


@router.post("/projects/{project_id}/reset")
async def reset_agents_config(project_id: str) -> AgentsConfigResponse:
    """
    Reset agents configuration to defaults
    """
    config_path = get_agents_config_path(project_id)

    # Ensure project directory exists
    if not config_path.parent.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    try:
        default_config = get_default_config()
        config_dict = default_config.model_dump(exclude_none=True)

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)

        return AgentsConfigResponse(config=default_config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting .agents.json: {str(e)}"
        )


@router.post("/projects/{project_id}/custom", response_model=CreateCustomAgentResponse)
async def create_custom_agent(
    project_id: str,
    request: CreateCustomAgentRequest
) -> CreateCustomAgentResponse:
    """
    Create a new custom agent definition file
    Creates a Python file in custom_agents/ directory
    """
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id

    if not project_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    # Create custom_agents directory if not exists
    agents_dir = project_path / "custom_agents"
    agents_dir.mkdir(exist_ok=True)

    # Sanitize agent name for filename
    safe_name = request.name.lower().replace(" ", "_").replace("-", "_")
    file_name = f"{safe_name}_agent.py"
    file_path = agents_dir / file_name

    if file_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Agent file already exists: {file_name}"
        )

    # Generate agent template
    tools_str = ", ".join([f'"{t}"' for t in request.tools])
    template = f'''"""
Custom Agent: {request.name}
{request.description}

Category: {request.category}
Model: {request.model}
"""

# Agent Configuration
AGENT_CONFIG = {{
    "name": "{request.name}",
    "description": "{request.description}",
    "category": "{request.category}",
    "model": "{request.model}",
    "tools": [{tools_str}],
    "defaultEnabled": False,
}}

# System Prompt for this agent
SYSTEM_PROMPT = """
You are {request.name}, a specialized agent.

{request.description}

Follow best practices and provide high-quality assistance.
"""

# Optional: Custom tool definitions
CUSTOM_TOOLS = []

# Optional: Pre-processing function
def preprocess_message(message: str) -> str:
    """Preprocess user message before sending to agent"""
    return message

# Optional: Post-processing function
def postprocess_response(response: str) -> str:
    """Postprocess agent response before returning to user"""
    return response
'''

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(template)

        relative_path = f"custom_agents/{file_name}"

        return CreateCustomAgentResponse(
            message=f"Custom agent '{request.name}' created successfully",
            file_path=str(file_path),
            relative_path=relative_path
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating custom agent file: {str(e)}"
        )
