"""
Commands Settings API Routes
Handles reading and writing .commands.json configuration files
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/commands", tags=["commands"])


# Available command definitions
AVAILABLE_COMMANDS: List[Dict[str, Any]] = [
    # Core Commands
    {"name": "sc:pm", "description": "Project Manager - orchestrates sub-agents and manages workflows", "category": "core", "defaultEnabled": True},
    {"name": "sc:task", "description": "Execute complex tasks with intelligent workflow management", "category": "core", "defaultEnabled": True},
    {"name": "sc:spawn", "description": "Meta-system task orchestration with intelligent breakdown", "category": "core", "defaultEnabled": True},

    # Planning & Design
    {"name": "sc:brainstorm", "description": "Interactive requirements discovery through Socratic dialogue", "category": "planning", "defaultEnabled": True},
    {"name": "sc:design", "description": "Design system architecture, APIs, and component interfaces", "category": "planning", "defaultEnabled": True},
    {"name": "sc:workflow", "description": "Generate structured implementation workflows from PRDs", "category": "planning", "defaultEnabled": True},
    {"name": "sc:estimate", "description": "Provide development estimates for tasks and features", "category": "planning", "defaultEnabled": False},

    # Development
    {"name": "sc:implement", "description": "Feature and code implementation with intelligent persona activation", "category": "development", "defaultEnabled": True},
    {"name": "sc:build", "description": "Build, compile, and package projects with error handling", "category": "development", "defaultEnabled": True},
    {"name": "sc:test", "description": "Execute tests with coverage analysis and quality reporting", "category": "development", "defaultEnabled": True},
    {"name": "sc:cleanup", "description": "Systematically clean up code and optimize project structure", "category": "development", "defaultEnabled": False},
    {"name": "sc:improve", "description": "Apply systematic improvements to code quality", "category": "development", "defaultEnabled": False},

    # Analysis & Research
    {"name": "sc:analyze", "description": "Comprehensive code analysis across quality, security, performance", "category": "analysis", "defaultEnabled": True},
    {"name": "sc:research", "description": "Deep web research with adaptive planning", "category": "analysis", "defaultEnabled": True},
    {"name": "sc:explain", "description": "Provide clear explanations of code and concepts", "category": "analysis", "defaultEnabled": True},
    {"name": "sc:troubleshoot", "description": "Diagnose and resolve issues in code, builds, deployments", "category": "analysis", "defaultEnabled": True},

    # Documentation & Indexing
    {"name": "sc:document", "description": "Generate focused documentation for components and APIs", "category": "documentation", "defaultEnabled": True},
    {"name": "sc:index", "description": "Generate comprehensive project documentation and knowledge base", "category": "documentation", "defaultEnabled": False},
    {"name": "sc:index-repo", "description": "Repository indexing with 94% token reduction", "category": "documentation", "defaultEnabled": False},

    # Git & Version Control
    {"name": "sc:git", "description": "Git operations with intelligent commit messages", "category": "git", "defaultEnabled": True},

    # Session Management
    {"name": "sc:save", "description": "Session lifecycle management - save context", "category": "session", "defaultEnabled": True},
    {"name": "sc:load", "description": "Session lifecycle management - load context", "category": "session", "defaultEnabled": True},
    {"name": "sc:reflect", "description": "Task reflection and validation using analysis", "category": "session", "defaultEnabled": False},

    # Specialized
    {"name": "sc:agent", "description": "Agent management and configuration", "category": "specialized", "defaultEnabled": False},
    {"name": "sc:select-tool", "description": "Intelligent MCP tool selection based on complexity", "category": "specialized", "defaultEnabled": False},
    {"name": "sc:recommend", "description": "Ultra-intelligent command recommendation engine", "category": "specialized", "defaultEnabled": False},
    {"name": "sc:spec-panel", "description": "Multi-expert specification review and improvement", "category": "specialized", "defaultEnabled": False},
    {"name": "sc:business-panel", "description": "Business Panel Analysis System", "category": "specialized", "defaultEnabled": False},

    # Help
    {"name": "sc:help", "description": "List all available /sc commands", "category": "help", "defaultEnabled": True},
    {"name": "sc:README", "description": "SuperClaude Commands documentation", "category": "help", "defaultEnabled": True},
]


class CommandConfig(BaseModel):
    """Configuration for a single command"""
    enabled: bool = True
    description: Optional[str] = None
    category: str = "core"
    settings: Dict[str, Any] = {}


class CommandsConfig(BaseModel):
    """Full commands configuration"""
    commands: Dict[str, CommandConfig] = {}
    defaultEnabled: List[str] = []
    version: str = "1.0"


class CommandsConfigResponse(BaseModel):
    """Response containing commands configuration"""
    config: CommandsConfig
    path: str


class UpdateCommandsConfigRequest(BaseModel):
    """Request to update commands configuration"""
    config: CommandsConfig


class ToggleCommandRequest(BaseModel):
    """Request to toggle a single command"""
    enabled: bool


class CommandDefinition(BaseModel):
    """Command definition for frontend"""
    name: str
    description: str
    category: str
    defaultEnabled: bool


class CreateCustomCommandRequest(BaseModel):
    """Request to create a custom command file"""
    name: str
    description: str
    category: str = "development"


class CreateCustomCommandResponse(BaseModel):
    """Response after creating a custom command file"""
    message: str
    file_path: str
    relative_path: str


def get_commands_config_path(project_id: str) -> Path:
    """Get the path to the .commands.json file for a project"""
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id
    return project_path / ".commands.json"


def get_empty_config() -> CommandsConfig:
    """Get empty commands configuration (no global defaults)"""
    return CommandsConfig(
        commands={},
        defaultEnabled=[],
        version="1.0"
    )


def get_default_config() -> CommandsConfig:
    """Get default commands configuration with all commands enabled by default"""
    commands: Dict[str, CommandConfig] = {}
    default_enabled: List[str] = []

    for cmd in AVAILABLE_COMMANDS:
        commands[cmd["name"]] = CommandConfig(
            enabled=cmd["defaultEnabled"],
            description=cmd["description"],
            category=cmd["category"],
            settings={}
        )
        if cmd["defaultEnabled"]:
            default_enabled.append(cmd["name"])

    return CommandsConfig(
        commands=commands,
        defaultEnabled=default_enabled,
        version="1.0"
    )


@router.get("/available", response_model=List[CommandDefinition])
async def get_available_commands() -> List[CommandDefinition]:
    """
    Get list of all available commands
    """
    return [CommandDefinition(**cmd) for cmd in AVAILABLE_COMMANDS]


@router.get("/projects/{project_id}/config", response_model=CommandsConfigResponse)
async def get_commands_config(project_id: str) -> CommandsConfigResponse:
    """
    Get commands configuration for a project
    Returns empty config if .commands.json doesn't exist (no global defaults)
    """
    config_path = get_commands_config_path(project_id)

    if not config_path.exists():
        # Return empty config if file doesn't exist (no global defaults)
        return CommandsConfigResponse(
            config=get_empty_config(),
            path=str(config_path)
        )

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        config = CommandsConfig(**data)
        return CommandsConfigResponse(config=config, path=str(config_path))
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON in .commands.json: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading .commands.json: {str(e)}"
        )


@router.put("/projects/{project_id}/config", response_model=CommandsConfigResponse)
async def update_commands_config(
    project_id: str,
    request: UpdateCommandsConfigRequest
) -> CommandsConfigResponse:
    """
    Update commands configuration for a project
    Creates .commands.json if it doesn't exist
    """
    config_path = get_commands_config_path(project_id)

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

        return CommandsConfigResponse(config=request.config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error writing .commands.json: {str(e)}"
        )


@router.patch("/projects/{project_id}/commands/{command_name:path}")
async def toggle_command(
    project_id: str,
    command_name: str,
    request: ToggleCommandRequest
) -> Dict[str, Any]:
    """
    Toggle a specific command's enabled status
    """
    config_path = get_commands_config_path(project_id)

    # Get current config or empty (no global defaults)
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            config = CommandsConfig(**data)
        except Exception:
            config = get_empty_config()
    else:
        config = get_empty_config()

    # Check if command exists
    valid_command_names = [c["name"] for c in AVAILABLE_COMMANDS]
    if command_name not in valid_command_names:
        raise HTTPException(
            status_code=404,
            detail=f"Command '{command_name}' not found"
        )

    # Update command config
    if command_name not in config.commands:
        # Find command definition
        cmd_def = next((c for c in AVAILABLE_COMMANDS if c["name"] == command_name), None)
        if cmd_def:
            config.commands[command_name] = CommandConfig(
                enabled=request.enabled,
                description=cmd_def["description"],
                category=cmd_def["category"],
                settings={}
            )
    else:
        config.commands[command_name].enabled = request.enabled

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
            "message": f"Command '{command_name}' {'enabled' if request.enabled else 'disabled'} successfully",
            "command": command_name,
            "enabled": request.enabled
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating .commands.json: {str(e)}"
        )


@router.post("/projects/{project_id}/reset")
async def reset_commands_config(project_id: str) -> CommandsConfigResponse:
    """
    Reset commands configuration to defaults
    """
    config_path = get_commands_config_path(project_id)

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

        return CommandsConfigResponse(config=default_config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting .commands.json: {str(e)}"
        )


@router.post("/projects/{project_id}/custom", response_model=CreateCustomCommandResponse)
async def create_custom_command(
    project_id: str,
    request: CreateCustomCommandRequest
) -> CreateCustomCommandResponse:
    """
    Create a new custom command definition file
    Creates a Markdown file in custom_commands/ directory
    """
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id

    if not project_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    # Create custom_commands directory if not exists
    commands_dir = project_path / "custom_commands"
    commands_dir.mkdir(exist_ok=True)

    # Sanitize command name for filename
    safe_name = request.name.lower().replace(" ", "_").replace("-", "_").replace(":", "_")
    file_name = f"{safe_name}.md"
    file_path = commands_dir / file_name

    if file_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Command file already exists: {file_name}"
        )

    # Generate command template
    template = f'''# {request.name}

{request.description}

## Category
{request.category}

## Usage
```
/{request.name} [arguments]
```

## Description
Detailed description of what this command does.

## Arguments
- `arg1`: Description of first argument
- `arg2`: Description of second argument (optional)

## Examples
```
/{request.name} example usage
```

## Implementation Notes
Add implementation details here.
'''

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(template)

        relative_path = f"custom_commands/{file_name}"

        return CreateCustomCommandResponse(
            message=f"Custom command '{request.name}' created successfully",
            file_path=str(file_path),
            relative_path=relative_path
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating custom command file: {str(e)}"
        )
