# チャット機能修正：テキストとツールの交互表示

## 実装日
2025-12-30

## 修正概要
チャット機能を修正し、Claudeの応答でテキストとツール実行を時系列順に交互に表示するようにした。

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `stores/chatStore.ts` | `streamingContentBlocks`, `currentTextBuffer`, `appendTextToStream`, `appendToolUseToStream`, `appendToolResultToStream`, `getStreamingContentBlocks` を追加 |
| `hooks/useWebSocket.ts` | テキスト・ツール受信時に新しいメソッドを呼び出すよう修正 |
| `hooks/useChat.ts` | `streamingContentBlocks` を返すよう修正 |
| `components/chat/ChatContainer.tsx` | ストリーミング中のコンテンツを時系列順に表示 |

## アーキテクチャ

### コンテンツブロック管理
- `streamingContentBlocks`: 確定済みのコンテンツブロック配列（TextBlock, ToolUseBlock, ToolResultBlock）
- `currentTextBuffer`: 現在蓄積中のテキスト（次のツール実行までのテキスト）

### フロー
1. `text` 受信 → `currentTextBuffer` に追加
2. `tool_use_start` 受信 → `currentTextBuffer` をフラッシュして `streamingContentBlocks` に追加、ツール使用も追加
3. `tool_result` 受信 → `streamingContentBlocks` に追加
4. `result` 受信 → 残りのテキストバッファを含めて最終メッセージを作成

### 表示
ChatContainerで `streamingContentBlocks` をマップして時系列順に表示。
tool_useとtool_resultはペアリングして `ToolUseWithResultCard` で表示。

## 期待される表示形式

```
テキスト1

[Tool: name] status
  Input: {...}
  Output: ...

テキスト2

[Tool: name] status
...
```
