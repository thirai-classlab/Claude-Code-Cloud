## モジュール別テンプレート参照
エージェントは、`MODULE` に応じて以下のテンプレートを参照して設計書を生成してください。テンプレートはこのリポジトリの次のディレクトリに格納されています:

`.ai/templates/`

### 基本テンプレート
- Apex トリガー: `apex_trigger.template.md`
- LWC コンポーネント: `lwc.template.md`
- Visualforce ページ: `visualforce.template.md`
- Aura コンポーネント: `aura.template.md`
- Flow / Process Builder: `flow.template.md`

### APEX クラス種別テンプレート（APEX_TYPE による選択）
MODULE=apex の場合、`APEX_TYPE` パラメータに応じて最適なテンプレートを選択:

| APEX_TYPE | テンプレート | 説明 | 識別方法 |
|-----------|-------------|------|----------|
| rest-api | `apex_rest_api.template.md` | REST API サービス | `@RestResource` アノテーション |
| batch | `apex_batch.template.md` | バッチ処理 | `Database.Batchable` インターフェース |
| schedulable | `apex_schedulable.template.md` | スケジューラ | `Schedulable` インターフェース |
| controller | `apex_controller.template.md` | コントローラ | VF/LWC用コントローラ、`@AuraEnabled` |
| handler | `apex_handler.template.md` | トリガーハンドラ | `*Handler`, `*TriggerHandler` |
| utility | `apex_utility.template.md` | ユーティリティ | ヘルパー/ユーティリティクラス |
| invocable | `apex_invocable.template.md` | Invocableアクション | `@InvocableMethod` アノテーション |
| test | `apex_test.template.md` | テストクラス | `@IsTest` アノテーション |
| general | `apex_class.template.md` | 汎用（種別不明時） | 上記に該当しない場合 |

**自動種別判定ルール:**
1. `@RestResource` → rest-api
2. `@IsTest` → test
3. `Database.Batchable` → batch
4. `Schedulable` → schedulable
5. `@InvocableMethod` → invocable
6. `@AuraEnabled` + Controller 命名 → controller
7. `*Handler` / `*TriggerHandler` → handler
8. `*Utils` / `*Utility` / `*Helper` → utility
9. 上記以外 → general

テンプレートは「仕様テンプレート」「実装手順（ステップ）」「注意事項/ガバナンス」の3部で構成されています。エージェントはテンプレートの必須項目を満たした上で、生成物（Markdown）を作成してください。OVERWRITE=false の場合はテンプレート適用案（差分）を返してください。

# 設計書生成プロンプト（改訂テンプレート）

このプロンプトは、チーム開発で設計書作成フローを標準化し、属人性を排除して AI を活用した効率化を図るためのテンプレートです。機能単位での設計書作成に利用します。
本改訂版では必須パラメータ、モジュール種別（trigger / apex / lwc / object / flow / other）、上書きポリシー、出力契約（Acceptance Criteria）を明示しています。エージェントは以下の契約に従って実際にファイルを作成・編集してください。

---

## 0. 前提・制約
- 最重要: チェックリスト、プログラムの処理、フローには必ず漏れなく網羅的に記載を行うこと。
- 事前に Serena/（SelenaMCP）を有効化・初期化してください。
- Salesforce 関連の機能であれば、Salesforce MCP を用いて関連情報の取得を必須とします（オブジェクト定義、Apex/LWC、トリガ等）。
- リポジトリ内の既存資料（`_design/`、`epics/`、`.ai/instructions/` の指示書、`_task-list/task-list.md`）を尊重し、矛盾があれば提案のうえで解消します。
 - GitHub リンク基点: `https://github.com/classlab-inc/cl-crm-salesforce`、既定ブランチ: `main`

---

## 1. 入力（変数） — 必須/任意を明記
必ず明示してください。エージェントは必須パラメータが与えられていない場合、生成を行わずに差分要求を返してください。

- FEATURE_NAME (必須): 機能名（例: SetIncentiveTrigger, LoginFormLWC）
- MODULE (必須): `trigger` | `apex` | `lwc` | `visualforce` | `object` | `flow` | `other`（出力先ディレクトリを決定する）
- APEX_TYPE (MODULE=apex時に推奨): `rest-api` | `batch` | `schedulable` | `controller` | `handler` | `utility` | `invocable` | `test` | `general`
  - 指定がない場合はソースコードから自動判定する（上記「自動種別判定ルール」参照）
- TARGET_PATH (任意だが推奨): 出力ファイルの相対パス（例: `doc/trigger/service-guide-set-incentive-trigger.md`）
   - 指定がない場合は `doc/<module>/<kebab(FEATURE_NAME)>.md` を自動設定する
- OVERWRITE (任意, デフォルト=false): 既存ファイルがある場合に上書きするか。`true` の場合は上書き。`false` の場合は差分提案を返す。
- RUN_LOCAL_SCAN (任意, デフォルト=true): リポジトリ内ソース走査を行う
- RUN_MCP (任意, デフォルト=false): Salesforce MCP で Describe を実行するか。Org 認証が必要な場合は明示的に credentials を渡してください。
- SALESFORCE (任意, デフォルト=true): Salesforce 関連かどうか（true の場合は `RUN_LOCAL_SCAN` と `RUN_MCP` を優先）
- EPIC_ID（任意）: 紐づくエピック ID（例: E20250820-001）
- CONTEXT（任意）: 追加の仕様・要件・背景リンク（URL や短い箇条書きで）

注: LWC を対象にする場合は `MODULE=lwc` とし、対象ファイルは `force-app/main/default/lwc/<componentName>/` を走査して、設計書にはコンポーネントの HTML/JS/API 及び公開プロパティを列挙してください。
注: Visualforce を対象にする場合は `MODULE=visualforce` とし、`force-app/main/default/pages/*.page` と関連コントローラ（Apex）の対応関係、使用コンポーネント、拡張クラス、標準/カスタムコントローラの利用を走査・反映してください。

---

## 2. 目的
- 多岐にわたるチーム開発における設計書作成フローの確立
- 属人性の排除と AI を用いた効率化
- 実装・運用時にあいまいさが残らないよう、「どこで」「どの条件で」「どのように」「どのレコードのどの項目が」「どのように変わるか」を機械可読かつ監査可能な粒度で明記する

1) 初期化
- Serena のメモリを読み込み、過去の決定事項を要約（最大5行）。
- 関連する `.ai/instructions/` 指示書と `doc/manual/DEVELOPMENT-GUIDE.md` を参照し、適用ルールを把握。

- 取得するフィールド情報は最低限: 「ラベル」「API参照名」「データ型（長さ/スケール/必須/一意/外部ID）」「参照先」「選択リスト値」。

   - 設計書を作成する際は、まず `doc/object/` 配下にあるオブジェクト定義ファイル（例: `doc/object/Account(Account).md`）を参照して、項目名・API 名・型・選択肢などを根拠として利用してください。
   - 参照できる定義が存在する場合は、設計書内の「関連データ設計」や「変更仕様マトリクス」に該当フィールドの出典を明記してください（例: `参照: doc/object/Account(Account).md`）。
   - 表記ルール（重要・厳守）: 設計書内でのオブジェクト名・項目名は「表示ラベル」を原則として記載し、必要に応じ API 名を括弧で併記すること（例: サービス案内（ServiceGuide__c）、発生インセンティブ（OccurrenceIncentive__c））。本ルールは本文、変更仕様マトリクス、関連データ設計、Mermaid 図のノードラベルにも適用すること。

- 4) 設計書の作成
- 指定のフォーマット（下記「4. 設計書の中身」）に沿って草案を生成。
    - 図は Mermaid（主に flowchart TD）で記述すること（ユースケース図だけでなく、必ず処理フロー図(flowchart TD)を追加する）。
    - 注: APEX トリガーおよび Flow の設計書では、詳細度の高い Mermaid の `flowchart TD` を必須とする。図中のノードや矢印には、該当する「個別処理」節への参照となるアンカー名を必ず紐付けてください（例: アンカー名 `trigger-entry`）。
       - ノードラベル内に HTML タグ（例: `<br/>`, `<br>`）を使用しないこと。GitHub の Mermaid 仕様ではタグがエラーの原因になります。
       - 改行が必要な場合は Mermaid のエスケープ改行（`\n`）を使用すること。
       - ノードラベル内に Markdown リンクを直接書かないこと。アンカー遷移は `click` 指令で実装すること。
- LWC を対象にする場合は、コンポーネントの公開 API（@api プロパティ）、イベント、外部依存（Apex 呼出し/Static Resource）を必ず列挙する。
   - フロー図は高レベルの流れ図に加え、ステップごとの詳細フロー（サブフロー）を用意する。各サブフローの起点ノードには必ずアンカー（Markdown ヘッダー）へのリンクを埋め、図中のノードや矢印注釈に \[詳細を見る\]\(#anchor-name\) の形式でリンクすること。
- 個別処理（ステップ）の節を設け、各節は以下を含むこと:
   - 見出し（タイトル）は日本語で記載すること。Mermaid の click 参照用に、半角英数・ハイフンのみの英小文字スラッグをアンカー名として併記すること（例: 「### 完了日変更時の営業日数再計算 (anchor: compute-business-days)」のように見出し末尾へ明記、または直下行に `Anchor: compute-business-days` を記載）。
   - 処理名（ヘッダー = Anchor 名）
   - 入力データ（項目・型）
   - 出力データ（項目・型）
   - 前提条件/事前チェック
   - 主要アルゴリズム・疑似コード（必要に応じて）
   - エラーケースとリカバリ（リトライ戦略、ロールバックの範囲）
   - 実行権限/セキュリティの考慮点
- すべての相対パスはリポジトリルートからの相対で記載。

5) 出力と保存（出力契約 — 必ず満たすこと）
- 出力先: 指定 `TARGET_PATH`（存在しない場合は `doc/<module>/<kebab(FEATURE_NAME)>.md` を作成）。
- 補助: 図表等は同モジュールディレクトリ配下に `assets/` を作るか、`doc/<module>/<kebab(FEATURE_NAME)>_assets/` に保存。
- エピック紐づきの場合、`epics/<epic>/requirements/` にリンクを追記（OVERWRITE=true の場合のみ自動追記）。
- 設計書リンクの付与（新規/更新対象ファイルに対して実施）:
   - 生成 URL: `https://github.com/classlab-inc/cl-crm-salesforce/blob/main/${TARGET_PATH}`
      - Apex (.cls/.trigger): `// Design Doc: <URL>` もしくは `/** Design Doc: <URL> */`
      - JavaScript (.js): `// Design Doc: <URL>`
      - HTML (.html): `<!-- Design Doc: <URL> -->`
      - XML メタデータ (.xml): `<!-- Design Doc: <URL> -->`
      - CSS (.css): `/* Design Doc: <URL> */`
- 目次の更新（自動/半自動）:
   - `doc/README.md` と `doc/<module>/README.md`（存在する場合）へ新規行を追加する。OVERWRITE=false の場合は差分提案を出力するのみ。
   - トリガー設計書の場合: `doc/trigger/README.md` のテーブルに新規エントリを追加する。

注意: ファイル作成/編集時は必ず YAML フロントマターを先頭に付与してください（例: title, feature_name, module, generated_at, source_files, overwrite）。自動処理や CI が取り込みやすくなります。

          目次更新の具体手順（手動/半自動で実行する場合）:
          1. 生成ファイルの存在を確認: `${TARGET_PATH}.md` がリポジトリに追加済みであること
          2. `doc/README.md` を開き、モジュール（例: Triggers, Objects）の該当セクションへ次の形式で1行を追加（リンクは相対パスで示す）
             - PR では目次更新の差分のみが正しく表示されるよう、生成ファイルと目次更新を同一コミットに含める
             - 既存の `DESIGN.md` 参照が残る場合は手順で整合性をとる（移行ポリシーを別途策定すること）
          3. モジュール別目次ファイル（`doc/<module>/README.md`）が存在する場合:
             - トリガー設計書の場合: `doc/trigger/README.md` のテーブルに新規エントリを追加
             - フォーマット: `| トリガー名 | 対象オブジェクト | 説明 | [open](xxx-trigger.md) |`
             - テーブルはアルファベット順でソート推奨

6) 完了チェック（Acceptance Criteria の検証）
- 生成/編集後に以下を検証して結果を出力すること:
   1. `${TARGET_PATH}` が作成または上書きされていること（OVERWRITE の値に従う）
   2. 設計書に必須セクション（改訂履歴/変更仕様マトリクス/プログラム概要/設計フロー/関連データ/データフロー/画面設計［LWC/Visualforce の場合必須］/プログラム仕様チェックリスト（実施すべきテスト一覧）/リリース手順/関連プログラム）が存在すること
   3. 関連ソースの先頭に設計書リンクコメントが追加されていること（編集対象に限る）
   4. `doc/README.md` および `doc/<module>/README.md` にエントリが追加または差分提案が生成されていること
   5. 未確定事項・リスクを Appendix に列挙していること
   6. チェックリスト、プログラムの処理、フローが漏れなく網羅的に記載されていること（不足があれば補完または保留理由を明記）。

出力結果は「作成済みファイル一覧」「編集差分(パッチ)」「未確定事項リスト」を含めてください。

---

7) 直近生成仕様書の網羅チェック（最後に生成したドキュメントを徹底検証）
- 対象特定:
   - 原則 `${TARGET_PATH}` を対象とする。
   - 未指定時は `doc/` 配下で直近更新の Markdown（`.md`）を対象とする。
- 構文/体裁チェック:
   - YAML フロントマターの必須キーが存在する: `title`, `feature_name`, `module`, `generated_at`, `source_files`（配列）, `overwrite`。
   - 必須セクションが全て存在: 概要/設計フロー/変更仕様マトリクス/関連データ設計/データフロー/個別処理詳細/セキュリティ/リリース手順/関連プログラム/参考リンク/Appendix。
   - 見出しは日本語のタイトル＋英小文字スラッグのアンカー併記（例: `### 完了日変更処理 (anchor: compute-business-days)` もしくは直下行に `Anchor: compute-business-days`）。
- Mermaid/アンカー検証:
   - 少なくとも 1 つの `flowchart TD` が存在し、主要パスを表現している。
   - Mermaid 図のノード/エッジに `click` 指令でアンカー参照があり、参照先アンカーが本文中に実在する（404 不可）。
   - 図中のノードラベルに Markdown リンクや生の改行は含めない（click 指令で代替）。
   - 図中ラベルの表記は「表示ラベル優先＋必要に応じ API 名を括弧」で統一。
- 表記ルール（表示ラベル優先）の順守:
   - 本文、表、図中すべてでオブジェクト/項目は表示ラベルで表記し、必要に応じて API 名を括弧で併記している（例: サービス案内（ServiceGuide__c））。
   - 「変更仕様マトリクス」「関連データ設計」の列でも同様の表記となっている。
- 変更仕様マトリクスの充足:
   - 各行が原子操作になっている（Where/When/How/Which Record/Which Fields/Before→After が埋まる）。
   - 主要な処理分岐・非同期化・再計算・外部参照のすべてが行として落ちている。
- 関連データ設計の整合:
   - 項目ごとに「ラベル/API 参照名/型（長さ・スケール・必須・一意・外部ID・参照先・選択肢）」が網羅。
   - 参照元（`doc/object/<Object(Label)>.md`）への出典が明記されている。不足があれば「定義書の作成/更新提案」を Appendix に含める。
- ソースリンクと索引:
   - フロントマターの `source_files` に列挙された各ソースの最上部に「Design Doc」コメントリンクが存在。
   - `doc/README.md` と `doc/<module>/README.md` に対象設計書へのエントリが追加済み（または差分提案出力済み）。
- セキュリティ/ガバナンス:
   - CRUD/FLS/Sharing の要件が明記され、非同期/トランザクション境界が図および本文に一致している。
   - エラー時のリトライ/ロールバック方針が各ステップに記載。
- 未確定事項の明記:
   - Appendix に未決事項・前提・リスク・TODO が列挙され、フォローアップ手順が添えられている。
- 期待する出力（本チェックの結果）:
   - 各項目について PASS/FAIL を短く列挙し、FAIL 項目には修正アクションを箇条書きで提示する。
   - 必要に応じて修正パッチ案（差分）を出力する。

## 4. 設計書の中身（必須セクション）

1. 変更仕様マトリクス（どこで/条件/どう/どのレコード/どの項目/どう変わる）
   - 目的: 実装/テスト/監査が可能な精度で変更仕様を一意に定義する
   - 記載ルール: 各行が「1つの変更単位（原子操作）」を表すこと
   - 表記ルール: 「対象オブジェクト」「対象項目」は表示ラベルを優先し、必要に応じて API 名を（括弧）で併記すること（例: サービス案内（ServiceGuide__c）、発生インセンティブ（OccurrenceIncentive__c））。
   - テンプレート（列は削除せず未使用は「-」とする）:

   | 発生場所(Where) | 発火タイミング/条件(When/If) | 方式(How: Apex/LWC/Flow/Trigger/Formula等) | 対象オブジェクト | 対象レコード特定条件(SOQL/疑似式) | 対象項目(Label/API/型) | 変更内容(Before→After/算出式) | 権限要件(CRUD/FLS) | 例外時動作/リトライ | ログ/監査 | 備考 |
   |---|---|---|---|---|---|---|---|---|---|---|
   | 例: LWC[foo] 画面保存 | Saveクリック かつ 入力X>0 | Apex クラス FooService.update | Account | Id={画面のAccountId} | 年商/AnnualRevenue(Number) | Before:任意 → After:入力X×係数Y | Update+FLS:AnnualRevenue編集可 | 失敗時に再試行1回、ユーザ通知 | Platform Event出力 | - |

   ```
   /* Example input (edit before use):
   FEATURE_NAME: SetIncentiveTrigger
   MODULE: trigger
   TARGET_PATH: doc/trigger/service-guide-set-incentive-trigger.md
   OVERWRITE: true
   RUN_LOCAL_SCAN: true
   RUN_MCP: false
   */
   ```
      3. 非同期/キュー/外部API 呼び出しフロー — トランザクション境界と非同期境界を明示
   - フロー図のノードや矢印には、該当する「個別処理」節への Markdown アンカーリンクを入れること（例: 図中から各節へのリンクを張る）
     - 例（flowchart TD; ノード改行は `\\n` で表現）:
       ```mermaid
       flowchart TD
        U[User] --> C[LWC Component]
          C --> S[Apex Service]
          S --> SF[Salesforce DB]
          click U "#trigger-entry" "詳細を見る"
          click C "#trigger-entry-collects" "詳細を見る"
          click S "#calculate-incentive" "詳細を見る"
          click SF "#persist-results" "詳細を見る"
          %% 簡易表記: LWC が保存をトリガーし、Apex サービスが DB を更新するフロー
       ```
      /* Minimal example input to run generation (edit before use) */
      FEATURE_NAME: SetIncentiveTrigger
      MODULE: trigger
      TARGET_PATH: doc/trigger/service-guide-set-incentive-trigger.md
      OVERWRITE: true
      ```
 
2. 画面設計（LWC/Visualforce の場合は必須、それ以外は任意）
   - 目的: 画面レイアウト、入力/表示項目、状態遷移、操作とアクションの対応、エラーメッセージ、レスポンシブ/アクセシビリティを明確化
   - 記載項目（最低限）:
     - 画面構成（領域/コンポーネント階層/コンテナ）
     - 入力/表示項目一覧（ラベル/（API 名）/型/必須/初期値/バリデーション/権限による表示制御）
     - アクションとイベント（ボタン/リンク/ショートカット）→ 呼び出し先（Apex/ナビゲーション/イベント）対応表
     - 画面状態と遷移（ローディング/編集/保存/エラー/空状態）
     - エラーハンドリングとユーザ通知（トースト/メッセージ領域/ダイアログ）
     - レスポンシブ対応・i18n・アクセシビリティ（ARIA/キーボード操作）
     - Mermaid 図: 任意（flowchart TD 推奨）。ノード/エッジには本文アンカー参照（click 指令）を付与。

3. プログラム仕様チェックリスト（実施すべきテスト一覧 — リリースチェックではない）
   - 目的: 必要なテスト観点を網羅し、ユニット/統合/E2E/セキュリティ/アクセシビリティを漏れなく実施する
   - 例項目: 入力バリデーション/イベント発火/権限・FLS/CRUD/SOQL 条件/エラー時のUI/非同期完了待ち/境界値/パフォーマンス/アクセシビリティ/多言語
- 参考リンク（内部/外部）
- 生成に使用したコマンド/メモ（Serena メモリへも転記推奨）

---

## 実行用ひな型プロンプト（必須パラメータを含む例）
以下のブロックを編集して利用してください。エージェントはこの形式の入力を必須とします。※ `OVERWRITE` を true にする場合は特に注意：既存コンテンツの差分を必ず提示してください。

```
/**
FEATURE_NAME: SetIncentiveTrigger
MODULE: trigger
TARGET_PATH: doc/trigger/service-guide-set-incentive-trigger.md
OVERWRITE: true
RUN_LOCAL_SCAN: true
RUN_MCP: false
SALESFORCE: true
EPIC_ID: E20250820-001
CONTEXT: 自動インセンティブ設定 / API 自動申込
ACTIONS: [generate_md, add_code_header, update_indexes]
ACCEPTANCE: [file_exists(TARGET_PATH), header_added(force-app/main/default/triggers/SetIncentiveTrigger.trigger), index_entries_updated]
*/

目的: 機能「${FEATURE_NAME}」の設計書を作成する。
前提: Serena を有効化済み。Salesforce 関連=${SALESFORCE}。EPIC_ID=${EPIC_ID|なし}。
出力先: ${TARGET_PATH|doc/<module>/${kebab(FEATURE_NAME)}/}

やってほしいこと:
1) 関連情報の収集（`RUN_LOCAL_SCAN` が true の場合はリポジトリ走査、`RUN_MCP` が true の場合は Describe を実行）
2) 既存資産の相対パス列挙（LWC の場合は component の HTML/JS/meta を列挙）
3) 「変更仕様マトリクス」を作成し、全変更単位を列挙（Where/When/How/Which Record/Which Fields/Before→After）
4) 「関連データ設計」の項目一覧に、関係する項目の「ラベル/API参照名/型（長さ・スケール・必須・一意・外部ID・参照先・選択肢）」を表形式で網羅（MCP 実行不可時はローカルメタから推定して注記）
5) 「設計書の中身」全セクションを満たす Markdown を TARGET_PATH に作成（Mermaid 可）
6) 指定されたソースファイルの最上部へ設計書リンクを追加（例: `// Design Doc: <repo-url>/<TARGET_PATH>`）
7) `doc/README.md` と `doc/<module>/README.md` にエントリを追加または差分提案を出力（OVERWRITE に依存）
8) 生成後に Acceptance Criteria を検証し、結果（作成ファイル一覧/編集差分/未確定事項）を出力

制約:
- 既存のリポジトリ構成/命名規則に従う
- セキュリティ（CRUD/FLS/Sharing）とガバナ制限を考慮
- 可能な限り再利用・分離（責務分割）を優先

```

---

## 5. 受け入れ基準（成功条件）
- 必須セクション（1〜7）が欠落なく埋まっている。
- 「変更仕様マトリクス」に、全ての変更単位が「どこで/どの条件で/どのように/どのレコード/どの項目/どう変わる」まで具体的に記載されている。
- 「関連データ設計」に、関係する全項目の「ラベル/型/API参照名（必要に応じて長さ/スケール/必須/一意/外部ID/参照先/選択肢）」が表形式で網羅されている。
- 主要フロー図が含まれ、パス/依存/権限の整合性が取れている。
- Salesforce の場合、MCP による客観情報が反映されている（Describe/ソース走査結果）。
- リリース手順が具体的かつ実行可能。
- LWC/Visualforce の場合、画面設計セクションが存在し、表記ルール（表示ラベル優先＋API名併記）とアンカー/クリック参照ルールに準拠している。
- プログラム仕様チェックリスト（実施すべきテスト一覧）が存在し、テスト観点が網羅されている。
- 対象プログラムの先頭に設計書への GitHub リンクコメントが追加されている。

---

## 6. 出力ファイル
- `${TARGET_PATH}.md`（必須）
- `${TARGET_PATH}_assets/` または `doc/<module>/assets/`（任意、図版や画像を格納）

---

## 7. 実行用ひな型プロンプト
以下のブロックを編集して利用してください。

```
目的: 機能「${FEATURE_NAME}」の設計書を作成する。
前提: Serena を有効化済み。Salesforce 関連=${SALESFORCE}。EPIC_ID=${EPIC_ID|なし}。
出力先: ${TARGET_PATH|doc/<module>/${kebab(FEATURE_NAME)}/}

やってほしいこと:
1) 関連情報の収集（Salesforce の場合は MCP 必須: オブジェクトDescribe、Apex/LWC/Trigger 走査）
2) 既存資産の相対パス列挙
3) 「変更仕様マトリクス」を作成し、全変更単位を列挙（Where/When/How/Which Record/Which Fields/Before→After）
4) 「関連データ設計」の項目一覧に、関係する項目の「ラベル/API参照名/型（長さ・スケール・必須・一意・外部ID・参照先・選択肢）」を表形式で網羅
5) 「設計書の中身」全セクションを満たす DESIGN.md を生成（Mermaid 可）
6) プログラム仕様チェックリスト（実施すべきテスト一覧）の具体化
7) 不明点/リスクの明記
8) 対象プログラムの最上部に設計書の GitHub リンク（`https://github.com/classlab-inc/cl-crm-salesforce/blob/main/${TARGET_PATH}/DESIGN.md`）をコメント形式で追記

制約:
- 既存のリポジトリ構成/命名規則に従う
- セキュリティ（CRUD/FLS/Sharing）とガバナ制限を考慮
- 可能な限り再利用・分離（責務分割）を優先
```

---

## 8. 備考
- エピック配下で利用する場合は `epics/<epic-id>-<slug>/requirements/` からのリンク付けを推奨。
- 設計変更を伴う提案は、`notes/` や Serena メモリ（`epic:<id>:decisions`）にも記録してください。
- 旧 `_design/` は非推奨です。今後は `doc/` 配下に設計書を配置してください。
