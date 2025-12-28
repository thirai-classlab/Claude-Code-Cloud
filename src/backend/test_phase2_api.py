"""
Phase 2 API テストスクリプト

プロジェクト/セッション管理APIのテスト
"""

import asyncio
import httpx

BASE_URL = "http://localhost:8000"


async def test_phase2_api():
    """Phase 2 APIの動作確認"""
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        print("=" * 60)
        print("Phase 2 API テスト開始")
        print("=" * 60)

        # 1. プロジェクト作成
        print("\n1. プロジェクト作成")
        project_response = await client.post(
            "/api/projects",
            json={
                "name": "テストプロジェクト",
                "description": "Phase 2テスト用プロジェクト",
                "user_id": "test_user",
            },
        )
        print(f"ステータス: {project_response.status_code}")
        project = project_response.json()
        print(f"プロジェクトID: {project['id']}")
        print(f"プロジェクト名: {project['name']}")
        project_id = project["id"]

        # 2. プロジェクト一覧取得
        print("\n2. プロジェクト一覧取得")
        projects_response = await client.get("/api/projects")
        print(f"ステータス: {projects_response.status_code}")
        projects = projects_response.json()
        print(f"プロジェクト数: {projects['total']}")

        # 3. プロジェクト配下にセッション作成
        print("\n3. プロジェクト配下にセッション作成")
        session_response = await client.post(
            f"/api/projects/{project_id}/sessions",
            json={
                "project_id": project_id,
                "name": "テストセッション1",
                "user_id": "test_user",
            },
        )
        print(f"ステータス: {session_response.status_code}")
        session = session_response.json()
        print(f"セッションID: {session['id']}")
        print(f"セッション名: {session['name']}")
        session_id = session["id"]

        # 4. さらにセッション追加
        print("\n4. 2つ目のセッション作成")
        session2_response = await client.post(
            f"/api/projects/{project_id}/sessions",
            json={
                "project_id": project_id,
                "name": "テストセッション2",
                "user_id": "test_user",
            },
        )
        print(f"ステータス: {session2_response.status_code}")
        session2 = session2_response.json()
        print(f"セッションID: {session2['id']}")
        session2_id = session2["id"]

        # 5. プロジェクト配下のセッション一覧取得
        print("\n5. プロジェクト配下のセッション一覧取得")
        project_sessions_response = await client.get(
            f"/api/projects/{project_id}/sessions"
        )
        print(f"ステータス: {project_sessions_response.status_code}")
        project_sessions = project_sessions_response.json()
        print(f"セッション数: {project_sessions['total']}")
        for s in project_sessions["sessions"]:
            print(f"  - {s['name']} ({s['id']})")

        # 6. セッションにメッセージ保存
        print("\n6. セッションにメッセージ保存")
        message1_response = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={"role": "user", "content": "こんにちは！", "tokens": 5},
        )
        print(f"ステータス: {message1_response.status_code}")
        message1 = message1_response.json()
        print(f"メッセージID: {message1['id']}")

        message2_response = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={
                "role": "assistant",
                "content": "こんにちは！どのようにお手伝いできますか？",
                "tokens": 15,
            },
        )
        print(f"ステータス: {message2_response.status_code}")

        # 7. セッションのメッセージ履歴取得
        print("\n7. セッションのメッセージ履歴取得")
        messages_response = await client.get(f"/api/sessions/{session_id}/messages")
        print(f"ステータス: {messages_response.status_code}")
        messages = messages_response.json()
        print(f"メッセージ数: {messages['total']}")
        for msg in messages["messages"]:
            print(f"  - [{msg['role']}] {msg['content'][:30]}...")

        # 8. セッション情報取得（セッション数が更新されているか確認）
        print("\n8. セッション情報確認")
        session_info = await client.get(f"/api/sessions/{session_id}")
        print(f"メッセージ数: {session_info.json()['message_count']}")

        # 9. プロジェクト情報取得（セッション数が更新されているか確認）
        print("\n9. プロジェクト情報確認")
        project_info = await client.get(f"/api/projects/{project_id}")
        print(f"セッション数: {project_info.json()['session_count']}")

        # 10. セッション削除
        print("\n10. セッション削除")
        delete_session_response = await client.delete(
            f"/api/projects/{project_id}/sessions/{session2_id}"
        )
        print(f"ステータス: {delete_session_response.status_code}")

        # 11. プロジェクト削除
        print("\n11. プロジェクト削除")
        delete_project_response = await client.delete(f"/api/projects/{project_id}")
        print(f"ステータス: {delete_project_response.status_code}")

        print("\n" + "=" * 60)
        print("Phase 2 API テスト完了")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_phase2_api())
