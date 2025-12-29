# PM Agent Context

## Current Session
- **Date**: 2025-12-29
- **Status**: Project search feature implementation completed
- **Active Project**: AGENTSDK (Web版Claude Code)

## Project State Summary
- Frontend renewal (Phase 1-7) completed
- Adopted design: Pattern 09 v2 (Linear Style - No Icons)
- **DB Config Management**: Implemented (MCP/Agent/Skill/Command CRUD + SDK integration)
- **Collapsible Editor Panel**: Implemented with vertical icon bar
- **Session name fix**: Fixed field mismatch (title → name)
- **Project search**: Implemented API-based search

## Recent Session Updates

### Project Search Feature (Completed)
- Backend API: Added `search` query parameter to `/api/projects`
- ProjectManager: Search by project name, description, and related session names
- Frontend API client: Added `ListProjectsParams` interface
- Sidebar: Enter key to execute search
- ProjectList: Removed local filtering, uses API results directly

### Session Name Bug Fix (Completed)
- Root cause: Field name mismatch between frontend (`title`) and backend (`name`)
- Fixed: `Session.title` → `Session.name` across all frontend files
- Files updated: types/session.ts, SessionItem.tsx, WelcomePanel.tsx, Header.tsx, CreateSessionModal.tsx

### Sidebar Scroll Fix (Completed)
- Fixed header area (label + new project button + search input) does not scroll
- Only project list scrolls
- SearchInput component created in molecules/

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
- Enter key to execute search

## Blockers
- None identified

## Next Actions
1. Frontend UI for managing MCP/Agent/Skill/Command
2. Import/Export functionality for project configs
3. Template-based project initialization

## Recent Completions
- DB Config Management: Database models, CRUD APIs, SDK integration
- Collapsible Editor Panel with vertical icon bar
- Session name bug fix (title → name)
- Project search feature (API-based with session name search)
- Sidebar scroll fix with SearchInput component
