# Claude Code - Web Frontend

Web-based coding assistant powered by Claude Agent SDK.

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 3.x
- **State Management**: Zustand 4.x
- **Editor**: Monaco Editor (with code-server fallback)
- **Real-time Communication**: WebSocket

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   │   ├── chat/        # Chat interface
│   │   ├── editor/      # Code editor
│   │   ├── layout/      # Layout components
│   │   └── common/      # Shared components
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand state stores
│   ├── lib/             # Utility libraries
│   ├── types/           # TypeScript type definitions
│   └── styles/          # CSS and themes
├── public/              # Static assets
└── Dockerfile           # Docker configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_CODE_SERVER_URL=http://localhost:8080
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
# Development
docker build --target development -t claude-code-frontend:dev .
docker run -p 3000:3000 claude-code-frontend:dev

# Production
docker build --target production -t claude-code-frontend:prod .
docker run -p 3000:3000 claude-code-frontend:prod
```

## Features

### Project & Session Management
- **Hierarchical Organization**: Projects contain multiple sessions
- **CRUD Operations**: Create, read, update, and delete projects and sessions
- **Real-time Sync**: Auto-refresh when data changes
- **Context Menus**: Right-click actions for quick operations

### Chat Interface
- Real-time streaming chat with Claude
- Tool usage visualization
- Message history
- Thinking indicator

### Code Editor
- VSCode Web (code-server) integration
- Monaco Editor fallback
- Syntax highlighting
- File tree navigation

### UI Components (NEW)
- **ProjectList**: Expandable project hierarchy
- **SessionList**: Sessions grouped by project
- **Modals**: Create/edit dialogs for projects and sessions
- **Context Menus**: Delete and manage items

### Themes
- Claude theme (default)
- Dark theme
- Light theme

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:8000 |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | ws://localhost:8000 |
| `NEXT_PUBLIC_CODE_SERVER_URL` | code-server URL | http://localhost:8080 |

## Architecture

### State Management

- **chatStore**: Chat messages and streaming state
- **projectStore**: Project list and current project
- **sessionStore**: Session list and current session
- **uiStore**: UI preferences (theme, layout)
- **editorStore**: Editor settings

### WebSocket Communication

Client connects to backend via WebSocket for real-time chat:

```typescript
// Client -> Server
{ type: 'chat', content: 'message' }
{ type: 'interrupt' }

// Server -> Client
{ type: 'text', content: 'streaming text' }
{ type: 'tool_use', tool: 'Read', input: {...} }
{ type: 'result', cost: 0.01, usage: {...} }
```

## Development Guidelines

### Component Structure
- Use functional components with TypeScript
- Implement proper prop types
- Use 'use client' directive for client components
- Keep components small and focused

### State Management
- Use Zustand for global state
- Persist important state (projects, sessions)
- Keep UI state separate from data state

### Styling
- Use TailwindCSS utility classes
- Follow CSS variable pattern for theming
- Maintain responsive design

### Performance
- Use dynamic imports for heavy components
- Implement code splitting
- Optimize re-renders with memo/useMemo

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## License

MIT
