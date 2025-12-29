# PM Agent Context

## 現在のプロジェクト
AGENTSDK (Web版Claude Code)

## 最新の完了機能
### ドキュメント更新 (2025-12-29)
- データベース設計書を新規作成 (doc/database-design.md)
- README.mdにドキュメント目次を追加
- アーキテクチャ設計書を最新の実装に更新 (v1.2)
- バックエンド設計書を更新 (v1.2)
- フロントエンド設計書を更新 (v1.2)
- CLAUDE.mdにデータベース設計書への参照を追加

### 作成したドキュメント
- doc/database-design.md: 12テーブルの完全なER図、DDL、インデックス設計、セキュリティ考慮事項

### 更新したドキュメント
- README.md: ドキュメント目次セクションを追加（24ドキュメントへのリンク）
- doc/architecture-design.md: MySQL/DinD/code-server追加、API設計更新
- doc/backend-design.md: ディレクトリ構造更新、テンプレート/設定サービス追加
- doc/frontend-design.md: 関連ドキュメントリンク追加
- CLAUDE.md: データベース設計書への参照追加

## システム状態
- Docker: 稼働中
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## データベース構成（12テーブル）
1. users - ユーザー管理
2. projects - プロジェクト管理
3. project_shares - プロジェクト共有
4. sessions - セッション管理
5. messages - メッセージ履歴
6. cron_logs - Cronログ
7. project_mcp_servers - MCPサーバー設定
8. project_agents - エージェント設定
9. project_skills - スキル設定
10. project_commands - コマンド設定
11. project_templates - プロジェクトテンプレート
12. project_template_files - テンプレートファイル

## 次のタスク候補
- 既存UIの置き換え（フロントエンドリニューアル）
- テスト実装の強化
- APIドキュメントの自動生成設定
