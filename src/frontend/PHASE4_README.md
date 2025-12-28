# Phase 4: UI/UX改善 - 実装ガイド

## 概要

Phase 4では、Web版Claude Codeに以下の4つの主要機能を実装しました。

1. **テーマシステム** - Light / Dark / Claude の3種類
2. **レスポンシブデザイン** - モバイル・タブレット・デスクトップ対応
3. **キーボードショートカット** - 主要機能の高速アクセス
4. **アクセシビリティ** - WCAG 2.1 Level AA準拠

## 新機能の使い方

### 1. テーマ変更

ヘッダー右上のテーマセレクターから選択できます。

- **Light**: 明るい背景でモダンなデザイン
- **Dark**: 暗い背景で目に優しいデザイン
- **Claude**: Claudeブランドカラーを使用したデザイン

設定は自動的にlocalStorageに保存されます。

### 2. キーボードショートカット

#### 主要ショートカット

| ショートカット | 機能 |
|--------------|------|
| `Ctrl/⌘ + K` | コマンドパレットを開く |
| `Ctrl/⌘ + B` | サイドバーの表示/非表示 |
| `Ctrl/⌘ + /` | キーボードショートカット一覧 |
| `Ctrl/⌘ + Enter` | メッセージを送信 |
| `Escape` | モーダル・パネルを閉じる |

#### コマンドパレット

`Ctrl/⌘ + K` で開くと、以下の操作が可能です。

- コマンド検索 (リアルタイムフィルタリング)
- 矢印キーで選択
- `Enter` で実行
- `Escape` で閉じる

利用可能なコマンド:
- サイドバー切替
- ファイルツリー切替
- テーマ変更 (Light/Dark/Claude)
- チャット履歴クリア

### 3. レスポンシブデザイン

#### ブレークポイント

- **モバイル** (~767px): サイドバーはオーバーレイ、チャットフルワイド
- **タブレット** (768px~1023px): サイドバー切替可能、チャット可変幅
- **デスクトップ** (1024px~): 3カラムレイアウト

#### モバイルでの操作

- ハンバーガーメニューでサイドバー表示
- タップでオーバーレイを閉じる
- スワイプジェスチャー対応（今後実装予定）

### 4. アクセシビリティ機能

#### キーボードナビゲーション

- `Tab`: 次の要素へフォーカス
- `Shift + Tab`: 前の要素へフォーカス
- `Enter`: 選択・実行
- `Escape`: キャンセル・閉じる
- 矢印キー: リスト内の移動

#### スクリーンリーダー対応

- すべてのインタラクティブ要素に適切な`aria-label`
- セマンティックなHTML構造
- フォーカス可能な要素の明確な表示

#### その他の配慮

- `prefers-reduced-motion`対応 (アニメーション削減)
- `prefers-contrast`対応 (高コントラスト)
- 十分なカラーコントラスト比
- タッチターゲットのサイズ最適化

## 開発者向け情報

### 新規追加ファイル

#### テーマシステム
```
src/frontend/src/styles/themes/
├── light.css              # Lightテーマ定義
├── dark.css               # Darkテーマ定義（既存）
└── claude.css             # Claudeテーマ定義（既存）
```

#### コンポーネント
```
src/frontend/src/components/common/
├── ThemeSelector.tsx      # テーマ選択ドロップダウン
├── CommandPalette.tsx     # コマンドパレット
└── ShortcutsHelp.tsx      # ショートカット一覧モーダル
```

#### フック
```
src/frontend/src/hooks/
├── useKeyboardShortcuts.ts  # キーボードショートカット管理
└── useMediaQuery.ts         # レスポンシブ対応フック
```

### カスタマイズ方法

#### テーマの追加

1. `src/frontend/src/styles/themes/` に新しいCSSファイルを作成
2. CSS変数を定義:
```css
:root[data-theme='custom'] {
  --color-primary: #YOUR_COLOR;
  --color-bg-primary: #YOUR_BG_COLOR;
  /* ... その他の変数 */
}
```
3. `globals.css` でインポート
4. `uiStore.ts` の `Theme` 型に追加

#### キーボードショートカットの追加

`useKeyboardShortcuts` フックを使用:

```typescript
useKeyboardShortcuts({
  shortcuts: [
    {
      key: 's',
      ctrlKey: true,
      description: 'Save file',
      action: () => saveFile(),
    },
  ],
});
```

#### レスポンシブブレークポイントの使用

```typescript
import { useIsMobile, useIsDesktop } from '@/hooks/useMediaQuery';

const isMobile = useIsMobile();
const isDesktop = useIsDesktop();
```

### テスト

#### アクセシビリティテスト

1. キーボードのみでの操作確認
2. スクリーンリーダー（NVDA/JAWSなど）での確認
3. Lighthouseでのスコア確認
4. axe DevToolsでの自動チェック

#### レスポンシブテスト

1. Chrome DevToolsのデバイスモード
2. 実機でのテスト（推奨）
3. 各ブレークポイントでの動作確認

## トラブルシューティング

### テーマが変更されない

- ブラウザのlocalStorageを確認
- `data-theme` 属性が正しく設定されているか確認
- ブラウザキャッシュをクリア

### キーボードショートカットが動作しない

- 他のブラウザ拡張機能との競合を確認
- フォーカスが適切な要素にあるか確認
- ブラウザのデフォルトショートカットとの衝突を確認

### レスポンシブレイアウトが崩れる

- CSS変数が正しく定義されているか確認
- Tailwindのブレークポイントと一致しているか確認
- ブラウザの互換性を確認

## パフォーマンス最適化

### 実装済み

- CSS変数によるテーマ切替（再レンダリング最小化）
- Zustandによる効率的な状態管理
- メモ化されたイベントハンドラー

### 今後の改善予定

- React.memoによるコンポーネント最適化
- 仮想スクロールの実装
- Code Splittingの最適化

## 参考資料

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Next.js App Router](https://nextjs.org/docs/app)

## ライセンス

このプロジェクトのライセンスに従います。
