# PM Agent Context

## 現在のプロジェクト
AGENTSDK (Web版Claude Code)

## 最新の完了機能
### テンプレート機能 (2024-12-29)
- プロジェクトテンプレートのCRUD機能
- 既存プロジェクトからテンプレート作成
- テンプレートからプロジェクト初期化
- テンプレートはユーザーに紐づく管理
- ホームページにテンプレートセクション追加
- プロジェクトページに「Save as Template」ボタン

### テンプレートに含まれるもの
- ファイル（テキストファイル）
- MCP サーバー設定
- エージェント設定
- スキル設定
- コマンド設定

### 関連ファイル
- Backend:
  - models/database.py (ProjectTemplateModel, ProjectTemplateFileModel)
  - schemas/template.py
  - services/template_service.py
  - api/routes/templates.py
  - migrations/create_template_tables.sql

- Frontend:
  - types/template.ts
  - lib/api/templates.ts
  - components/template/TemplateSection.tsx
  - components/project/CreateProjectModal.tsx (テンプレート選択追加)
  - components/pages/ProjectPage.tsx (Save as Template追加)

## 直近の課題と解決
- MySQL JSON列にデフォルト値を設定できない → DEFAULTを削除
- atoms/Buttonに"secondary"バリアントがない → common/Buttonを使用
- TemplateFormModalの型不一致 → union型に変更

## システム状態
- Docker: 稼働中
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
