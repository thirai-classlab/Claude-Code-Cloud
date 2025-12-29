# Codebase Structure

```
AGENTSDK/
├── CLAUDE.md                    # Project configuration (essential)
├── README.md                    # Project overview
├── Makefile                     # Docker operation commands
├── docker-compose.yml           # Standard Docker config
├── docker-compose.dind.yml      # DinD extension
├── docker-compose.dev.yml       # Development mode
├── .env / .env.example          # Environment variables
│
├── src/
│   ├── backend/                 # Python FastAPI
│   │   ├── app/
│   │   │   ├── main.py          # Entry point
│   │   │   ├── config.py        # Configuration
│   │   │   ├── api/routes/      # API endpoints
│   │   │   ├── core/            # Core logic
│   │   │   ├── services/        # Business logic
│   │   │   ├── models/          # Data models
│   │   │   ├── schemas/         # Pydantic schemas
│   │   │   └── utils/           # Utilities
│   │   ├── tests/               # Backend tests
│   │   └── pyproject.toml       # Poetry dependencies
│   │
│   ├── frontend/                # Next.js + React
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   ├── components/      # UI components (Atomic Design)
│   │   │   │   ├── atoms/       # Button, Avatar, Badge, Indicator
│   │   │   │   ├── molecules/   # NavItem, StatusBadge, MessageHeader
│   │   │   │   ├── organisms/   # Sidebar, Header, Message, CodeBlock
│   │   │   │   └── templates/   # MainLayout
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── stores/          # Zustand state management
│   │   │   └── lib/             # API client
│   │   └── package.json         # NPM dependencies
│   │
├── doc/                         # Confirmed design documents
│   ├── architecture-design.md
│   ├── docker-design.md
│   ├── dind-setup-guide.md
│   ├── dind-executor-usage.md
│   ├── user-guide.md
│   ├── frontend-design.md
│   ├── backend-design.md
│   ├── frontend-design-system.md
│   ├── frontend-component-design.md
│   └── tailwind-config-design.md
│
├── doc_draft/                   # Work in progress documents
│   └── design-patterns/         # UI pattern comparisons
│
├── workspace/                   # User project workspace
│
└── dind-storage/                # DinD persistent storage
```

## Key Entry Points

### Backend
- Entry: `src/backend/app/main.py`
- Config: `src/backend/app/config.py`
- API Routes: `src/backend/app/api/routes/`

### Frontend
- App Router: `src/frontend/src/app/`
- Components: `src/frontend/src/components/`
- State: `src/frontend/src/stores/`
