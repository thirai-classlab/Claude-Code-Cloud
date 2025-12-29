# Code Style and Conventions

## Python (Backend)

### Formatting
- **Black** for code formatting
- **isort** for import sorting
- Line length: 100 characters
- Target Python: 3.11

### Linting
- **flake8** for linting
- **mypy** for strict type checking
  - `strict = true`
  - `warn_return_any = true`
  - `disallow_untyped_defs = true`

### Type Hints
- Required for all function definitions
- Strict mode enforced by mypy

### Testing
- pytest with pytest-asyncio
- `asyncio_mode = "auto"`
- Coverage reporting with pytest-cov
- Test file pattern: `test_*.py`
- Test class pattern: `Test*`
- Test function pattern: `test_*`

## TypeScript (Frontend)

### Linting
- ESLint with Next.js config
- TypeScript strict mode

### Components
- Atomic Design pattern
  - atoms/ - Smallest UI units (Button, Avatar, Badge, Indicator)
  - molecules/ - Combined atoms (NavItem, StatusBadge, MessageHeader)
  - organisms/ - Large components (Sidebar, Header, Message, CodeBlock, ChatInput)
  - templates/ - Page layouts (MainLayout)

### Styling
- TailwindCSS
- Theme: Linear Style (Dark theme)
- Default theme: `linear`
- Background colors: #09090b → #0f0f11 → #18181b
- Accent color: #5e5ce6 (Indigo)

## Documentation

### Mermaid Required
All MD documentation should use Mermaid diagrams for:
- Architecture diagrams
- Flowcharts
- Sequence diagrams

This applies to SubAgents as well.

## General Principles
- Avoid over-engineering
- Keep solutions simple and focused
- Don't add features beyond what was asked
- Don't add comments to code you didn't change
- Delete unused code completely (no backwards-compatibility hacks)
