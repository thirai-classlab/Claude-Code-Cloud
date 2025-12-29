# Session: Site Structure Renewal

## Date: 2025-12-29

## Summary
フロントエンドのサイト構成を見直し、URL-basedルーティングを実装。また、プロジェクト詳細とセッション詳細間のナビゲーションで右パネル（VSCode）が再描画されないよう最適化。

## Requirements (User Request)
```
ページ:コンテンツ
ホーム: プロジェクトの一覧
--プロジェクトトップページ: プロジェクト名+説明+セッションの一覧
----セッション詳細ページ: チャット画面
左サイドバー+メインコンテンツの構成
プロジェクトトップとセッションページは分割し右側はVscodeなどのコンテンツ
```

## Implementation

### 1. URL Routing Structure
```
/ (Home)           → Project list (card grid)
/projects/:id      → Project top (info + sessions)
/projects/:id/sessions/:sid → Session detail (chat)
```

### 2. Layout Hierarchy
```
RootLayout (app/layout.tsx)
└── AuthGuard
    └── Providers

HomeLayout (app/page.tsx)
└── BaseLayout (Sidebar + Main)
    └── HomePage (ProjectCardGrid)

ProjectLayout (app/projects/[id]/layout.tsx)
└── AuthGuard
    └── BaseLayout (Sidebar)
        └── SplitView (Main + EditorContainer)
            └── children (ProjectPage or SessionPage)
```

### 3. Key Technical Patterns

**Right Panel Persistence**:
- Next.js App Router layouts persist across child route navigation
- EditorContainer placed in `/projects/[id]/layout.tsx`
- ProjectPage and SessionPage render only main content
- Navigation between project↔session doesn't re-render editor

**URL-Store Sync**:
- `useRouteSync` hook syncs URL params with Zustand stores
- `useNavigation` provides programmatic navigation methods
- Sidebar uses `Link` components for client-side navigation

### 4. Files Created/Modified

| Category | File | Description |
|----------|------|-------------|
| Hooks | `useRouteSync.ts` | URL ↔ Store sync |
| Layout | `BaseLayout.tsx` | Sidebar + Main |
| Layout | `SplitLayout.tsx` | Main + Right Panel |
| Layout | `app/projects/[id]/layout.tsx` | Shared project layout |
| Pages | `HomePage.tsx` | Project grid |
| Pages | `ProjectPage.tsx` | Project info + sessions |
| Pages | `SessionPage.tsx` | Chat container |
| Nav | `ProjectListNav.tsx` | Routing-aware list |
| Nav | `ProjectCardNav.tsx` | Routing-aware card |
| Nav | `SessionListNav.tsx` | Routing-aware list |
| Nav | `SessionItemNav.tsx` | Routing-aware item |
| Routes | `app/projects/[id]/page.tsx` | Project route |
| Routes | `app/projects/[id]/sessions/[sessionId]/page.tsx` | Session route |

## Learnings

1. **Next.js Layout Pattern**: 
   - layouts in App Router are ideal for persistent UI elements
   - Child navigation doesn't trigger layout re-render
   - Perfect for shared sidebars, editors, etc.

2. **State-URL Sync**:
   - Custom hook pattern for bidirectional sync
   - useEffect for URL→Store, router.push for Store→URL

3. **Component Separation**:
   - Page components should only render main content
   - Layout handles wrapper components (AuthGuard, BaseLayout)
   - Clean separation enables layout persistence

## Status
✅ Completed successfully
