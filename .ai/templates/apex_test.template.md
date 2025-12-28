# APEX Test 設計書テンプレート

目的: Apex テストクラスの設計書を作成するためのテンプレート。テスト対象、カバレッジ、テストデータ戦略を明記する。

---

## メタ
```yaml
title: <short title>
feature_name: <FEATURE_NAME>
module: apex
apex_type: test
source_path: force-app/main/default/classes/<ClassName>Test.cls
generated_at: <ISO8601>
```

---

## 目次
1. [概要](#1-概要)
2. [テスト対象](#2-テスト対象)
3. [テストデータ戦略](#3-テストデータ戦略)
4. [テストケース一覧](#4-テストケース一覧)
5. [テストメソッド詳細](#5-テストメソッド詳細)
6. [カバレッジ要件](#6-カバレッジ要件)
7. [モック・スタブ](#7-モックスタブ)
8. [実行方法](#8-実行方法)
9. [変更仕様マトリクス](#9-変更仕様マトリクス)
10. [改訂履歴](#10-改訂履歴)

---

## 1. 概要

### 目的
<!-- テストクラスの目的・テスト範囲を記載 -->

### テスト方針
- 単体テスト / 統合テスト
- 正常系・異常系・境界値のカバー
- バルク処理のテスト

---

## 2. テスト対象

| クラス名 | 種別 | 仕様書 |
|---------|------|--------|
| TargetClassName | Batch/Controller/Handler | [open](xxx.md) |

### テスト対象メソッド
| メソッド名 | 可視性 | テスト必須 |
|-----------|--------|-----------|
| execute | public | Yes |
| privateMethod | private | @TestVisible |
| helperMethod | private | 間接テスト |

---

## 3. テストデータ戦略

### データ作成方針
| 方針 | 適用 |
|------|------|
| @TestSetup | ✅ 共通データ作成 |
| テストファクトリ | ✅ TestDataFactory 使用 |
| 実データ参照 | ❌ 使用しない |

### @TestSetup メソッド
```apex
@TestSetup
static void setupTestData() {
    // 共通テストデータ作成
    Account acc = TestDataFactory.createAccount();
    insert acc;
}
```

### TestDataFactory 使用例
```apex
// 推奨: ファクトリメソッド使用
Account acc = TestDataFactory.createAccount();
Contact con = TestDataFactory.createContact(acc.Id);

// 非推奨: 直接作成
Account acc = new Account(Name = 'Test'); // 必須項目漏れのリスク
```

---

## 4. テストケース一覧

### 正常系
| テストメソッド | 説明 | 期待結果 |
|---------------|------|---------|
| testExecuteSuccess | 正常実行 | 処理成功 |
| testBulkProcess | バルク処理 | 200件処理成功 |

### 異常系
| テストメソッド | 説明 | 期待結果 |
|---------------|------|---------|
| testExecuteWithNullParam | null パラメータ | 例外スロー |
| testExecuteWithInvalidData | 不正データ | エラー返却 |

### 境界値
| テストメソッド | 説明 | 期待結果 |
|---------------|------|---------|
| testEmptyList | 空リスト | 正常終了（処理なし） |
| testMaxRecords | 最大件数 | ガバナ制限内で完了 |

### セキュリティ
| テストメソッド | 説明 | 期待結果 |
|---------------|------|---------|
| testWithoutPermission | 権限なしユーザー | アクセス拒否 |
| testFLSEnforcement | FLS 違反 | エラー |

---

## 5. テストメソッド詳細

### 5.1 testExecuteSuccess (anchor: test-execute-success)

**テスト対象:**
- TargetClassName.execute()

**前提条件:**
- テストデータが @TestSetup で作成済み

**テスト手順:**
1. テストデータ取得
2. Test.startTest()
3. 対象メソッド実行
4. Test.stopTest()
5. アサーション実行

**アサーション:**
- 戻り値が期待通りであること
- DML 結果が正しいこと

```apex
@IsTest
static void testExecuteSuccess() {
    // Given: テストデータ取得
    Account acc = [SELECT Id FROM Account LIMIT 1];

    // When: 処理実行
    Test.startTest();
    String result = TargetClassName.execute(acc.Id);
    Test.stopTest();

    // Then: 検証
    System.assertEquals('Success', result, '結果が Success であること');

    // データ検証
    Account updated = [SELECT Status__c FROM Account WHERE Id = :acc.Id];
    System.assertEquals('Processed', updated.Status__c);
}
```

### 5.2 testBulkProcess (anchor: test-bulk-process)

**テスト対象:**
- バルク処理のガバナ制限確認

**テスト手順:**
1. 200件のテストデータ作成
2. バルク処理実行
3. ガバナ制限違反なしを確認

```apex
@IsTest
static void testBulkProcess() {
    // Given: 200件のテストデータ
    List<Account> accounts = new List<Account>();
    for (Integer i = 0; i < 200; i++) {
        accounts.add(new Account(Name = 'Test ' + i));
    }
    insert accounts;

    // When: バルク処理
    Test.startTest();
    TargetClassName.processRecords(accounts);
    Test.stopTest();

    // Then: 全件処理されていること
    List<Account> processed = [SELECT Id FROM Account WHERE Status__c = 'Processed'];
    System.assertEquals(200, processed.size());
}
```

### 5.3 testExecuteWithNullParam (anchor: test-null-param)

**テスト対象:**
- null パラメータ時の例外処理

```apex
@IsTest
static void testExecuteWithNullParam() {
    // Given: null パラメータ

    // When/Then: 例外がスローされること
    try {
        Test.startTest();
        TargetClassName.execute(null);
        Test.stopTest();
        System.assert(false, '例外がスローされるべき');
    } catch (IllegalArgumentException e) {
        System.assert(e.getMessage().contains('required'), 'エラーメッセージ確認');
    }
}
```

---

## 6. カバレッジ要件

| 項目 | 要件 | 現状 |
|------|------|------|
| 全体カバレッジ | 75% 以上 | - |
| 対象クラス | 80% 以上 | - |
| 主要メソッド | 100% | - |

### カバレッジ確認コマンド
```bash
# 特定テストクラス実行
sfdx force:apex:test:run -n TargetClassNameTest -c -r human

# カバレッジレポート出力
sfdx force:apex:test:run -c -r json --outputdir ./test-results
```

---

## 7. モック・スタブ

### HttpCalloutMock（外部 API）
```apex
@IsTest
private class MockHttpResponse implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setHeader('Content-Type', 'application/json');
        res.setBody('{"status":"success"}');
        res.setStatusCode(200);
        return res;
    }
}

// テストでの使用
Test.setMock(HttpCalloutMock.class, new MockHttpResponse());
```

### @TestVisible（private メソッド）
```apex
// 本番クラス
@TestVisible
private static String privateMethod() { ... }

// テストクラス
String result = TargetClassName.privateMethod();
```

### Test.isRunningTest()
```apex
// 本番クラスでのテスト分岐（非推奨だが必要な場合）
if (Test.isRunningTest()) {
    // テスト用の処理
}
```

---

## 8. 実行方法

### ローカル実行
```bash
# 単一テストクラス
sfdx force:apex:test:run -n TargetClassNameTest -r human -w 10

# 全テスト
sfdx force:apex:test:run -l RunLocalTests -r human -w 30
```

### CI/CD での実行
```yaml
# GitHub Actions 例
- name: Run Apex Tests
  run: sfdx force:apex:test:run -l RunLocalTests -c -r json
```

---

## 9. 変更仕様マトリクス

| 発生場所(Where) | 発火タイミング/条件(When/If) | 方式 | 対象オブジェクト | 対象レコード特定条件 | 対象項目(Label/API/型) | 変更内容(Before→After/算出式) | 権限要件 | 例外時動作/リトライ | ログ/監査 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| Test[ClassName] | テスト実行時 | Apex Test | テストデータ | - | - | テスト検証 | - | - | - | テストクラス |

---

## 10. 改訂履歴

| バージョン | 日付 | セクション | 追加機能 | 変更者 | 備考 |
|---|---|---|---|---|---|
| 0.1 | YYYY-MM-DD | 全体 | 初版作成 | Author | - |

---

## 関連プログラム
- Test: [TargetClassNameTest.cls](../../force-app/main/default/classes/TargetClassNameTest.cls) | 仕様書: 本書
- 対象: [TargetClassName.cls](../../force-app/main/default/classes/TargetClassName.cls) | 仕様書: xxx.md

## 参考リンク
- 参照: doc/apex/target-class-name.md
