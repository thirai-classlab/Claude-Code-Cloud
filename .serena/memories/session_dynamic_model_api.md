# Session: Dynamic Model API Implementation

## Date: 2025-12-31

## Summary
Anthropic APIから動的にモデルリストを取得する機能を実装。チャット画面のモデル選択も対応。

## Implemented Features

### 1. Backend Model API
| File | Description |
|------|-------------|
| `src/backend/app/api/routes/models.py` (NEW) | Anthropic `/v1/models` からモデル取得、1時間キャッシュ |
| `src/backend/app/main.py` | models router追加 |

**Endpoints:**
- `GET /api/models` - 全モデル一覧（キャッシュ付き、refresh=trueで強制更新）
- `GET /api/models/recommended` - チャット向け推奨モデル

### 2. Frontend Model Integration
| File | Description |
|------|-------------|
| `src/frontend/src/lib/api/models.ts` (NEW) | Models APIクライアント |
| `src/frontend/src/components/session/CreateSessionModal.tsx` | セッション作成時のモデル動的取得 |
| `src/frontend/src/components/chat/ChatContainer.tsx` | チャット画面のモデル選択動的化 |

### 3. Bug Fixes
| Issue | Fix |
|-------|-----|
| `timezone` not imported | 複数ファイルで `from datetime import datetime, timezone` 追加 |
| Model not passed to SDK | `build_sdk_options`に`model`パラメータ追加 |
| SDK session resume failure | リトライ機構追加（セッションクリア→新規開始） |

## Technical Details

### Model API Response Format
```typescript
interface ModelInfo {
  id: string;           // e.g., "claude-sonnet-4-20250514"
  display_name: string; // e.g., "Claude Sonnet 4"
  type: string;         // "model"
}
```

### Fallback Models
APIが利用できない場合のフォールバック:
- claude-sonnet-4-20250514
- claude-opus-4-20250514
- claude-3-5-haiku-20241022

### SDK Model Integration
```python
# chat_processor.py
def build_sdk_options(
    self,
    config: ConfigBundle,
    resume_session_id: Optional[str] = None,
    model: Optional[str] = None,  # セッションで選択されたモデル
) -> ClaudeAgentOptions:
    options = ClaudeAgentOptions(
        ...
        model=model,
    )
```

### SDK Session Resume Retry
```python
# handlers.py
# SDK resume失敗時のリトライ
if is_resume_error:
    await conn_manager.close_sdk_client(session_id)
    await session_manager.update_sdk_session_id(session_id, None)
    options = processor.build_sdk_options(config, resume_session_id=None, model=session_model)
    # 新規セッションとしてリトライ
```

## Files Modified
- `src/backend/app/api/routes/models.py` (NEW)
- `src/backend/app/main.py`
- `src/backend/app/core/chat_processor.py`
- `src/backend/app/core/session_manager.py`
- `src/backend/app/api/websocket/handlers.py`
- `src/backend/app/models/database.py`
- `src/backend/app/core/project_manager.py`
- `src/backend/app/services/share_service.py`
- `src/backend/app/services/usage_service.py`
- `src/frontend/src/lib/api/models.ts` (NEW)
- `src/frontend/src/lib/api/index.ts`
- `src/frontend/src/components/session/CreateSessionModal.tsx`
- `src/frontend/src/components/chat/ChatContainer.tsx`

## Notes
- Claudeの自己認識（「私はSonnet 3.5です」）はモデルの訓練データに基づくもので、API設定とは別問題
- コストログから実際には正しいモデルが使用されていることを確認済み（Opus: $0.30, Sonnet: $0.06）
