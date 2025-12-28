# Phase 3: エディタ統合設計書

**プロジェクト:** Web版Claude Code
**作成日:** 2025-12-21
**バージョン:** 1.0
**ステータス:** 🚧 実装中（0%）

---

## 目次

1. [概要](#1-概要)
2. [アーキテクチャ設計](#2-アーキテクチャ設計)
3. [エディタモード設計](#3-エディタモード設計)
4. [ファイル同期設計](#4-ファイル同期設計)
5. [実装タスク](#5-実装タスク)
6. [技術仕様](#6-技術仕様)
7. [実装優先順位](#7-実装優先順位)

---

## 1. 概要

### 1.1 目的

Phase 3では、code-server（VSCode Web）をメインエディタとして統合し、Claudeの変更をリアルタイムで反映できるようにします。code-server利用不可時はMonaco Editorをフォールバックとして使用します。

### 1.2 達成目標

```mermaid
flowchart LR
    subgraph Phase 3 達成目標
        G1[code-server統合] --> G1D[iframe埋め込み完了]
        G2[ファイル同期] --> G2D[リアルタイム更新実装]
        G3[Monaco Editor] --> G3D[フォールバック実装]
        G4[Claude連携] --> G4D[ツール結果反映]
    end
```

### 1.3 前提条件

```mermaid
classDiagram
    class 前提条件 {
        Phase 1: MVP基盤完了
        Phase 2: プロジェクト管理完了
        docker-compose: code-server定義済み
        バックエンドAPI: ファイル操作API完成
    }
```

---

## 2. アーキテクチャ設計

### 2.1 システム構成

```mermaid
flowchart TB
    subgraph Browser["ブラウザ"]
        subgraph Frontend["Frontend (Next.js)"]
            subgraph EditorContainer["EditorContainer"]
                direction LR
                ModeSelector["エディタモード選択"]

                subgraph VSCodeMode["VSCode モード"]
                    CodeServerIframe["code-server<br/>iframe埋め込み"]
                end

                subgraph SimpleMode["シンプルモード"]
                    FileTreeComp["FileTree<br/>コンポーネント"]
                    MonacoComp["Monaco Editor<br/>コンポーネント"]
                end

                ModeSelector --> VSCodeMode
                ModeSelector --> SimpleMode
                FileTreeComp --> MonacoComp
            end

            FileAPI["File API Client"]
            WSClient["WebSocket Client"]
        end
    end

    subgraph Docker["Docker Network"]
        subgraph CodeServer["code-server<br/>Port: 8080"]
            VSCodeServer["VSCode Server"]
            WSPath["/home/coder/workspace"]
        end

        subgraph Backend["Backend<br/>Port: 8000"]
            FileService["File Service"]
            WSHandler["WebSocket Handler"]
        end

        subgraph SharedVolume["Shared Volume"]
            Workspace["/app/workspace"]
        end
    end

    CodeServerIframe -.-> VSCodeServer
    FileAPI --> FileService
    WSClient --> WSHandler

    MonacoComp --> FileAPI
    FileTreeComp --> FileAPI

    VSCodeServer --> WSPath
    FileService --> Workspace
    WSPath -.->|同一ボリューム| Workspace

    style EditorContainer fill:#F7F7F5,stroke:#E0DDD9
    style VSCodeMode fill:#D89968,stroke:#C17942
    style SimpleMode fill:#E8B088,stroke:#C17942
```

### 2.2 エディタモード比較

```mermaid
quadrantChart
    title エディタモード比較
    x-axis 低機能 --> 高機能
    y-axis 軽量 --> 重量
    quadrant-1 高機能・重量
    quadrant-2 高機能・軽量
    quadrant-3 低機能・軽量
    quadrant-4 低機能・重量

    "code-server (VSCode)": [0.85, 0.75]
    "Monaco Editor": [0.35, 0.25]
```

---

## 3. エディタモード設計

### 3.1 code-server モード（メイン）

#### 3.1.1 特徴

```mermaid
flowchart LR
    subgraph code-server特徴
        F1[フル VSCode] --> F1D[拡張機能サポート]
        F2[統合ターミナル] --> F2D[Bash実行可能]
        F3[Git統合] --> F3D[バージョン管理]
        F4[デバッガー] --> F4D[デバッグ機能]
        F5[検索/置換] --> F5D[高度な検索]
    end
```

#### 3.1.2 統合方法

**iframe埋め込み:**

```typescript
// src/frontend/src/components/editor/CodeServerEditor.tsx
interface CodeServerEditorProps {
  workspacePath: string;
  projectId: string;
}

export const CodeServerEditor: React.FC<CodeServerEditorProps> = ({
  workspacePath,
  projectId
}) => {
  const codeServerUrl = process.env.NEXT_PUBLIC_CODE_SERVER_URL || 'http://localhost:8080';
  const editorUrl = `${codeServerUrl}/?folder=/home/coder/workspace/${projectId}`;

  return (
    <iframe
      src={editorUrl}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      allow="clipboard-read; clipboard-write"
    />
  );
};
```

#### 3.1.3 ワークスペース共有

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant CodeServer as code-server
    participant Volume as Shared Volume
    participant Backend as Backend

    User->>Frontend: ファイル編集
    Frontend->>CodeServer: iframe経由で操作
    CodeServer->>Volume: /home/coder/workspace に保存

    Note over Backend,Volume: 同一ボリュームをマウント

    Backend->>Volume: /app/workspace から読取
    Backend-->>User: Claudeがファイル変更を検知
```

### 3.2 Monaco Editor モード（フォールバック）

#### 3.2.1 特徴

```mermaid
flowchart LR
    subgraph Monaco特徴
        M1[軽量] --> M1D[高速起動]
        M2[シンプル] --> M2D[基本編集機能]
        M3[シンタックス] --> M3D[コードハイライト]
        M4[API連携] --> M4D[ファイル同期]
    end
```

#### 3.2.2 実装

```typescript
// src/frontend/src/components/editor/MonacoEditor.tsx
import * as monaco from 'monaco-editor';

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ filePath, projectId }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const { content, updateFile } = useFileContent(projectId, filePath);

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current!, {
      value: content,
      language: getLanguageFromPath(filePath),
      theme: 'vs-dark',
      automaticLayout: true,
    });

    editor.onDidChangeModelContent(() => {
      const newContent = editor.getValue();
      updateFile(filePath, newContent);
    });

    editorRef.current = editor;
    return () => editor.dispose();
  }, [filePath]);

  return <div ref={containerRef} className="h-full w-full" />;
};
```

---

## 4. ファイル同期設計

### 4.1 ファイル同期フロー

```mermaid
sequenceDiagram
    participant Claude as Claude Agent
    participant Backend as Backend API
    participant Volume as Shared Volume
    participant CodeServer as code-server
    participant Monaco as Monaco Editor
    participant User as ユーザー

    rect rgb(240, 240, 240)
        Note over Claude,User: Claudeがファイル作成
        Claude->>Backend: Write Tool実行
        Backend->>Volume: ファイル保存
        Backend->>User: WebSocket通知

        alt code-serverモード
            CodeServer-->>Volume: ファイル変更を自動検知
            CodeServer-->>User: UI更新
        else Monacoモード
            User->>Monaco: ファイル再読込
            Monaco->>Backend: GET /api/files/content
            Backend->>Volume: ファイル読取
            Backend-->>Monaco: 内容返却
            Monaco-->>User: UI更新
        end
    end

    rect rgb(255, 250, 240)
        Note over Claude,User: ユーザーがファイル編集

        alt code-serverモード
            User->>CodeServer: ファイル編集
            CodeServer->>Volume: 保存
            Note over Backend,Volume: 同一ボリュームなので自動同期
        else Monacoモード
            User->>Monaco: ファイル編集
            Monaco->>Backend: POST /api/files/content
            Backend->>Volume: 保存
        end

        User->>Claude: 「変更を確認して」
        Claude->>Backend: Read Tool実行
        Backend->>Volume: ファイル読取
        Backend-->>Claude: 最新内容返却
    end
```

### 4.2 リアルタイム通知

```mermaid
flowchart TD
    subgraph WebSocket通知フロー
        A[Claudeがファイル操作] --> B{操作種別}

        B -->|Write| C[ファイル作成/更新]
        B -->|Edit| D[ファイル編集]
        B -->|Delete| E[ファイル削除]

        C --> F[WebSocket通知送信]
        D --> F
        E --> F

        F --> G{エディタモード}

        G -->|code-server| H[自動検知<br/>何もしない]
        G -->|Monaco| I[ファイル再読込]

        I --> J[UI更新]
    end

    style F fill:#D89968,stroke:#C17942
    style H fill:#7CB342,stroke:#558B2F
    style I fill:#E8B088,stroke:#C17942
```

### 4.3 WebSocketメッセージ定義

```typescript
// ファイル変更通知
interface FileChangeNotification {
  type: 'file_change';
  operation: 'create' | 'update' | 'delete';
  path: string;
  project_id: string;
  content?: string; // update時のみ
}

// クライアント処理
wsClient.on('message', (msg: FileChangeNotification) => {
  if (msg.type === 'file_change' && editorMode === 'monaco') {
    fileStore.handleFileChange(msg);
  }
  // code-serverモードは自動検知するので処理不要
});
```

---

## 5. 実装タスク

### 5.1 タスク一覧

```mermaid
gantt
    title Phase 3 実装スケジュール
    dateFormat YYYY-MM-DD
    section フロントエンド基盤
        Next.jsプロジェクト作成           :a1, 2025-12-21, 1d
        ディレクトリ構造構築              :a2, after a1, 1d
        型定義・Zustandストア             :a3, after a2, 1d
    section エディタ統合
        EditorContainerコンポーネント      :b1, after a3, 1d
        CodeServerEditorコンポーネント     :b2, after b1, 2d
        MonacoEditorコンポーネント         :b3, after b1, 2d
        FileTreeコンポーネント             :b4, after b3, 1d
    section ファイル同期
        ファイルAPIクライアント            :c1, after a3, 1d
        WebSocket統合（ファイル通知）      :c2, after c1, 2d
        リアルタイム更新実装              :c3, after c2, 1d
    section UI/UX
        レイアウト・スタイル              :d1, after b2, 2d
        エラーハンドリング                :d2, after d1, 1d
    section テスト
        動作確認・デバッグ                :e1, after d2, 2d
```

### 5.2 優先順位

```mermaid
flowchart TD
    subgraph 優先度: 高
        P1[1. Next.jsプロジェクト作成]
        P2[2. 基本レイアウト実装]
        P3[3. ファイルAPIクライアント]
        P4[4. Monaco Editor統合]
    end

    subgraph 優先度: 中
        M1[5. code-server統合]
        M2[6. FileTree実装]
        M3[7. WebSocket通知]
    end

    subgraph 優先度: 低
        L1[8. エラーハンドリング]
        L2[9. スタイル調整]
        L3[10. パフォーマンス最適化]
    end

    P1 --> P2 --> P3 --> P4
    P4 --> M1 --> M2 --> M3
    M3 --> L1 --> L2 --> L3

    style P1 fill:#E74C3C,stroke:#C0392B,color:#FFF
    style P2 fill:#E74C3C,stroke:#C0392B,color:#FFF
    style P3 fill:#E74C3C,stroke:#C0392B,color:#FFF
    style P4 fill:#E74C3C,stroke:#C0392B,color:#FFF
```

---

## 6. 技術仕様

### 6.1 フロントエンド技術スタック

```mermaid
classDiagram
    class 技術スタック {
        React: 18.3
        Next.js: 14.2
        TypeScript: 5.4
        Zustand: 4.5
        Monaco Editor: 0.50
        TailwindCSS: 3.4
    }
```

### 6.2 API エンドポイント

```mermaid
flowchart LR
    subgraph ファイルAPI
        A1["GET /api/files<br/>パラメータ: project_id, path"] --> A1D[ファイル一覧取得]
        A2["GET /api/files/content<br/>パラメータ: project_id, path"] --> A2D[ファイル内容取得]
        A3["POST /api/files/content<br/>ボディ: project_id, path, content"] --> A3D[ファイル書込]
        A4["DELETE /api/files/content<br/>パラメータ: project_id, path"] --> A4D[ファイル削除]
    end
```

### 6.3 環境変数

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_CODE_SERVER_URL=http://localhost:8080
```

### 6.4 ディレクトリ構造

```
src/frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── editor/
│   │   │   ├── EditorContainer.tsx       # エディタモード切替
│   │   │   ├── CodeServerEditor.tsx      # code-server iframe
│   │   │   ├── MonacoEditor.tsx          # Monaco Editor
│   │   │   ├── FileTree.tsx              # ファイルツリー
│   │   │   └── FileTreeItem.tsx          # ツリーアイテム
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx            # 3カラムレイアウト
│   │   │   ├── Header.tsx
│   │   │   └── ResizablePanel.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts               # WebSocket接続
│   │   ├── useFiles.ts                   # ファイル操作
│   │   └── useEditor.ts                  # エディタ状態
│   ├── stores/
│   │   ├── editorStore.ts                # エディタ状態管理
│   │   ├── fileStore.ts                  # ファイル状態管理
│   │   └── chatStore.ts                  # チャット状態管理
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts                 # Axiosクライアント
│   │       └── files.ts                  # ファイルAPI
│   └── types/
│       ├── file.ts
│       ├── editor.ts
│       └── index.ts
├── public/
│   └── icons/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── Dockerfile
```

---

## 7. 実装優先順位

### 7.1 Phase 3-1: フロントエンド基盤（1-2日）

```mermaid
stateDiagram-v2
    [*] --> Next.jsプロジェクト作成
    Next.jsプロジェクト作成 --> ディレクトリ構造作成
    ディレクトリ構造作成 --> 型定義実装
    型定義実装 --> Zustandストア実装
    Zustandストア実装 --> 基本レイアウト
    基本レイアウト --> [*]
```

**タスク:**
1. `npx create-next-app@latest frontend` 実行
2. ディレクトリ構造作成
3. TypeScript型定義（file.ts, editor.ts）
4. Zustandストア（editorStore, fileStore）
5. MainLayoutコンポーネント

### 7.2 Phase 3-2: Monaco Editor統合（2-3日）

```mermaid
stateDiagram-v2
    [*] --> MonacoEditorインストール
    MonacoEditorインストール --> MonacoEditorコンポーネント
    MonacoEditorコンポーネント --> FileTreeコンポーネント
    FileTreeコンポーネント --> ファイルAPIクライアント
    ファイルAPIクライアント --> ファイル読込/保存
    ファイル読込/保存 --> [*]
```

**タスク:**
1. `@monaco-editor/react` インストール
2. MonacoEditor.tsx実装
3. FileTree.tsx実装
4. API Client実装（Axios）
5. ファイル操作統合

### 7.3 Phase 3-3: code-server統合（1-2日）

```mermaid
stateDiagram-v2
    [*] --> CodeServerEditorコンポーネント
    CodeServerEditorコンポーネント --> iframe埋込実装
    iframe埋込実装 --> 接続確認
    接続確認 --> エラーハンドリング
    エラーハンドリング --> EditorContainer統合
    EditorContainer統合 --> [*]
```

**タスク:**
1. CodeServerEditor.tsx実装
2. iframe埋め込み
3. ヘルスチェック実装
4. エラー表示UI
5. EditorContainer.tsxでモード切替

### 7.4 Phase 3-4: WebSocket統合（1日）

```mermaid
stateDiagram-v2
    [*] --> WebSocketクライアント
    WebSocketクライアント --> ファイル変更通知
    ファイル変更通知 --> UI更新処理
    UI更新処理 --> [*]
```

**タスク:**
1. useWebSocket.ts拡張（ファイル通知対応）
2. fileStore更新処理
3. Monaco Editorリロード実装

### 7.5 Phase 3-5: UI/UXポリッシュ（1-2日）

```mermaid
stateDiagram-v2
    [*] --> スタイル調整
    スタイル調整 --> レスポンシブ対応
    レスポンシブ対応 --> エラーハンドリング
    エラーハンドリング --> ローディング表示
    ローディング表示 --> [*]
```

**タスク:**
1. TailwindCSSスタイル適用
2. レスポンシブデザイン
3. エラーバウンダリ
4. ローディングスピナー
5. 動作確認・デバッグ

---

## 8. 完成基準

### 8.1 機能要件

```mermaid
flowchart TD
    subgraph 完成基準
        C1[code-server起動可能] --> C1D[✓ iframeで表示]
        C2[Monaco Editorフォールバック] --> C2D[✓ code-server非接続時動作]
        C3[ファイルツリー表示] --> C3D[✓ プロジェクト構造表示]
        C4[ファイル読込/保存] --> C4D[✓ API経由で動作]
        C5[Claude連携] --> C5D[✓ ツール結果反映]
        C6[リアルタイム同期] --> C6D[✓ WebSocket通知動作]
    end

    style C1 fill:#7CB342,stroke:#558B2F
    style C2 fill:#7CB342,stroke:#558B2F
    style C3 fill:#7CB342,stroke:#558B2F
```

### 8.2 非機能要件

```mermaid
classDiagram
    class 非機能要件 {
        パフォーマンス: 初回ロード < 3秒
        レスポンシブ: モバイル対応
        エラーハンドリング: 適切なメッセージ表示
        セキュリティ: XSS対策済み
        アクセシビリティ: キーボード操作可能
    }
```

---

## 9. リスクと対策

### 9.1 リスク分析

```mermaid
quadrantChart
    title リスク分析マトリクス
    x-axis 低影響 --> 高影響
    y-axis 低確率 --> 高確率
    quadrant-1 高確率・高影響
    quadrant-2 高確率・低影響
    quadrant-3 低確率・低影響
    quadrant-4 低確率・高影響

    "code-server接続失敗": [0.75, 0.55]
    "ファイル同期ずれ": [0.65, 0.35]
    "パフォーマンス劣化": [0.45, 0.25]
    "CORS問題": [0.35, 0.65]
```

### 9.2 対策

```mermaid
flowchart LR
    subgraph リスク対策
        R1[code-server接続失敗] --> S1[Monaco自動切替]
        R2[ファイル同期ずれ] --> S2[手動リフレッシュボタン]
        R3[CORS問題] --> S3[プロキシ設定追加]
        R4[パフォーマンス劣化] --> S4[仮想スクロール実装]
    end

    style S1 fill:#7CB342,stroke:#558B2F
    style S2 fill:#7CB342,stroke:#558B2F
    style S3 fill:#7CB342,stroke:#558B2F
    style S4 fill:#7CB342,stroke:#558B2F
```

---

## 10. テスト計画

### 10.1 テストケース

```mermaid
flowchart TD
    subgraph テストシナリオ
        T1[code-server起動テスト]
        T2[Monaco起動テスト]
        T3[ファイル作成テスト]
        T4[ファイル編集テスト]
        T5[ファイル削除テスト]
        T6[リアルタイム同期テスト]
        T7[エラーハンドリングテスト]
    end

    T1 --> T2 --> T3 --> T4 --> T5 --> T6 --> T7
```

### 10.2 検証項目

```mermaid
classDiagram
    class 検証項目 {
        機能: 全機能動作確認
        パフォーマンス: ロード時間測定
        UI/UX: ユーザビリティ確認
        互換性: ブラウザ互換性
        セキュリティ: 脆弱性スキャン
    }
```

---

## 11. 次のステップ

```mermaid
flowchart LR
    subgraph 次のステップ
        N1[Phase 3完了] --> N2[Phase 4: チャット統合]
        N2 --> N3[Phase 5: 認証・権限]
        N3 --> N4[Phase 6: デプロイ]
    end

    style N1 fill:#D89968,stroke:#C17942
```

---

## 変更履歴

```mermaid
flowchart LR
    subgraph 変更履歴
        V10["v1.0 (2025-12-21)"] --> V10D["初版作成<br/>Phase 3設計完了"]
    end
```

---

**ドキュメント管理情報**

```mermaid
classDiagram
    class ドキュメント情報 {
        設計書バージョン: 1.0
        最終更新: 2025-12-21
        作成者: Claude Code
        レビューステータス: 🚧 レビュー待ち
        完成度: 100%
    }
```

**関連ドキュメント:**
- architecture-design.md
- frontend-design.md
- docker-design.md
- backend-design.md
