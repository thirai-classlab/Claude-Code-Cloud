# Session: GitHub連携機能 設計 (2026-01-01)

## 成果物
- `doc/github-integration-design.md` - GitHub連携機能設計書

## 主な決定事項

### 認証方式
- SSH鍵方式を推奨（VSCode/CLI両対応）
- プロジェクトごとに独立したSSH鍵ペアを生成
- `~/.ssh/config` でHost aliasを設定

### ユーザーシナリオ（5つ）
1. GitHubリポジトリからプロジェクト作成
2. コード編集後にCommit & Push
3. Pull Request作成
4. ブランチ切り替え・作成
5. Issueからタスク開始

### 技術選定
- GitHub API: PyGitHub / httpx
- Git操作: GitPython
- OAuth: authlib
- 暗号化: cryptography (AES-256-GCM)
- Diff表示: react-diff-viewer-continued

### 実装フェーズ
- Phase 1: GitHub OAuth + アカウント管理 (5日)
- Phase 2: リポジトリ一覧 + Clone (5日)
- Phase 3: Git操作 (5日)
- Phase 4: ブランチ管理 (3日)
- Phase 5: PR作成 + AI生成 (5日)
- Phase 6: Issue連携 (3日)
- Phase 7: UI改善 + テスト (4日)
- 合計: 約30日

### データモデル
- `github_accounts` - GitHubアカウント情報
- `github_repo_links` - プロジェクトとリポジトリの連携

## 次のステップ
- ユーザーのフィードバック待ち
- Phase 1実装開始の判断
