# PM Agent Context

## Current Session
- **Date**: 2025-12-29
- **Status**: MCP Tool Selection & Import Features completed
- **Active Project**: AGENTSDK (Web版Claude Code)

## Project State Summary
- Frontend renewal (Phase 1-7) completed
- Adopted design: Pattern 09 v2 (Linear Style - No Icons)
- **DB Config Management**: Backend API + Frontend UI both completed
- **Collapsible Editor Panel**: Implemented with vertical icon bar
- **Session name fix**: Fixed field mismatch (title → name)
- **Project search**: Implemented API-based search
- **Site Structure Renewal**: Implemented URL routing with Next.js App Router
- **Right Panel Optimization**: Shared layout prevents re-rendering on navigation
- **Project Settings & Pricing Tabs**: Completed
- **Project-Specific API Key**: Implemented
- **MCP Tool Selection**: Connection test + individual tool enable/disable
- **Import Features**: JSON/Markdown paste import for all config types

## Recent Session Updates

### MCP Server Tool Selection & Import Features (Completed - 2025-12-29)
Enhanced project config management with connection testing and import functionality.

**New Features:**

1. **MCP Server Connection Test & Tool Selection**
   - Connection test button to verify MCP server connectivity
   - Tool discovery via MCP Protocol (JSON-RPC 2.0 over stdio)
   - Individual tool enable/disable toggles
   - `enabled_tools` column added to database (null = all tools enabled)

2. **Import Features (Paste-based)**
   - **MCP Servers**: JSON paste import (supports Claude Desktop format, object, array)
   - **Sub-Agents**: Markdown with YAML frontmatter import
   - **Commands**: Markdown with YAML frontmatter import
   - **Skills**: Markdown with YAML frontmatter import

**Files Created:**
- `src/backend/app/services/mcp_service.py` - MCP Protocol implementation
- `src/backend/migrations/add_enabled_tools_column.sql` - DB migration

**Files Modified:**
- `src/backend/app/models/database.py` - Added enabled_tools column
- `src/backend/app/api/routes/project_config.py` - Added test/tools endpoints
- `src/frontend/src/types/projectConfig.ts` - Added MCPTool, MCPTestResponse types
- `src/frontend/src/lib/api/projectConfig.ts` - Added testMCPServer, getMCPTools
- `MCPSettingsEditor.tsx` - Connection test UI, tool toggles, JSON import modal
- `AgentSettingsEditor.tsx` - Markdown import modal
- `SkillsSettingsEditor.tsx` - Markdown import modal
- `CommandSettingsEditor.tsx` - Markdown import modal

**Import Format Examples:**

MCP Server (JSON - Claude Desktop format):
```json
{ "mcpServers": { "serverName": { "command": "npx", "args": [...] } } }
```

Agent/Skill/Command (Markdown with YAML frontmatter):
```markdown
---
name: example
description: Example description
category: general
---
Content here
```

### Project Config Management UI (Completed - 2025-12-29)
Frontend UI for managing MCP Servers, Agents, Skills, and Commands using database-based API.

**Files Created:**
- `src/frontend/src/types/projectConfig.ts` - TypeScript types
- `src/frontend/src/lib/api/projectConfig.ts` - API client for CRUD

**Features:**
- Full CRUD operations for MCP Servers, Agents, Skills, Commands
- Enable/disable toggle switches for each item
- Edit and delete modals with form validation
- Category grouping for Agents, Skills, Commands
- Dark theme (Linear style) consistent UI

### Previous Updates
- **Project Settings & Pricing Tabs**: Added api_key column to projects table
- **Project-Specific API Key**: Chat/Cron use project's api_key only

## Available Sub-Agents
- Explore: Codebase exploration
- Plan: Implementation planning
- frontend-developer: React/Next.js UI
- backend-developer: FastAPI/Python
- code-reviewer: Code review
- test-automator: Test automation
- technical-writer: Documentation

## Key Decisions
- Atomic Design component structure
- TailwindCSS with Linear theme
- Dark theme as default
- No icons, dot indicators
- Container-specific rebuilds only
- API-based search (not local filtering)
- URL-based routing with Next.js App Router
- DB-based project config management (not file-based)
- MCP Protocol (JSON-RPC 2.0 over stdio) for server testing

## Blockers
- None identified

## Next Actions
1. Export functionality for project configs (download as file)
2. Template-based project initialization
3. Bulk import with validation and preview
4. UI refinements based on user feedback
