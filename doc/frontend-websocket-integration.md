# フロントエンドWebSocket統合ドキュメント

## 概要

Web版Claude CodeプロジェクトにおけるWebSocket統合実装の完全なドキュメントです。バックエンドのFastAPI WebSocketエンドポイントと、Next.jsフロントエンドのリアルタイム通信機能を統合しました。

## 実装完了項目

### 1. 型定義の更新

#### `/src/frontend/src/types/websocket.ts`

バックエンド仕様に完全対応したWebSocketメッセージ型を定義しました。

```mermaid
classDiagram
    class WSServerMessage {
        <<union type>>
    }

    class WSTextMessage {
        type: 'text'
        content: string
    }

    class WSThinkingMessage {
        type: 'thinking'
    }

    class WSToolUseStartMessage {
        type: 'tool_use_start'
        tool_use_id: string
        tool: string
        input?: Record
    }

    class WSToolExecutingMessage {
        type: 'tool_executing'
        tool_use_id: string
        tool: string
        input: Record
    }

    class WSToolResultMessage {
        type: 'tool_result'
        tool_use_id: string
        success: boolean
        output: string
    }

    class WSResultMessage {
        type: 'result'
        usage: Object
        cost?: number
    }

    class WSErrorMessage {
        type: 'error'
        message?: string
        error?: string
        code?: string
    }

    WSServerMessage <|-- WSTextMessage
    WSServerMessage <|-- WSThinkingMessage
    WSServerMessage <|-- WSToolUseStartMessage
    WSServerMessage <|-- WSToolExecutingMessage
    WSServerMessage <|-- WSToolResultMessage
    WSServerMessage <|-- WSResultMessage
    WSServerMessage <|-- WSErrorMessage
```

#### `/src/frontend/src/types/tool.ts` (新規作成)

ツール実行状態を管理するための型定義を追加しました。

```mermaid
stateDiagram-v2
    [*] --> pending: startToolExecution
    pending --> executing: tool_executing message
    executing --> success: tool_result (success)
    executing --> error: tool_result (error)
    success --> [*]
    error --> [*]
```

### 2. State管理の実装

#### `/src/frontend/src/stores/chatStore.ts`

Zustandを使用したグローバル状態管理を実装しました。

```mermaid
flowchart LR
    subgraph 状態管理
        A[messages] --> A1[メッセージ履歴]
        B[currentStreamingMessage] --> B1[ストリーミング中テキスト]
        C[toolExecutions] --> C1[ツール実行状態]
        D[isStreaming] --> D1[ストリーミング状態]
        E[isThinking] --> E1[思考中状態]
    end
```

主要な機能:

- `addMessage()`: メッセージ履歴への追加
- `updateStreamingMessage()`: ストリーミングテキストの蓄積
- `finalizeStreamingMessage()`: ストリーミング完了時の確定
- `startToolExecution()`: ツール実行の開始
- `updateToolExecution()`: ツール実行状態の更新

### 3. WebSocketフックの完成

#### `/src/frontend/src/hooks/useWebSocket.ts`

WebSocket接続とメッセージハンドリングを実装しました。

```mermaid
flowchart TD
    A[WebSocket接続] --> B{接続状態}
    B -->|connecting| C[接続中]
    B -->|connected| D[接続完了]
    B -->|disconnected| E[切断]
    B -->|error| F[エラー]

    E --> G{再接続試行}
    G -->|5回未満| H[指数バックオフで再接続]
    G -->|5回以上| I[再接続停止]

    D --> J[メッセージ受信]
    J --> K{メッセージタイプ}
    K -->|thinking| L[思考状態セット]
    K -->|text| M[テキスト蓄積]
    K -->|tool_use_start| N[ツール開始]
    K -->|tool_executing| O[実行中更新]
    K -->|tool_result| P[結果更新]
    K -->|result| Q[完了処理]
    K -->|error| R[エラー処理]
```

主要な機能:

- 自動再接続（指数バックオフ）
- メッセージタイプ別処理
- エラーハンドリング
- 接続状態管理

### 4. 統合フックの作成

#### `/src/frontend/src/hooks/useChat.ts` (新規作成)

`useWebSocket`と`useChatStore`を統合した高レベルインターフェースを提供します。

```mermaid
flowchart LR
    A[useChat Hook] --> B[useWebSocket]
    A --> C[useChatStore]

    B --> D[WebSocket通信]
    C --> E[状態管理]

    A --> F[統合API]
    F --> F1[sendMessage]
    F --> F2[interrupt]
    F --> F3[clearMessages]
    F --> F4[reconnect]
```

### 5. UIコンポーネントの実装

#### `/src/frontend/src/components/chat/ToolExecutionDisplay.tsx` (新規作成)

ツール実行状態を視覚的に表示するコンポーネントです。

```mermaid
flowchart TD
    A[ToolExecutionDisplay] --> B{実行状態}
    B -->|pending| C[⏳ 待機中]
    B -->|executing| D[⚙️ 実行中 アニメーション]
    B -->|success| E[✅ 成功]
    B -->|error| F[❌ エラー]

    A --> G[展開/折りたたみ]
    G --> H[入力パラメータ表示]
    G --> I[出力結果表示]
    G --> J[実行時間表示]
```

特徴:

- ツールアイコン表示（Read, Write, Edit, Bash, etc.）
- ステータス別の色分け
- 実行時間の表示
- 入力/出力の折りたたみ表示

#### `/src/frontend/src/components/chat/ChatContainer.tsx` (更新)

すべての機能を統合したメインチャットコンテナです。

```mermaid
flowchart TD
    A[ChatContainer] --> B[ヘッダー]
    B --> B1[接続状態表示]
    B --> B2[停止ボタン]

    A --> C[メッセージエリア]
    C --> C1[MessageList]
    C --> C2[ストリーミングメッセージ]
    C --> C3[ToolExecutionDisplay]
    C --> C4[ThinkingIndicator]

    A --> D[MessageInput]
```

## WebSocket通信フロー

### メッセージ送信フロー

```mermaid
sequenceDiagram
    participant User
    participant ChatContainer
    participant useChat
    participant useWebSocket
    participant Backend
    participant useChatStore

    User->>ChatContainer: メッセージ入力
    ChatContainer->>useChat: sendMessage(content)
    useChat->>useChatStore: addMessage (ユーザー)
    useChat->>useWebSocket: sendMessage(content)
    useWebSocket->>Backend: {"type": "chat", "content": "..."}
    useWebSocket->>useChatStore: setStreaming(true)

    Backend-->>useWebSocket: {"type": "thinking"}
    useWebSocket-->>useChatStore: setThinking(true)

    Backend-->>useWebSocket: {"type": "text", "content": "..."}
    useWebSocket-->>useChatStore: updateStreamingMessage(text)

    Backend-->>useWebSocket: {"type": "tool_use_start", ...}
    useWebSocket-->>useChatStore: startToolExecution(...)

    Backend-->>useWebSocket: {"type": "tool_executing", ...}
    useWebSocket-->>useChatStore: updateToolExecution(status: executing)

    Backend-->>useWebSocket: {"type": "tool_result", ...}
    useWebSocket-->>useChatStore: updateToolExecution(status: success/error)

    Backend-->>useWebSocket: {"type": "result", ...}
    useWebSocket-->>useChatStore: finalizeStreamingMessage()
    useWebSocket-->>useChatStore: setStreaming(false)
    useWebSocket-->>useChatStore: setThinking(false)
```

### ツール実行フロー

```mermaid
sequenceDiagram
    participant Backend
    participant useWebSocket
    participant chatStore
    participant UI

    Backend->>useWebSocket: tool_use_start
    useWebSocket->>chatStore: startToolExecution
    chatStore->>UI: pending状態で表示

    Backend->>useWebSocket: tool_executing
    useWebSocket->>chatStore: updateToolExecution(executing)
    chatStore->>UI: 実行中アニメーション

    Backend->>useWebSocket: tool_result
    useWebSocket->>chatStore: updateToolExecution(success/error)
    chatStore->>UI: 結果表示
```

## 主要ファイル一覧

```mermaid
flowchart LR
    subgraph Types
        T1[types/websocket.ts]
        T2[types/tool.ts]
        T3[types/message.ts]
    end

    subgraph Stores
        S1[stores/chatStore.ts]
    end

    subgraph Hooks
        H1[hooks/useWebSocket.ts]
        H2[hooks/useChat.ts]
    end

    subgraph Components
        C1[chat/ChatContainer.tsx]
        C2[chat/ToolExecutionDisplay.tsx]
        C3[chat/MessageList.tsx]
        C4[chat/MessageInput.tsx]
        C5[chat/StreamingText.tsx]
        C6[chat/ThinkingIndicator.tsx]
    end

    T1 --> H1
    T2 --> S1
    S1 --> H1
    S1 --> H2
    H1 --> H2
    H2 --> C1
    C1 --> C2
    C1 --> C3
    C1 --> C4
    C1 --> C5
    C1 --> C6
```

## 動作確認手順

### 1. 環境変数の確認

`/src/frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 2. バックエンドの起動

```bash
cd /Users/t.hirai/AGENTSDK/src/backend
uvicorn app.main:app --reload
```

### 3. フロントエンドの起動

```bash
cd /Users/t.hirai/AGENTSDK/src/frontend
npm run dev
```

### 4. 動作確認項目

```mermaid
flowchart TD
    A[動作確認] --> B[WebSocket接続]
    B --> B1[接続状態が'connected'になる]

    A --> C[メッセージ送信]
    C --> C1[ユーザーメッセージが表示される]
    C --> C2[Thinking状態が表示される]
    C --> C3[ストリーミングテキストが表示される]

    A --> D[ツール実行]
    D --> D1[ツール開始が表示される]
    D --> D2[実行中アニメーション]
    D --> D3[実行結果が表示される]
    D --> D4[実行時間が表示される]

    A --> E[エラーハンドリング]
    E --> E1[接続エラー時の再接続]
    E --> E2[メッセージエラー時の表示]

    A --> F[UI操作]
    F --> F1[ツールカードの展開/折りたたみ]
    F --> F2[Stopボタンでinterrupt]
    F --> F3[自動スクロール]
```

## 実装の特徴

### パフォーマンス最適化

1. **効率的な状態更新**
   - ストリーミングメッセージは蓄積され、完了時に一度だけメッセージ配列に追加
   - ツール実行状態はRecordで管理し、個別更新が可能

2. **再レンダリング最小化**
   - useCallbackによる関数メモ化
   - 必要最小限の状態更新

3. **自動再接続**
   - 指数バックオフによる再接続（最大5回）
   - ユーザーの手動再接続も可能

### アクセシビリティ

1. **キーボード操作**
   - Enter: メッセージ送信
   - Shift+Enter: 改行

2. **視覚的フィードバック**
   - 接続状態の色分け表示
   - ツール実行状態のアイコン表示
   - ストリーミング中のカーソルアニメーション

### エラーハンドリング

1. **接続エラー**
   - 自動再接続
   - エラー状態の視覚的表示

2. **メッセージエラー**
   - エラーメッセージの表示
   - ストリーミング状態のクリア

3. **ツール実行エラー**
   - エラー状態の視覚的表示
   - エラー詳細の表示

## 今後の拡張可能性

```mermaid
flowchart LR
    subgraph 現在の実装
        A1[WebSocket統合]
        A2[ツール実行表示]
        A3[ストリーミング]
    end

    subgraph 将来の拡張
        B1[ファイルアップロード]
        B2[メッセージ編集]
        B3[コード実行結果の可視化]
        B4[マルチセッション対応]
        B5[オフライン対応]
    end

    A1 --> B1
    A2 --> B3
    A3 --> B4
    A1 --> B5
```

## まとめ

フロントエンドWebSocket統合は以下の項目を完了しました:

1. バックエンド仕様に完全対応した型定義
2. 効率的な状態管理（Zustand）
3. 再接続機能付きWebSocketフック
4. 統合されたuseChatフック
5. ツール実行の完全な可視化
6. リアルタイムストリーミング表示
7. エラーハンドリングとユーザーフィードバック

すべての実装はTypeScript strict modeでコンパイルが通り、型安全性が保証されています。
