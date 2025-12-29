# PM Agent Context

## Current Session
- **Date**: 2025-12-29
- **Status**: Frontend collapsible panel + documentation updates completed
- **Active Project**: AGENTSDK (Web版Claude Code)

## Project State Summary
- Frontend renewal (Phase 1-7) completed
- Adopted design: Pattern 09 v2 (Linear Style - No Icons)
- **DB Config Management**: Implemented (MCP/Agent/Skill/Command CRUD + SDK integration)
- **Collapsible Editor Panel**: Implemented with vertical icon bar
- Container rebuild rules documented

## Recent Session Updates

### Collapsible Editor Panel (Completed)
- EditorContainer.tsx: Added EDITOR_TABS config, collapsed/expanded views
- uiStore.ts: Added isEditorPanelOpen, activeEditorTab state management
- MainLayout.tsx: Chat panel expands when editor is collapsed
- tailwind.config.ts: Added slideInRight/slideOutRight animations
- Modal.tsx: Fixed z-index (z-[100]) to overlay above VSCode iframe
- Sidebar.tsx: Removed duplicate "Claude Code" header, fixed double scroll
- ProjectList.tsx: Fixed overflow handling for single scroll

### Container Rebuild Rules (Documented)
- CLAUDE.md: Added rebuild rules section
- doc/docker-design.md: Added section 8.4 with Mermaid visualization
- Rule: Only rebuild changed containers, never full rebuild

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

## Blockers
- None identified

## Next Actions
1. Frontend UI for managing MCP/Agent/Skill/Command
2. Import/Export functionality for project configs
3. Template-based project initialization

## Recent Completions
- DB Config Management: Database models, CRUD APIs, SDK integration
- Collapsible Editor Panel with vertical icon bar
- Animation direction fix (right-to-left slide)
- Modal z-index fix
- Sidebar cleanup (removed duplicate header, fixed scroll)
- Container rebuild rules documentation
