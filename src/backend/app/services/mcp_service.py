"""
MCP Server Connection Service

MCPサーバーへの接続テストとツール一覧取得
"""

import asyncio
import json
import os
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.project_config import MCPTool, MCPTestResponse, MCPToolsResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)

# タイムアウト設定（秒）
MCP_CONNECTION_TIMEOUT = 10


class MCPConnectionError(Exception):
    """MCP接続エラー"""
    pass


class MCPService:
    """MCPサーバー接続サービス"""

    @staticmethod
    async def test_connection(
        command: str,
        args: List[str],
        env: Optional[Dict[str, str]] = None,
    ) -> MCPTestResponse:
        """
        MCPサーバーへの接続テストを実行

        Args:
            command: 実行コマンド
            args: コマンド引数
            env: 環境変数

        Returns:
            MCPTestResponse: テスト結果（成功/失敗、ツール一覧、エラーメッセージ）
        """
        try:
            tools = await MCPService._connect_and_get_tools(command, args, env)
            return MCPTestResponse(
                success=True,
                tools=[
                    MCPTool(
                        name=t.get("name", ""),
                        description=t.get("description"),
                        input_schema=t.get("inputSchema"),
                    )
                    for t in tools
                ],
                error=None,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "MCP connection timeout",
                command=command,
                args=args,
            )
            return MCPTestResponse(
                success=False,
                tools=[],
                error="Connection timeout",
            )
        except MCPConnectionError as e:
            logger.warning(
                "MCP connection error",
                command=command,
                args=args,
                error=str(e),
            )
            return MCPTestResponse(
                success=False,
                tools=[],
                error=str(e),
            )
        except Exception as e:
            logger.error(
                "MCP unexpected error",
                command=command,
                args=args,
                error=str(e),
            )
            return MCPTestResponse(
                success=False,
                tools=[],
                error=f"Unexpected error: {str(e)}",
            )

    @staticmethod
    async def get_tools(
        command: str,
        args: List[str],
        env: Optional[Dict[str, str]] = None,
    ) -> MCPToolsResponse:
        """
        MCPサーバーのツール一覧を取得

        Args:
            command: 実行コマンド
            args: コマンド引数
            env: 環境変数

        Returns:
            MCPToolsResponse: ツール一覧
        """
        result = await MCPService.test_connection(command, args, env)
        if result.success:
            return MCPToolsResponse(tools=result.tools)
        else:
            # エラーの場合は空リストを返す
            return MCPToolsResponse(tools=[])

    @staticmethod
    async def _connect_and_get_tools(
        command: str,
        args: List[str],
        env: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        MCPサーバーに接続してツール一覧を取得

        MCP Protocol:
        1. サーバープロセスを起動
        2. JSON-RPCで initialize リクエスト送信
        3. initialized 通知を送信
        4. tools/list リクエストでツール一覧取得
        5. プロセス終了

        Args:
            command: 実行コマンド
            args: コマンド引数
            env: 環境変数

        Returns:
            List[Dict]: ツール一覧
        """
        # 環境変数のマージ
        process_env = os.environ.copy()
        if env:
            process_env.update(env)

        # コマンドとargsをリストにまとめる
        cmd_list = [command] + (args or [])

        logger.info("Starting MCP server", command=command, args=args)

        process = None
        try:
            # プロセス起動
            process = await asyncio.create_subprocess_exec(
                *cmd_list,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=process_env,
            )

            # タイムアウト付きで通信
            async with asyncio.timeout(MCP_CONNECTION_TIMEOUT):
                # 1. initialize リクエスト
                initialize_request = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {
                            "name": "claude-code-web",
                            "version": "1.0.0",
                        },
                    },
                }
                await MCPService._send_message(process, initialize_request)

                # initializeのレスポンスを待機
                init_response = await MCPService._read_message(process)
                if not init_response:
                    raise MCPConnectionError("No response from initialize request")

                if "error" in init_response:
                    error = init_response["error"]
                    raise MCPConnectionError(
                        f"Initialize error: {error.get('message', 'Unknown error')}"
                    )

                logger.debug("Initialize response received", response=init_response)

                # 2. initialized 通知を送信
                initialized_notification = {
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized",
                }
                await MCPService._send_message(process, initialized_notification)

                # 3. tools/list リクエスト
                tools_request = {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/list",
                    "params": {},
                }
                await MCPService._send_message(process, tools_request)

                # tools/list のレスポンスを待機
                tools_response = await MCPService._read_message(process)
                if not tools_response:
                    raise MCPConnectionError("No response from tools/list request")

                if "error" in tools_response:
                    error = tools_response["error"]
                    raise MCPConnectionError(
                        f"Tools list error: {error.get('message', 'Unknown error')}"
                    )

                logger.debug("Tools list response received", response=tools_response)

                # ツール一覧を抽出
                result = tools_response.get("result", {})
                tools = result.get("tools", [])

                logger.info(
                    "MCP tools retrieved",
                    command=command,
                    tool_count=len(tools),
                )

                return tools

        finally:
            # プロセス終了
            if process:
                try:
                    process.terminate()
                    await asyncio.wait_for(process.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass

    @staticmethod
    async def _send_message(
        process: asyncio.subprocess.Process,
        message: Dict[str, Any],
    ) -> None:
        """
        MCPサーバーにJSON-RPCメッセージを送信

        Args:
            process: サブプロセス
            message: 送信するメッセージ
        """
        if process.stdin is None:
            raise MCPConnectionError("Process stdin is not available")

        content = json.dumps(message)
        # Content-Length ヘッダー付きで送信（LSPスタイル）
        full_message = f"Content-Length: {len(content)}\r\n\r\n{content}"

        process.stdin.write(full_message.encode("utf-8"))
        await process.stdin.drain()

        logger.debug("Sent MCP message", method=message.get("method", "unknown"))

    @staticmethod
    async def _read_message(
        process: asyncio.subprocess.Process,
    ) -> Optional[Dict[str, Any]]:
        """
        MCPサーバーからJSON-RPCメッセージを読み取り

        Args:
            process: サブプロセス

        Returns:
            Optional[Dict]: 受信したメッセージ（エラー時はNone）
        """
        if process.stdout is None:
            raise MCPConnectionError("Process stdout is not available")

        # Content-Length ヘッダーを読み取り
        content_length = None
        while True:
            line = await process.stdout.readline()
            if not line:
                # stderrを確認
                if process.stderr:
                    stderr_data = await process.stderr.read()
                    if stderr_data:
                        stderr_text = stderr_data.decode("utf-8", errors="replace")
                        raise MCPConnectionError(f"Server error: {stderr_text}")
                raise MCPConnectionError("Server closed connection unexpectedly")

            line_str = line.decode("utf-8").strip()

            if line_str.startswith("Content-Length:"):
                content_length = int(line_str.split(":")[1].strip())
            elif line_str == "":
                # ヘッダー終了
                if content_length is not None:
                    break

        if content_length is None:
            raise MCPConnectionError("No Content-Length header received")

        # ボディを読み取り
        content = await process.stdout.readexactly(content_length)
        content_str = content.decode("utf-8")

        try:
            message = json.loads(content_str)
            logger.debug("Received MCP message", message_id=message.get("id"))
            return message
        except json.JSONDecodeError as e:
            raise MCPConnectionError(f"Invalid JSON response: {str(e)}")
