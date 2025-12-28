# createObjectDoc.prompt.md

目的
- リポジトリの標準メタデータ（`force-app/main/default/objects`）を元に、オブジェクト設計書（`doc/objects/*.md`）を自動生成するための対話プロンプト。

対話の流れ（要件ベース）

1) メタデータのダウンロード有無を確認する
- 質問: 「ローカルにオブジェクトメタ（`force-app/main/default/objects`）はダウンロードされていますか？ (yes/no)」
- ユーザが `yes` の場合は 2) へ進む。
- `no` の場合は 1.1 に進む。

1.1) メタ未取得時の案内（manifest がある前提）
- 説明: manifest/all_object.xml を使って SFDX でメタを取得することを提案します。組織へのログインが必要です（例: `sfdx auth:web:login`）。
- 推奨コマンド（ソース形式プロジェクト）:

```bash
# 例: ソース形式プロジェクトで manifest から取得
sfdx force:source:retrieve -x manifest/all_object.xml
```

- 代替（MDAPI 形式を使う場合の例）:

```bash
# 例: MDAPI 形式で取得して展開する手順
sfdx force:mdapi:retrieve -k manifest/all_object.xml -r ./mdapipkg && unzip ./mdapipkg/unpackaged.zip -d ./mdapipkg
```

- 注意: 上記コマンドは org への認証が済んでいることを前提とします。

2) 生成範囲のヒアリング（全件 or 個別）
- 質問: 「全てのオブジェクトの仕様書を出力しますか？（yes）個別指定しますか？（no）」
- 回答が `yes` の場合は 3.a に進む。
- 回答が `no` の場合は 2.b に進む。

2.a) 全件出力（実行案内）
- 実行コマンド例:

```bash
python3 ai_scripts/generate_all_object_docs.py --meta-path force-app/main/default/objects --out-dir doc/objects
```

- 補足: 実行後に `doc/objects/` 以下へ各オブジェクトの Markdown が生成されます。

2.b) 個別出力（オブジェクトを指定してもらう）
- 質問: 「生成したいオブジェクトの API 名をカンマ区切りで入力してください（例: MoveIn__c,ServiceGuide__c,Account）」
- ユーザから API 名を受け取ったら、各 API 名について次のコマンドを実行することを提案します（例は `CXFields__c`）：

```bash
python3 ai_scripts/generate_object_doc.py CXFields__c --meta-path force-app/main/default/objects --out-dir doc/objects
```

- 複数指定はカンマでループ実行するスクリプトを推奨します。

3) 生成後の確認ポイント
- 生成ファイル: `doc/objects/<API>(<Label>).md` が作成されていること
- ドキュメント先頭: タイトル（API(ラベル)）、取得元（`force-app/main/default/objects/<Object>`）、目次、概要が正しいこと
- テーブル内コード表示: 単一行はバッククォート、複数行は `<code>...<br>...</code>` の形式で崩れていないこと

4) 問題対応の案内
- 表示崩れや不足がある場合は、該当オブジェクト名を伝えてもらい個別に再生成・スクリプト修正を行う
- 生成を自動化したい場合は、GitHub Actions へ組み込むワークフローの雛形（PR 時に自動生成・差分チェックなど）を作成する提案を行う

出力メッセージ（テンプレ）
- メタ未取得時: "manifest/all_object.xml を元にメタデータをダウンロードしますか？（yes/no）"
- 全件生成確認: "これから全オブジェクトのドキュメントを生成します。実行しますか？（yes/no）"
- 個別入力促し: "生成対象の API 名をカンマ区切りで入力してください： MoveIn__c,ServiceGuide__c"

備考
- 環境やプロジェクト形式によってコマンドが変わるため、必要に応じてコマンド文言を調整してください。
- 大量のオブジェクトを一括生成する場合は、処理時間やファイルサイズに注意してください。
