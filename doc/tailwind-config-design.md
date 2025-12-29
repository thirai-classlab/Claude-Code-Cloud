# Tailwind CSS設定設計書

## 概要

Pattern 09 v2（Linear Style）に基づいたTailwind CSS設定の設計書です。

> **実装ステータス: 完了**
>
> この設計書に記載されたすべての設定は `src/frontend/tailwind.config.ts` および `src/frontend/src/app/globals.css` に実装済みです。実装には以下の追加機能が含まれています:
> - レガシー互換性のための `primary` カラー変数
> - `boxShadow` のCSS変数参照
> - 複数テーマファイル（linear, dark, light, claude）のサポート
> - High contrast mode対応

---

## 1. tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Background
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)',
        },
        // Text
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        // Border
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
        },
        // Syntax
        syntax: {
          keyword: 'var(--syntax-keyword)',
          function: 'var(--syntax-function)',
          string: 'var(--syntax-string)',
          comment: 'var(--syntax-comment)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4' }],
        'sm': ['12px', { lineHeight: '1.5' }],
        'base': ['13px', { lineHeight: '1.5' }],
        'md': ['14px', { lineHeight: '1.6' }],
        'lg': ['15px', { lineHeight: '1.6' }],
      },
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
      },
      width: {
        'sidebar': '220px',
        'chat': '860px',
      },
      height: {
        'header': '48px',
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 2. CSS Variables（globals.css）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './themes/linear.css';

@layer base {
  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }

  html,
  body {
    max-width: 100vw;
    overflow-x: hidden;
    font-family: var(--font-sans);
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  /* Focus styles */
  *:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
}

@layer components {
  /* Button variants */
  .btn {
    @apply px-3 py-1.5 rounded-md text-base font-medium transition-all duration-fast;
  }

  .btn-default {
    @apply bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-secondary;
  }

  .btn-primary {
    @apply bg-accent text-white hover:bg-accent-hover;
  }

  .btn-ghost {
    @apply border border-border bg-bg-tertiary text-text-primary hover:bg-bg-hover;
  }

  /* Navigation */
  .nav-item {
    @apply flex items-center gap-2.5 px-2.5 py-2 rounded-md text-text-secondary text-base cursor-pointer transition-all duration-fast;
  }

  .nav-item:hover {
    @apply bg-bg-hover text-text-primary;
  }

  .nav-item.active {
    @apply bg-bg-hover text-text-primary;
  }

  .nav-indicator {
    @apply w-1.5 h-1.5 rounded-full bg-text-tertiary;
  }

  .nav-item.active .nav-indicator {
    @apply bg-accent;
  }

  /* Message */
  .message {
    @apply mb-5 p-4 rounded-lg transition-colors duration-fast;
  }

  .message:hover {
    @apply bg-bg-secondary;
  }

  /* Code block */
  .code-block {
    @apply bg-bg-secondary border border-border-subtle rounded-lg my-3 overflow-hidden;
  }

  .code-header {
    @apply flex justify-between items-center px-3 py-2 bg-bg-tertiary border-b border-border-subtle;
  }

  .code-content {
    @apply p-3.5 font-mono text-sm leading-normal overflow-x-auto text-text-secondary;
  }

  /* Input */
  .input-wrapper {
    @apply flex items-end gap-2.5 bg-bg-secondary border border-border rounded-xl px-3.5 py-3 transition-all duration-normal;
  }

  .input-wrapper:focus-within {
    @apply border-accent;
  }
}

@layer utilities {
  /* Text utilities */
  .text-balance {
    text-wrap: balance;
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 3. テーマファイル（themes/linear.css）

```css
/* Linear Style Theme - Pattern 09 v2 */
:root,
[data-theme='linear'],
[data-theme='dark'] {
  /* Background */
  --bg-primary: #09090b;
  --bg-secondary: #0f0f11;
  --bg-tertiary: #18181b;
  --bg-hover: #1f1f23;

  /* Text */
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #52525b;

  /* Accent */
  --accent: #5e5ce6;
  --accent-hover: #6e6ce8;
  --accent-muted: rgba(94, 92, 230, 0.15);

  /* Border */
  --border: #27272a;
  --border-subtle: #1c1c1e;

  /* Syntax Highlighting */
  --syntax-keyword: #ff7b72;
  --syntax-function: #d2a8ff;
  --syntax-string: #a5d6ff;
  --syntax-comment: #8b949e;

  /* Font */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;

  /* Shadows (minimal for this theme) */
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;

  /* Sizes */
  --sidebar-width: 220px;
  --header-height: 48px;
  --chat-max-width: 860px;
}
```

---

## 4. カラーパレット視覚化

```
Background Scale:
┌─────────────────────────────────────────────────────────────┐
│  #09090b    #0f0f11    #18181b    #1f1f23                   │
│  primary    secondary  tertiary   hover                     │
│  ████████   ████████   ████████   ████████                  │
└─────────────────────────────────────────────────────────────┘

Text Scale:
┌─────────────────────────────────────────────────────────────┐
│  #fafafa    #a1a1aa    #52525b                              │
│  primary    secondary  tertiary                             │
│  ████████   ████████   ████████                             │
└─────────────────────────────────────────────────────────────┘

Accent:
┌─────────────────────────────────────────────────────────────┐
│  #5e5ce6    #6e6ce8    rgba(94,92,230,0.15)                │
│  DEFAULT    hover      muted                                │
│  ████████   ████████   ████████                             │
└─────────────────────────────────────────────────────────────┘

Syntax:
┌─────────────────────────────────────────────────────────────┐
│  #ff7b72    #d2a8ff    #a5d6ff    #8b949e                  │
│  keyword    function   string     comment                   │
│  ████████   ████████   ████████   ████████                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Tailwindクラス対応表

### 背景色

| CSS Variable | Tailwind Class |
|-------------|----------------|
| `--bg-primary` | `bg-bg-primary` |
| `--bg-secondary` | `bg-bg-secondary` |
| `--bg-tertiary` | `bg-bg-tertiary` |
| `--bg-hover` | `bg-bg-hover` |

### テキスト色

| CSS Variable | Tailwind Class |
|-------------|----------------|
| `--text-primary` | `text-text-primary` |
| `--text-secondary` | `text-text-secondary` |
| `--text-tertiary` | `text-text-tertiary` |

### アクセント

| CSS Variable | Tailwind Class |
|-------------|----------------|
| `--accent` | `bg-accent`, `text-accent`, `border-accent` |
| `--accent-hover` | `bg-accent-hover` |
| `--accent-muted` | `bg-accent-muted` |

### ボーダー

| CSS Variable | Tailwind Class |
|-------------|----------------|
| `--border` | `border-border` |
| `--border-subtle` | `border-border-subtle` |

---

## 6. 使用例

### Button

```jsx
// Default button
<button className="btn btn-default">
  Settings
</button>

// Primary button
<button className="btn btn-primary">
  New Chat
</button>

// Ghost button
<button className="btn btn-ghost">
  Cancel
</button>
```

### Navigation Item

```jsx
<div className={`nav-item ${isActive ? 'active' : ''}`}>
  <span className="nav-indicator" />
  <span>Project Alpha</span>
  <span className="ml-auto text-xs text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
    I
  </span>
</div>
```

### Message

```jsx
<div className="message">
  <div className="flex items-center gap-2.5 mb-2">
    <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold">
      C
    </div>
    <span className="text-base font-semibold text-text-primary">Claude</span>
    <span className="text-sm text-text-tertiary">12:34</span>
  </div>
  <div className="text-text-secondary text-md leading-relaxed pl-10">
    {content}
  </div>
</div>
```

### Code Block

```jsx
<div className="code-block">
  <div className="code-header">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-sm bg-accent" />
      <span className="text-sm text-text-tertiary font-mono">auth.py</span>
    </div>
    <button className="btn btn-default text-sm">Copy</button>
  </div>
  <pre className="code-content">
    <code>{code}</code>
  </pre>
</div>
```

---

## 7. 移行ガイド

### 既存テーマからの変更点

| 旧設定 | 新設定 |
|-------|-------|
| `--color-primary` | `--accent` |
| `--color-bg-primary` | `--bg-primary` |
| `--color-text-primary` | `--text-primary` |
| `--color-border` | `--border` |

### 移行手順

1. `tailwind.config.ts`を更新
2. `globals.css`にCSS変数を追加
3. `themes/linear.css`を作成
4. 既存コンポーネントのクラス名を更新
5. テーマプロバイダーの`data-theme`を`linear`に変更

---

## 8. 実装ステータス

**ステータス: 全設定実装完了**

実装日: 2024年12月

### 8.1 実装ファイル

| 設計項目 | 実装ファイル | 状態 |
|---------|-------------|------|
| Tailwind設定 | `src/frontend/tailwind.config.ts` | 完了 |
| グローバルCSS | `src/frontend/src/app/globals.css` | 完了 |
| Linearテーマ | `src/frontend/src/styles/themes/linear.css` | 完了 |

### 8.2 設計と実装の差分

実装では設計書の内容に加えて、以下の追加・変更が行われています:

| 項目 | 設計 | 実装 |
|------|------|------|
| レガシーカラー | なし | `primary`, `primary-light`, `primary-dark` を追加 |
| boxShadow | 未定義 | `shadow-sm`, `shadow-md`, `shadow-lg` をCSS変数で定義 |
| テーマ数 | 1（linear） | 4（linear, dark, light, claude） |
| アクセシビリティ | 未記載 | High contrast mode、Reduced motion対応を追加 |
| レガシー変数 | なし | `--color-*` 形式の後方互換性変数を追加 |

### 8.3 テーマファイル構成

```
src/frontend/src/styles/themes/
├── linear.css    # メインテーマ（Pattern 09 v2）
├── dark.css      # ダークテーマ
├── light.css     # ライトテーマ
└── claude.css    # Claudeブランドテーマ
```

### 8.4 実装済みCSSコンポーネントクラス

globals.cssの`@layer components`で定義済み:

| クラス名 | 用途 |
|---------|------|
| `.btn` | ボタン共通スタイル |
| `.btn-default` | デフォルトボタン |
| `.btn-primary` | プライマリボタン |
| `.btn-ghost` | ゴーストボタン |
| `.nav-item` | ナビゲーション項目 |
| `.nav-indicator` | ナビゲーションインジケーター |
| `.message` | メッセージコンテナ |
| `.code-block` | コードブロック |
| `.code-header` | コードブロックヘッダー |
| `.code-content` | コードブロック本文 |
| `.input-wrapper` | 入力フィールドラッパー |
