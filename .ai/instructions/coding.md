# コーディングルール

このファイルは、AI アシスタントがコードを生成・修正する際のルールを定義します。

## 1. 基本方針

### 1.1. コード品質

* **シンプルさ優先:** 複雑な実装よりも、シンプルで理解しやすいコードを優先
* **コンポーネントのコロケーション:** 関連ファイル（ビュー、ロジック、テストなど）は同じフォルダ内に配置
* **型安全性:** `any` 型の使用は原則禁止
* **ファイル行数:** 原則 500 行以内。超える場合はモジュール分割を検討
* **互換性の排除:** 古いコードとの互換性は維持せず、新しい方式に置き換え

### 1.2. 禁止事項

* 検証されていないライブラリや関数の使用
* 明示的に指示されていないコードの削除・上書き
* 許可なく技術スタック/UI/UX を変更すること

## 2. コードコメント

### 2.1. 基本ルール

* **形式:** JSDoc/docstring 形式を使用
* **同期:** コード修正時は関連するコメントも更新
* **整理:** 不要になったコメントは削除

### 2.2. Python コメント例

```python
def process_request(user_id: str, data: dict) -> dict:
    """
    リクエストを処理する

    Args:
        user_id: ユーザーID
        data: リクエストデータ

    Returns:
        処理結果の辞書

    Raises:
        ValueError: データが不正な場合
    """
    # 実装
    pass
```

### 2.3. TypeScript/JavaScript コメント例

```typescript
/**
 * ユーザーデータを更新する
 * @param userId - ユーザーID
 * @param updates - 更新データ
 * @returns 更新結果
 */
async function updateUser(userId: string, updates: UserUpdates): Promise<User> {
    // 実装
}
```

## 3. 環境変数・機密情報

### 3.1. 環境変数管理

* `.env.example` にサンプル値を記載
* 機密値は環境変数または Secret Manager を利用
* リポジトリに機密情報を含めない

### 3.2. 禁止事項

* `.env` ファイルへの機密情報の直接コミット（`.gitignore` に追加必須）
* ハードコードされたパスワード、APIキー、トークン

## 4. Python 固有のルール

### 4.1. コーディング規約

| ルール | 説明 |
|--------|------|
| PEP 8 | コーディングスタイルはPEP 8に準拠 |
| 型ヒント | 関数の引数・戻り値には型ヒントを記述 |
| async/await | 非同期処理はasync/awaitを使用 |
| エラーハンドリング | try-except で適切に処理 |

### 4.2. Python ベストプラクティス

```python
# OK: 型ヒントと適切なエラーハンドリング
from typing import Optional, List

async def get_users(limit: int = 100) -> List[dict]:
    try:
        result = await db.query("SELECT * FROM users LIMIT $1", limit)
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise
```

## 5. TypeScript/React 固有のルール

### 5.1. TypeScript

| ルール | 説明 |
|--------|------|
| strict mode | `strict: true` を有効化 |
| any禁止 | `any` 型は使用しない |
| Interface vs Type | 拡張性が必要な場合はInterface、それ以外はType |

### 5.2. React

| ルール | 説明 |
|--------|------|
| 関数コンポーネント | クラスコンポーネントは使用しない |
| Hooks | 状態管理はHooksを使用 |
| コロケーション | コンポーネントとテストを同一フォルダに配置 |

## 6. テストルール

### 6.1. 基本方針

* 全ての主要な関数・新機能にはユニットテストを記述
* テストカバレッジ: 80% 以上を目標

### 6.2. Python テスト

* **フレームワーク:** `pytest` を使用
* **配置:** `tests/` ディレクトリまたは対象モジュールと同一フォルダ
* **命名:** `test_{module_name}.py`

### 6.3. TypeScript/React テスト

* **フレームワーク:** Jest + React Testing Library を使用
* **配置:** テストファイルは対象コンポーネントと同一フォルダに配置
* **命名:** `{componentName}.test.tsx`

### 6.4. テスト記述形式

```typescript
describe('UserComponent', () => {
    it('ユーザー名が正しく表示される', () => {
        // テスト実装
    });

    it('ユーザーIDが空の場合エラーになる', () => {
        // テスト実装
    });
});
```

### 6.5. モック

* 外部サービスへの依存がある場合は必ずモックを使用
* データベースアクセスはテスト用DBまたはモックを使用

## 7. UI ルール

### 7.1. 基本方針

* **デザイン:** シンプルで直感的、使いやすいデザイン
* **レスポンシブ:** モバイルデバイスでの表示を考慮
* **変更承認:** UI/UX デザインの変更は事前に提案し承認を得る

### 7.2. スタイリング

* Tailwind CSS を優先使用
* カスタムスタイルは最小限に抑える

## 8. コードレビュー観点

### 8.1. チェックリスト

- [ ] パフォーマンスに問題はないか
- [ ] エラーハンドリングは適切か
- [ ] セキュリティは考慮されているか
- [ ] テストカバレッジは十分か
- [ ] コメントは適切か
- [ ] 命名規則に従っているか
- [ ] 型定義は適切か
