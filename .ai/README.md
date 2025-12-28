# AI アシスタント共通設定

このディレクトリには、複数の AI アシスタント（GitHub Copilot, Claude Code, Cursor等）で共通利用される指示ファイル、テンプレート、プロンプトが格納されています。

## ディレクトリ構造

```
.ai/
├── instructions/           # 共通指示書
│   ├── main.md            # プロジェクト全体の基本指示
│   ├── code-generation.md # コード生成に関する指示
│   ├── review.md          # コードレビューに関する指示
│   ├── test.md            # テストに関する指示
│   ├── commit-message.md  # コミットメッセージに関する指示
│   └── task.md            # タスク管理に関する指示
├── templates/              # 設計書テンプレート
│   ├── apex_class.template.md
│   ├── apex_trigger.template.md
│   ├── lwc.template.md
│   ├── flow.template.md
│   └── visualforce.template.md
├── prompts/                # タスク固有のプロンプト
│   ├── createDesignSpec.prompt.md
│   ├── createObjectDoc.prompt.md
│   ├── validateAutomationImpact.prompt.md
│   └── fieldReplacementImpactAnalysis.prompt.md
└── README.md               # このファイル
```

## 各ツールからの参照方法

### GitHub Copilot
`.github/copilot-instructions.md` から本ディレクトリを参照しています。

### Claude Code
プロジェクトルートの `CLAUDE.md` から本ディレクトリを参照しています。

### Cursor
`.cursor/rules` から本ディレクトリを参照しています。

## 指示書の優先順位

指示内容が競合する場合、以下の優先順位に従ってください：

1. **メモリーバンク:** `_memory-bank/_memory-bank-instructions.md`
2. **プロンプトファイル:** `.ai/prompts/`
3. **個別の指示書:** `.ai/instructions/`
4. **全体の指示書:** `.ai/instructions/main.md`

## 使い方

### 新しい指示を追加する場合
1. `.ai/instructions/` に新しいMarkdownファイルを作成
2. 各ツールの設定ファイルから参照を追加

### 新しいテンプレートを追加する場合
1. `.ai/templates/` に `*.template.md` ファイルを作成
2. `createDesignSpec.prompt.md` のテンプレート参照一覧を更新

### 新しいプロンプトを追加する場合
1. `.ai/prompts/` に `*.prompt.md` ファイルを作成
2. 必要に応じて `instructions/main.md` に説明を追加

## 注意事項

- このディレクトリの内容を変更した場合、各ツールの設定ファイルへの影響を確認してください
- テンプレート内のパス参照は `.ai/` ベースで記述してください
- 旧 `.github/prompts/` ディレクトリは参照用として残していますが、今後は `.ai/prompts/` を使用してください
