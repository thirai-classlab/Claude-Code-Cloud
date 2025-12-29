# PM Agent Context

## Current Session
- **Date**: 2025-12-29
- **Status**: Site structure renewal + Right panel optimization completed
- **Active Project**: AGENTSDK (Web版Claude Code)

## Project State Summary
- Frontend renewal (Phase 1-7) completed
- Adopted design: Pattern 09 v2 (Linear Style - No Icons)
- **DB Config Management**: Implemented (MCP/Agent/Skill/Command CRUD + SDK integration)
- **Collapsible Editor Panel**: Implemented with vertical icon bar
- **Session name fix**: Fixed field mismatch (title → name)
- **Project search**: Implemented API-based search
- **Site Structure Renewal**: Implemented URL routing with Next.js App Router
- **Right Panel Optimization**: Shared layout prevents re-rendering on navigation

## Recent Session Updates

### Right Panel Optimization (Completed)
Prevented right sidebar (VSCode) re-rendering when navigating between project top and session detail pages.

**Solution**: Created shared layout at `/projects/[id]/layout.tsx`

| File | Change |
|------|--------|
| `app/projects/[id]/layout.tsx` | **NEW** - Shared layout with EditorContainer |
| `app/projects/[id]/page.tsx` | Simplified (layout handles AuthGuard/BaseLayout) |
| `app/projects/[id]/sessions/[sessionId]/page.tsx` | Simplified |
| `components/pages/ProjectPage.tsx` | Removed SplitLayout wrapper |
| `components/pages/SessionPage.tsx` | Removed SplitLayout wrapper |

**Technical Pattern**: Next.js App Router layouts persist across child route navigation.

### Site Structure Renewal (Completed)
New URL-based routing implemented:

| Page | URL | Content | Layout |
|------|-----|---------|--------|
| Home | `/` | Project list (card grid) | Sidebar + Main |
| Project Top | `/projects/:id` | Project info + Session list | Sidebar + Main + Right Panel (VSCode) |
| Session Detail | `/projects/:id/sessions/:sid` | Chat | Sidebar + Main + Right Panel (VSCode) |

#### Key Files Created
- `hooks/useRouteSync.ts` - URL sync hook
- `components/layout/BaseLayout.tsx` - Base layout (Sidebar + Main)
- `components/layout/SplitLayout.tsx` - Split layout (Main + Right Panel)
- `components/project/ProjectListNav.tsx` - Routing-aware project list
- `components/project/ProjectCardNav.tsx` - Routing-aware project card
- `components/session/SessionListNav.tsx` - Routing-aware session list
- `components/session/SessionItemNav.tsx` - Routing-aware session item
- `components/pages/HomePage.tsx` - Home page (project grid)
- `components/pages/ProjectPage.tsx` - Project top page
- `components/pages/SessionPage.tsx` - Session detail page (chat)
- `app/projects/[id]/layout.tsx` - Project layout (shared right panel)
- `app/projects/[id]/page.tsx` - Project route
- `app/projects/[id]/sessions/[sessionId]/page.tsx` - Session route

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
- useRouteSync hook for URL ↔ Store sync
- Shared layout for right panel persistence

## Blockers
- None identified

## Next Actions
1. Frontend UI for managing MCP/Agent/Skill/Command
2. Import/Export functionality for project configs
3. Template-based project initialization
4. UI refinements based on user feedback
