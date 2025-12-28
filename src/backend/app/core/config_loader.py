"""
Configuration Loader for MCP, Agents, Skills, and Commands

Reads project-specific configuration files and provides them to the chat handler.
"""
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class MCPServerConfig:
    """MCP Server configuration"""
    name: str
    command: str
    args: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)
    enabled: bool = True


@dataclass
class AgentConfig:
    """Agent configuration from .agents/ directory or custom_agents/"""
    name: str
    description: str
    category: str = "custom"
    model: str = "sonnet"
    tools: List[str] = field(default_factory=list)
    system_prompt: str = ""
    enabled: bool = True


@dataclass
class SkillConfig:
    """Skill configuration"""
    name: str
    description: str
    category: str = "custom"
    enabled: bool = True


@dataclass
class CommandConfig:
    """Command configuration"""
    name: str
    description: str
    category: str = "custom"
    enabled: bool = True


@dataclass
class ProjectConfig:
    """Complete project configuration"""
    mcp_servers: Dict[str, MCPServerConfig] = field(default_factory=dict)
    agents: Dict[str, AgentConfig] = field(default_factory=dict)
    skills: Dict[str, SkillConfig] = field(default_factory=dict)
    commands: Dict[str, CommandConfig] = field(default_factory=dict)


def load_mcp_config(workspace_path: str) -> Dict[str, MCPServerConfig]:
    """
    Load MCP server configurations from .mcp.json

    Args:
        workspace_path: Path to the project workspace

    Returns:
        Dictionary of MCP server configurations
    """
    mcp_servers: Dict[str, MCPServerConfig] = {}
    mcp_path = Path(workspace_path) / ".mcp.json"

    if not mcp_path.exists():
        logger.debug("No .mcp.json found", path=str(mcp_path))
        return mcp_servers

    try:
        with open(mcp_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        servers_data = data.get("mcpServers", {})
        for name, config in servers_data.items():
            mcp_servers[name] = MCPServerConfig(
                name=name,
                command=config.get("command", ""),
                args=config.get("args", []),
                env=config.get("env", {}),
                enabled=config.get("enabled", True),
            )

        logger.info("Loaded MCP servers", count=len(mcp_servers), servers=list(mcp_servers.keys()))

    except json.JSONDecodeError as e:
        logger.error("Invalid JSON in .mcp.json", error=str(e))
    except Exception as e:
        logger.error("Error loading .mcp.json", error=str(e))

    return mcp_servers


def parse_agent_md(file_path: Path) -> Optional[AgentConfig]:
    """
    Parse an agent definition from a Markdown file

    Expected format:
    # Agent Name
    Description text

    ## Category
    category_name

    ## Model
    sonnet/opus/haiku

    ## Tools
    - Read
    - Write
    ...

    ## System Prompt
    Your system prompt text...
    """
    try:
        content = file_path.read_text(encoding="utf-8")

        # Extract agent name from first heading
        name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        name = name_match.group(1).strip() if name_match else file_path.stem

        # Extract description (first paragraph after main heading, before any ## section)
        desc_match = re.search(r'^#\s+[^\n]+\n\n([^#]+?)(?=\n\n##|\n##|\Z)', content, re.MULTILINE)
        description = desc_match.group(1).strip() if desc_match else ""
        # Take only the first line/paragraph of description
        if description:
            description = description.split('\n\n')[0].strip()

        # Extract category (single line after ## Category)
        cat_match = re.search(r'^##\s+Category\s*\n+([^\n#]+)', content, re.MULTILINE)
        category = cat_match.group(1).strip().lower() if cat_match else "custom"

        # Extract model (single line after ## Model)
        model_match = re.search(r'^##\s+Model\s*\n+([^\n#]+)', content, re.MULTILINE)
        model = model_match.group(1).strip().lower() if model_match else "sonnet"

        # Extract tools (list items after ## Tools)
        tools: List[str] = []
        tools_match = re.search(r'^##\s+Tools\s*\n((?:[-*]\s*[^\n]+\n?)+)', content, re.MULTILINE)
        if tools_match:
            tools_text = tools_match.group(1)
            tools = [t.strip().lstrip('-*').strip() for t in tools_text.split('\n') if t.strip() and t.strip()[0] in '-*']

        # Extract system prompt (everything after ## System Prompt until next ## or end)
        prompt_match = re.search(r'^##\s+System\s+Prompt\s*\n(.+?)(?=\n##|\Z)', content, re.MULTILINE | re.DOTALL)
        system_prompt = prompt_match.group(1).strip() if prompt_match else ""

        return AgentConfig(
            name=name,
            description=description,
            category=category,
            model=model,
            tools=tools if tools else ["Read", "Write", "Edit", "Bash"],
            system_prompt=system_prompt,
            enabled=True,
        )

    except Exception as e:
        logger.error("Error parsing agent MD file", file=str(file_path), error=str(e))
        return None


def parse_agent_py(file_path: Path) -> Optional[AgentConfig]:
    """
    Parse an agent definition from a Python file (custom_agents/)

    Looks for AGENT_CONFIG dict and SYSTEM_PROMPT string
    """
    try:
        content = file_path.read_text(encoding="utf-8")

        # Extract AGENT_CONFIG dict using regex
        config_match = re.search(
            r'AGENT_CONFIG\s*=\s*\{([^}]+)\}',
            content,
            re.DOTALL
        )

        if not config_match:
            return None

        config_text = config_match.group(1)

        # Parse individual fields
        def extract_str(key: str) -> str:
            match = re.search(rf'"{key}"\s*:\s*"([^"]*)"', config_text)
            return match.group(1) if match else ""

        def extract_list(key: str) -> List[str]:
            match = re.search(rf'"{key}"\s*:\s*\[([^\]]*)\]', config_text)
            if match:
                items = re.findall(r'"([^"]*)"', match.group(1))
                return items
            return []

        name = extract_str("name")
        if not name:
            name = file_path.stem.replace("_agent", "").replace("_", " ").title()

        # Extract SYSTEM_PROMPT
        prompt_match = re.search(
            r'SYSTEM_PROMPT\s*=\s*"""(.+?)"""',
            content,
            re.DOTALL
        )
        system_prompt = prompt_match.group(1).strip() if prompt_match else ""

        return AgentConfig(
            name=name,
            description=extract_str("description"),
            category=extract_str("category") or "custom",
            model=extract_str("model") or "sonnet",
            tools=extract_list("tools") or ["Read", "Write", "Edit", "Bash"],
            system_prompt=system_prompt,
            enabled=True,
        )

    except Exception as e:
        logger.error("Error parsing agent Python file", file=str(file_path), error=str(e))
        return None


def load_agents_config(workspace_path: str) -> Dict[str, AgentConfig]:
    """
    Load agent configurations from .agents/ and custom_agents/ directories

    Args:
        workspace_path: Path to the project workspace

    Returns:
        Dictionary of agent configurations
    """
    agents: Dict[str, AgentConfig] = {}
    workspace = Path(workspace_path)

    # Load from .agents/ directory (Markdown files)
    agents_dir = workspace / ".agents"
    if agents_dir.exists() and agents_dir.is_dir():
        for md_file in agents_dir.glob("*.md"):
            agent = parse_agent_md(md_file)
            if agent:
                agents[agent.name] = agent
                logger.debug("Loaded agent from MD", name=agent.name, file=str(md_file))

    # Load from custom_agents/ directory (Python files)
    custom_agents_dir = workspace / "custom_agents"
    if custom_agents_dir.exists() and custom_agents_dir.is_dir():
        for py_file in custom_agents_dir.glob("*_agent.py"):
            agent = parse_agent_py(py_file)
            if agent:
                agents[agent.name] = agent
                logger.debug("Loaded agent from Python", name=agent.name, file=str(py_file))

    # Also check .agents.json for enabled/disabled status
    agents_json_path = workspace / ".agents.json"
    if agents_json_path.exists():
        try:
            with open(agents_json_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)

            agents_config = config_data.get("agents", {})
            for name, config in agents_config.items():
                if name in agents:
                    agents[name].enabled = config.get("enabled", True)

        except Exception as e:
            logger.error("Error loading .agents.json", error=str(e))

    logger.info("Loaded agents", count=len(agents), agents=list(agents.keys()))
    return agents


def load_skills_config(workspace_path: str) -> Dict[str, SkillConfig]:
    """
    Load skill configurations from .skills.json and custom_skills/

    Args:
        workspace_path: Path to the project workspace

    Returns:
        Dictionary of skill configurations
    """
    skills: Dict[str, SkillConfig] = {}
    workspace = Path(workspace_path)

    # Load from .skills.json
    skills_json_path = workspace / ".skills.json"
    if skills_json_path.exists():
        try:
            with open(skills_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            skills_data = data.get("skills", {})
            for name, config in skills_data.items():
                skills[name] = SkillConfig(
                    name=name,
                    description=config.get("description", ""),
                    category=config.get("category", "custom"),
                    enabled=config.get("enabled", True),
                )

        except Exception as e:
            logger.error("Error loading .skills.json", error=str(e))

    # Load from custom_skills/ directory (Markdown files)
    custom_skills_dir = workspace / "custom_skills"
    if custom_skills_dir.exists() and custom_skills_dir.is_dir():
        for md_file in custom_skills_dir.glob("*.md"):
            try:
                content = md_file.read_text(encoding="utf-8")

                # Extract name from first heading
                name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                name = name_match.group(1).strip() if name_match else md_file.stem

                # Extract description (first paragraph after main heading)
                desc_match = re.search(r'^#\s+[^\n]+\n\n([^#]+?)(?=\n\n##|\n##|\Z)', content, re.MULTILINE)
                description = desc_match.group(1).strip() if desc_match else ""
                if description:
                    description = description.split('\n\n')[0].strip()

                # Extract category (single line after ## Category)
                cat_match = re.search(r'^##\s+Category\s*\n+([^\n#]+)', content, re.MULTILINE)
                category = cat_match.group(1).strip().lower() if cat_match else "custom"

                skill_name = f"sc:{md_file.stem}"
                skills[skill_name] = SkillConfig(
                    name=skill_name,
                    description=description,
                    category=category,
                    enabled=True,
                )

            except Exception as e:
                logger.error("Error parsing skill MD file", file=str(md_file), error=str(e))

    logger.info("Loaded skills", count=len(skills), skills=list(skills.keys()))
    return skills


def load_commands_config(workspace_path: str) -> Dict[str, CommandConfig]:
    """
    Load command configurations from .commands.json and custom_commands/

    Args:
        workspace_path: Path to the project workspace

    Returns:
        Dictionary of command configurations
    """
    commands: Dict[str, CommandConfig] = {}
    workspace = Path(workspace_path)

    # Load from .commands.json
    commands_json_path = workspace / ".commands.json"
    if commands_json_path.exists():
        try:
            with open(commands_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            commands_data = data.get("commands", {})
            for name, config in commands_data.items():
                commands[name] = CommandConfig(
                    name=name,
                    description=config.get("description", ""),
                    category=config.get("category", "custom"),
                    enabled=config.get("enabled", True),
                )

        except Exception as e:
            logger.error("Error loading .commands.json", error=str(e))

    # Load from custom_commands/ directory (Markdown files)
    custom_commands_dir = workspace / "custom_commands"
    if custom_commands_dir.exists() and custom_commands_dir.is_dir():
        for md_file in custom_commands_dir.glob("*.md"):
            try:
                content = md_file.read_text(encoding="utf-8")

                # Extract name from first heading
                name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                name = name_match.group(1).strip() if name_match else md_file.stem

                # Extract description (first paragraph after main heading)
                desc_match = re.search(r'^#\s+[^\n]+\n\n([^#]+?)(?=\n\n##|\n##|\Z)', content, re.MULTILINE)
                description = desc_match.group(1).strip() if desc_match else ""
                if description:
                    description = description.split('\n\n')[0].strip()

                # Extract category (single line after ## Category)
                cat_match = re.search(r'^##\s+Category\s*\n+([^\n#]+)', content, re.MULTILINE)
                category = cat_match.group(1).strip().lower() if cat_match else "custom"

                commands[md_file.stem] = CommandConfig(
                    name=md_file.stem,
                    description=description,
                    category=category,
                    enabled=True,
                )

            except Exception as e:
                logger.error("Error parsing command MD file", file=str(md_file), error=str(e))

    logger.info("Loaded commands", count=len(commands), commands=list(commands.keys()))
    return commands


def load_project_config(workspace_path: str) -> ProjectConfig:
    """
    Load complete project configuration

    Args:
        workspace_path: Path to the project workspace

    Returns:
        Complete project configuration
    """
    return ProjectConfig(
        mcp_servers=load_mcp_config(workspace_path),
        agents=load_agents_config(workspace_path),
        skills=load_skills_config(workspace_path),
        commands=load_commands_config(workspace_path),
    )


def generate_enhanced_system_prompt(
    workspace_path: str,
    config: ProjectConfig,
) -> str:
    """
    Generate enhanced system prompt including MCP servers, agents, skills, and commands

    Args:
        workspace_path: Path to the project workspace
        config: Project configuration

    Returns:
        Enhanced system prompt
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
        for name, server in config.mcp_servers.items():
            if server.enabled:
                mcp_section += f"- {name}: MCP server (command: {server.command})\n"
        prompt_parts.append(mcp_section)

    # Add agents section
    if config.agents:
        agents_section = "\n## Available Agents\nYou can delegate tasks to the following specialized agents using the Task tool:\n"
        for name, agent in config.agents.items():
            if agent.enabled:
                agents_section += f"- {name}: {agent.description} (model: {agent.model})\n"
        prompt_parts.append(agents_section)

    # Add skills section
    enabled_skills = {k: v for k, v in config.skills.items() if v.enabled}
    if enabled_skills:
        skills_section = "\n## Available Skills\nYou can invoke the following skills:\n"
        for name, skill in enabled_skills.items():
            skills_section += f"- {name}: {skill.description}\n"
        prompt_parts.append(skills_section)

    # Add commands section
    enabled_commands = {k: v for k, v in config.commands.items() if v.enabled}
    if enabled_commands:
        commands_section = "\n## Available Commands\nYou can execute the following commands:\n"
        for name, cmd in enabled_commands.items():
            commands_section += f"- /{name}: {cmd.description}\n"
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


def get_enabled_tools(config: ProjectConfig) -> List[str]:
    """
    Get list of all enabled tools including MCP servers and agent names

    Args:
        config: Project configuration

    Returns:
        List of tool names
    """
    tools = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]

    # Add enabled MCP servers
    for name, server in config.mcp_servers.items():
        if server.enabled:
            tools.append(f"mcp__{name}")

    # Add enabled agents (as Task tool targets)
    for name, agent in config.agents.items():
        if agent.enabled:
            tools.append(f"agent__{name}")

    return tools
