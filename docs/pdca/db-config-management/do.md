# Do: DB Config Management

## Implementation Log

### 2025-12-29

#### Database Models
- Added `ProjectMCPServerModel` with JSON columns for `args` and `env`
- Added `ProjectAgentModel` with JSON column for `tools`
- Added `ProjectSkillModel` with all scalar fields
- Added `ProjectCommandModel` with all scalar fields
- All models have `project_id` foreign key with CASCADE delete

#### Pydantic Schemas
- Created `schemas/project_config.py` with Base/Create/Update/Response schemas
- Added `ProjectConfigJSON` for AgentSdkClient integration

#### CRUD Service
- Created `services/project_config_service.py` with full CRUD operations
- Added `get_project_config_json()` for aggregate config retrieval
- Implemented `enabled_only` filtering for production use

#### API Endpoints
- Created `api/routes/project_config.py` with 20+ endpoints
- All endpoints require JWT authentication
- Permission checking (read/write) implemented

#### WebSocket Integration
- Modified `handle_chat_message` to accept `project_id`
- Added DB config loading with file-based fallback
- Added helper functions: `generate_db_system_prompt`, `get_db_enabled_tools`

## Learnings During Implementation

1. **JSON Columns**: Only use JSON for truly variable-length data (args, env, tools)
2. **Fallback Pattern**: DB config takes priority, fallback to file-based config
3. **Enabled Filter**: `enabled_only=True` in aggregate queries excludes disabled items
4. **TYPE_CHECKING**: Use string literal type hints to avoid circular imports
