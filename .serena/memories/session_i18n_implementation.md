# i18n（国際化）実装完了

## 概要
フロントエンドの表示言語を日本語と英語で切り替えられる機能を実装しました。

## 実装日
2025-12-31

## 技術スタック
- react-i18next: React向けi18nライブラリ
- i18next: コア国際化フレームワーク
- i18next-browser-languagedetector: ブラウザ言語検出

## 作成・変更ファイル

### 新規作成
| ファイル | 説明 |
|---------|------|
| `src/frontend/src/locales/ja/common.json` | 日本語翻訳ファイル |
| `src/frontend/src/locales/en/common.json` | 英語翻訳ファイル |
| `src/frontend/src/lib/i18n/index.ts` | i18n設定・初期化 |
| `src/frontend/src/components/common/LanguageSelector.tsx` | 言語切り替えドロップダウン |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/frontend/src/stores/uiStore.ts` | language状態とsetLanguageアクション追加 |
| `src/frontend/src/app/providers.tsx` | I18nextProvider追加 |
| `src/frontend/src/components/layout/Header.tsx` | LanguageSelector追加、翻訳適用 |
| `src/frontend/src/components/layout/Sidebar.tsx` | 翻訳適用 |
| `src/frontend/src/app/login/page.tsx` | 翻訳適用 |
| `src/frontend/src/app/register/page.tsx` | 翻訳適用 |
| `src/frontend/src/components/pages/HomePage.tsx` | 翻訳適用 |
| `src/frontend/src/components/chat/MessageInput.tsx` | 翻訳適用 |
| `src/frontend/src/components/project/CreateProjectModal.tsx` | 翻訳適用 |

## 翻訳キー構造
```json
{
  "app": { "title", "description" },
  "nav": { "home", "projects", "settings", "backToHome" },
  "modal": { "newProject", "projectType", ... },
  "auth": { "login", "logout", "register", ... },
  "validation": { "emailRequired", "emailInvalid", ... },
  "project": { "projects", "newProject", ... },
  "session": { "session", "sessions", "newSession" },
  "sidebar": { "openSidebar", "closeSidebar" },
  "chat": { "placeholder", "send", "thinking" },
  "common": { "loading", "error", "save", "cancel", ... },
  "settings": { "language", "theme" }
}
```

## 使用方法
1. ヘッダー右側の言語セレクタをクリック
2. 日本語またはEnglishを選択
3. UIが即座に切り替わる
4. 言語設定はlocalStorageに永続化

## 新しいコンポーネントでの使用
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <div>{t('common.save')}</div>;
};
```

## ビルド・テスト結果
- TypeScript型チェック: Pass
- Next.js ビルド: Pass
- Docker再ビルド: 完了
