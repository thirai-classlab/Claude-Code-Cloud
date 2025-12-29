# Task Completion Checklist

## Before Marking Task Complete

### Backend (Python)
1. [ ] Run tests: `poetry run pytest`
2. [ ] Format code: `poetry run black .`
3. [ ] Sort imports: `poetry run isort .`
4. [ ] Run linter: `poetry run flake8`
5. [ ] Type check: `poetry run mypy .`
6. [ ] Verify coverage if applicable

### Frontend (TypeScript/React)
1. [ ] Type check: `npm run type-check`
2. [ ] Lint: `npm run lint`
3. [ ] Build test: `npm run build`

### Docker Environment
1. [ ] Verify services are running: `make status`
2. [ ] Check logs for errors: `make logs`

## Documentation Updates
- [ ] Update CLAUDE.md if global patterns change
- [ ] Create docs/patterns/[feature].md for successful patterns
- [ ] Create docs/mistakes/[feature]-YYYY-MM-DD.md for failures
- [ ] Use Mermaid diagrams in documentation

## PDCA Cycle
1. **Plan**: docs/pdca/[feature]/plan.md (hypothesis)
2. **Do**: docs/pdca/[feature]/do.md (implementation log)
3. **Check**: docs/pdca/[feature]/check.md (evaluation)
4. **Act**: docs/pdca/[feature]/act.md (improvements)

## Memory Updates (Serena MCP)
- write_memory("session/checkpoint", progress) every 30min
- write_memory("learning/patterns/[name]", success_pattern) on success
- write_memory("learning/mistakes/[timestamp]", failure_analysis) on failure

## Error Handling
- NEVER retry same approach without understanding WHY it failed
- Investigate root cause using context7, WebFetch, Grep
- Document in docs/pdca/[feature]/do.md
