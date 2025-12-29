# Session: プロジェクト固有APIキー実装

## 日時
2025-12-29

## 実装概要
プロジェクトごとにAnthropicAPIキーを設定し、システムデフォルトのAPIキーを使用しないように変更

## 変更ファイル

### バックエンド

#### 1. models/database.py
- `ProjectModel`に`api_key`カラムを追加
```python
api_key = Column(String(500), nullable=True)  # プロジェクト固有のAPIキー
```

#### 2. models/projects.py
- `Project` Pydanticモデルに`api_key`フィールド追加

#### 3. schemas/request.py
- `UpdateProjectRequest`に`api_key`フィールド追加

#### 4. schemas/response.py
- `ProjectResponse`に`api_key`フィールド追加

#### 5. core/project_manager.py
- `update_project()`メソッドに`api_key`パラメータ追加

#### 6. api/routes/projects.py
- PUT `/api/projects/{id}`エンドポイントで`api_key`を受け取り保存

#### 7. api/websocket/handlers.py（重要）
- `ProjectManager`をインポート
- `handle_chat_message()`を更新:
  - プロジェクトからapi_keyを取得
  - api_keyが未設定の場合はエラーを返す
  - `ClaudeAgentOptions`の`env`パラメータに`ANTHROPIC_API_KEY`として渡す

#### 8. core/cron_scheduler.py
- `_execute_command()`を更新:
  - プロジェクトからapi_keyを取得
  - api_keyが未設定の場合は実行失敗
  - `ClaudeAgentOptions`の`env`パラメータにAPIキーを渡す

### フロントエンド

#### 1. types/project.ts
- `Project`と`UpdateProjectRequest`インターフェースに`api_key`追加

#### 2. lib/api/projects.ts
- `UpdateProjectRequest`に`api_key`追加

#### 3. stores/uiStore.ts
- `EditorTab`型に`'settings' | 'pricing'`追加

#### 4. components/editor/ProjectSettingsEditor.tsx（新規）
- プロジェクト名、説明、APIキーを編集できる設定画面
- APIキーは表示/非表示切り替え可能

#### 5. components/editor/PricingEditor.tsx（新規）
- 使用量統計と料金表を表示

#### 6. components/editor/EditorContainer.tsx
- 「設定」「料金」タブを追加
- タブ順序: VSCode, MCP, Agents, Commands, Skills, Cron, Pricing, Settings

## 技術的詳細

### ClaudeAgentOptionsのenvパラメータ
Claude Agent SDKの`ClaudeAgentOptions`には`env`パラメータがあり、環境変数をDict形式で渡せる:
```python
options = ClaudeAgentOptions(
    ...
    env={"ANTHROPIC_API_KEY": project.api_key},
)
```

### エラーハンドリング
APIキーが設定されていない場合:
- WebSocketチャット: エラーメッセージ「プロジェクトにAPIキーが設定されていません。設定画面でAPIキーを設定してください。」
- Cron実行: 実行失敗としてログに記録

## データベースマイグレーション
SQLAlchemyの`create_all()`は既存テーブルに新規カラムを追加しない。手動で実行:
```sql
ALTER TABLE projects ADD COLUMN api_key VARCHAR(500) NULL;
```

## 次のステップ（検討事項）
- APIキーの暗号化保存（現在は平文）
- 使用量統計のAPI実装（PricingEditorは現在プレースホルダー）
- APIキー検証（設定時に有効性チェック）
