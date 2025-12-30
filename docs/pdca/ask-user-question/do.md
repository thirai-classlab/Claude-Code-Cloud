# Do: AskUserQuestion 回答機能の実装

## 実装完了サマリー

### 実装日: 2024-12-30

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/frontend/src/types/websocket.ts` | Question, QuestionOption型追加、WSQuestionAnswerMessage, WSUserQuestionMessage追加 |
| `src/backend/app/api/websocket/handlers.py` | SessionState拡張、can_use_tool_callback追加、_handle_question_answer追加、AskUserQuestion重複送信防止 |
| `src/frontend/src/components/chat/QuestionCard.tsx` | 新規コンポーネント（番号付きボタンUI） |
| `src/frontend/src/stores/chatStore.ts` | PendingQuestion型、setPendingQuestion/clearPendingQuestion追加 |
| `src/frontend/src/hooks/useWebSocket.ts` | answerQuestion関数、user_questionハンドラ追加 |
| `src/frontend/src/hooks/useChat.ts` | answerQuestion, pendingQuestion公開 |
| `src/frontend/src/components/chat/ChatContainer.tsx` | QuestionCard統合、AskUserQuestionスキップ処理 |

## 主要な実装ポイント

### 1. can_use_tool_callback によるインターセプト

```python
async def can_use_tool_callback(tool_name: str, tool_input: dict, context: dict):
    if tool_name != "AskUserQuestion":
        return {"behavior": "allow", "updatedInput": tool_input}

    # is_interactive=False (Cron) の場合はデフォルト回答
    if session_state and not session_state.is_interactive:
        return {"behavior": "allow", "updatedInput": {**tool_input, "answers": {"0": "0"}}}

    # フロントエンドに質問を送信
    await conn_manager.send_message(session_id, {
        "type": "user_question",
        "tool_use_id": tool_use_id,
        "questions": questions,
        "timestamp": time.time(),
    })

    # 回答を待機（タイムアウト: 5分）
    await asyncio.wait_for(session_state.answer_event.wait(), timeout=300.0)

    # 回答をツール入力に追加
    return {"behavior": "allow", "updatedInput": {**tool_input, "answers": answers}}
```

### 2. 重複表示の防止

`_stream_response` 内で `AskUserQuestion` の `tool_use_start` メッセージ送信をスキップ:

```python
if block.name == "AskUserQuestion":
    logger.debug("Skipping tool_use_start for AskUserQuestion")
    if tool_use_id_map is not None:
        tool_use_id_map[block.id] = block.name
    continue  # tool_use_start を送信しない
```

### 3. フロントエンド QuestionCard

- 番号付きボタン表示（1, 2, 3...）
- シングルセレクト/マルチセレクト対応
- "Other..." オプションでカスタムテキスト入力
- 送信後は確認メッセージ表示

## テスト確認

- [x] フロントエンドビルド成功
- [x] バックエンドビルド成功
- [x] コンテナ起動成功
- [ ] 実際の動作確認（AskUserQuestion が呼ばれる状況でテスト）

---

## 実装ログ (時系列)

### 2024-12-30 - 調査・設計フェーズ

#### 調査結果

1. **Claude Agent SDK の仕組み**:
   - `AskUserQuestion` は通常のツールとして `ToolUseBlock` で送られてくる
   - 回答は `ToolResultBlock` として返す必要がある
   - `can_use_tool` コールバックでインターセプト可能

2. **採用アプローチ**:
   - `can_use_tool` コールバックで `AskUserQuestion` を検出
   - フロントエンドに質問を送信
   - `asyncio.Event` で回答を待機
   - 回答を `updatedInput` に追加してツール実行を許可

## Step 1: フロントエンド型定義の追加
