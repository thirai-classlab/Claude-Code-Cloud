# Session: Project Search Feature Implementation

## Date: 2025-12-29

## Summary
Implemented API-based project search functionality with Enter key trigger.

## Changes Made

### Backend
1. **project_manager.py**
   - Added `search` parameter to `list_projects()`
   - Search logic: project name, description, session name (via subquery)
   - Uses SQLAlchemy `ilike` for case-insensitive search

2. **projects.py (API route)**
   - Added `search: Optional[str]` query parameter
   - Passed to `manager.list_projects(search=search)`

### Frontend
1. **projects.ts (API client)**
   - Added `ListProjectsParams` interface
   - `list()` method accepts search params

2. **useProjects.ts**
   - `loadProjects()` accepts `ListProjectsParams`

3. **Sidebar.tsx**
   - Separated `searchInput` (UI state) and `activeSearch` (executed query)
   - Enter key triggers `executeSearch()`
   - Placeholder: "検索してEnter..."

4. **ProjectList.tsx**
   - Removed local filtering (`useMemo` with `filteredProjects`)
   - Changed prop from `searchQuery` to `activeSearch`
   - Shows "「{query}」に該当するプロジェクトがありません" when no results

## Bug Fixes
- **Session name not saving**: Fixed field mismatch
  - Frontend used `title`, backend used `name`
  - Changed all frontend code to use `name`

## Patterns Learned
- API parameter naming must match between frontend and backend
- Search should be API-based for consistency with session name search
- Enter key trigger prevents excessive API calls during typing
