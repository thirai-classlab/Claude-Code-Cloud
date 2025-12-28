"""
Skills Settings API Routes
Handles reading and writing .skills.json configuration files
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/skills", tags=["skills"])


# Available skill definitions
AVAILABLE_SKILLS: List[Dict[str, Any]] = [
    # Core Skills
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


class SkillConfig(BaseModel):
    """Configuration for a single skill"""
    enabled: bool = True
    description: Optional[str] = None
    category: str = "core"
    settings: Dict[str, Any] = {}


class SkillsConfig(BaseModel):
    """Full skills configuration"""
    skills: Dict[str, SkillConfig] = {}
    defaultEnabled: List[str] = []
    version: str = "1.0"


class SkillsConfigResponse(BaseModel):
    """Response containing skills configuration"""
    config: SkillsConfig
    path: str


class UpdateSkillsConfigRequest(BaseModel):
    """Request to update skills configuration"""
    config: SkillsConfig


class ToggleSkillRequest(BaseModel):
    """Request to toggle a single skill"""
    enabled: bool


class SkillDefinition(BaseModel):
    """Skill definition for frontend"""
    name: str
    description: str
    category: str
    defaultEnabled: bool


class CreateCustomSkillRequest(BaseModel):
    """Request to create a custom skill file"""
    name: str
    description: str
    category: str = "development"


class CreateCustomSkillResponse(BaseModel):
    """Response after creating a custom skill file"""
    message: str
    file_path: str
    relative_path: str


def get_skills_config_path(project_id: str) -> Path:
    """Get the path to the .skills.json file for a project"""
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id
    return project_path / ".skills.json"


def get_empty_config() -> SkillsConfig:
    """Get empty skills configuration (no global defaults)"""
    return SkillsConfig(
        skills={},
        defaultEnabled=[],
        version="1.0"
    )


def get_default_config() -> SkillsConfig:
    """Get default skills configuration with all skills enabled by default"""
    skills: Dict[str, SkillConfig] = {}
    default_enabled: List[str] = []

    for skill in AVAILABLE_SKILLS:
        skills[skill["name"]] = SkillConfig(
            enabled=skill["defaultEnabled"],
            description=skill["description"],
            category=skill["category"],
            settings={}
        )
        if skill["defaultEnabled"]:
            default_enabled.append(skill["name"])

    return SkillsConfig(
        skills=skills,
        defaultEnabled=default_enabled,
        version="1.0"
    )


@router.get("/available", response_model=List[SkillDefinition])
async def get_available_skills() -> List[SkillDefinition]:
    """
    Get list of all available skills
    """
    return [SkillDefinition(**skill) for skill in AVAILABLE_SKILLS]


@router.get("/projects/{project_id}/config", response_model=SkillsConfigResponse)
async def get_skills_config(project_id: str) -> SkillsConfigResponse:
    """
    Get skills configuration for a project
    Returns empty config if .skills.json doesn't exist (no global defaults)
    """
    config_path = get_skills_config_path(project_id)

    if not config_path.exists():
        # Return empty config if file doesn't exist (no global defaults)
        return SkillsConfigResponse(
            config=get_empty_config(),
            path=str(config_path)
        )

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        config = SkillsConfig(**data)
        return SkillsConfigResponse(config=config, path=str(config_path))
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON in .skills.json: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading .skills.json: {str(e)}"
        )


@router.put("/projects/{project_id}/config", response_model=SkillsConfigResponse)
async def update_skills_config(
    project_id: str,
    request: UpdateSkillsConfigRequest
) -> SkillsConfigResponse:
    """
    Update skills configuration for a project
    Creates .skills.json if it doesn't exist
    """
    config_path = get_skills_config_path(project_id)

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

        return SkillsConfigResponse(config=request.config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error writing .skills.json: {str(e)}"
        )


@router.patch("/projects/{project_id}/skills/{skill_name:path}")
async def toggle_skill(
    project_id: str,
    skill_name: str,
    request: ToggleSkillRequest
) -> Dict[str, Any]:
    """
    Toggle a specific skill's enabled status
    """
    config_path = get_skills_config_path(project_id)

    # Get current config or empty (no global defaults)
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            config = SkillsConfig(**data)
        except Exception:
            config = get_empty_config()
    else:
        config = get_empty_config()

    # Check if skill exists
    valid_skill_names = [s["name"] for s in AVAILABLE_SKILLS]
    if skill_name not in valid_skill_names:
        raise HTTPException(
            status_code=404,
            detail=f"Skill '{skill_name}' not found"
        )

    # Update skill config
    if skill_name not in config.skills:
        # Find skill definition
        skill_def = next((s for s in AVAILABLE_SKILLS if s["name"] == skill_name), None)
        if skill_def:
            config.skills[skill_name] = SkillConfig(
                enabled=request.enabled,
                description=skill_def["description"],
                category=skill_def["category"],
                settings={}
            )
    else:
        config.skills[skill_name].enabled = request.enabled

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
            "message": f"Skill '{skill_name}' {'enabled' if request.enabled else 'disabled'} successfully",
            "skill": skill_name,
            "enabled": request.enabled
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating .skills.json: {str(e)}"
        )


@router.post("/projects/{project_id}/reset")
async def reset_skills_config(project_id: str) -> SkillsConfigResponse:
    """
    Reset skills configuration to defaults
    """
    config_path = get_skills_config_path(project_id)

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

        return SkillsConfigResponse(config=default_config, path=str(config_path))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting .skills.json: {str(e)}"
        )


@router.post("/projects/{project_id}/custom", response_model=CreateCustomSkillResponse)
async def create_custom_skill(
    project_id: str,
    request: CreateCustomSkillRequest
) -> CreateCustomSkillResponse:
    """
    Create a new custom skill definition file
    Creates a Markdown file in custom_skills/ directory
    """
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id

    if not project_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    # Create custom_skills directory if not exists
    skills_dir = project_path / "custom_skills"
    skills_dir.mkdir(exist_ok=True)

    # Sanitize skill name for filename
    safe_name = request.name.lower().replace(" ", "_").replace("-", "_").replace(":", "_")
    file_name = f"{safe_name}.md"
    file_path = skills_dir / file_name

    if file_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Skill file already exists: {file_name}"
        )

    # Generate skill template
    template = f'''# {request.name}

{request.description}

## Category
{request.category}

## Trigger
Describe when this skill should be activated.

## Instructions
Detailed instructions for the AI agent when this skill is invoked.

## Examples
```
Example usage of this skill
```

## Related Skills
- List related skills here

## Implementation Notes
Add any implementation-specific notes here.
'''

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(template)

        relative_path = f"custom_skills/{file_name}"

        return CreateCustomSkillResponse(
            message=f"Custom skill '{request.name}' created successfully",
            file_path=str(file_path),
            relative_path=relative_path
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating custom skill file: {str(e)}"
        )
