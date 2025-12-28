"""
Sandbox Configuration

サンドボックス環境の設定と制御
"""

import os
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import settings


class SandboxConfig(BaseModel):
    """
    サンドボックス設定

    Claude Agentの実行環境を制御します。
    """

    enabled: bool = Field(default=True, description="サンドボックス有効フラグ")
    workspace_path: str = Field(..., description="ワークスペースパス")
    allowed_tools: Optional[List[str]] = Field(default=None, description="許可するツールリスト")
    disallowed_tools: Optional[List[str]] = Field(
        default=None, description="禁止するツールリスト"
    )
    permission_mode: str = Field(default="ask", description="パーミッションモード")
    env_vars: Dict[str, str] = Field(default_factory=dict, description="環境変数")
    max_file_size: int = Field(default=10 * 1024 * 1024, description="最大ファイルサイズ (bytes)")

    @classmethod
    def from_settings(
        cls, workspace_path: str, custom_allowed_tools: Optional[List[str]] = None
    ) -> "SandboxConfig":
        """
        設定から SandboxConfig を生成

        Args:
            workspace_path: ワークスペースパス
            custom_allowed_tools: カスタム許可ツールリスト

        Returns:
            SandboxConfig: サンドボックス設定
        """
        # デフォルトで許可するツール
        default_allowed_tools = [
            "Read",
            "Write",
            "Edit",
            "Bash",
            "Glob",
            "Grep",
        ]

        # カスタムツールをマージ
        allowed_tools = (
            list(set(default_allowed_tools + custom_allowed_tools))
            if custom_allowed_tools
            else default_allowed_tools
        )

        # 危険なツールは無効化
        disallowed_tools = []
        if settings.is_sandbox_enabled:
            disallowed_tools = [
                # 必要に応じて危険なツールを追加
            ]

        return cls(
            enabled=settings.is_sandbox_enabled,
            workspace_path=workspace_path,
            allowed_tools=allowed_tools,
            disallowed_tools=disallowed_tools,
            permission_mode=settings.permission_mode,
            env_vars=cls._get_safe_env_vars(),
        )

    @staticmethod
    def _get_safe_env_vars() -> Dict[str, str]:
        """
        安全な環境変数のみを抽出

        Returns:
            Dict[str, str]: 環境変数辞書
        """
        safe_vars = {}

        # 許可する環境変数のホワイトリスト
        allowed_env_vars = [
            "PATH",
            "HOME",
            "USER",
            "LANG",
            "LC_ALL",
        ]

        for var in allowed_env_vars:
            value = os.environ.get(var)
            if value:
                safe_vars[var] = value

        return safe_vars

    def validate_file_path(self, file_path: str) -> bool:
        """
        ファイルパスがワークスペース内にあるか検証

        Args:
            file_path: 検証するファイルパス

        Returns:
            bool: ワークスペース内の場合 True
        """
        if not self.enabled:
            return True

        abs_workspace = os.path.abspath(self.workspace_path)
        abs_file = os.path.abspath(file_path)

        return abs_file.startswith(abs_workspace)

    def is_tool_allowed(self, tool_name: str) -> bool:
        """
        ツールが許可されているか確認

        Args:
            tool_name: ツール名

        Returns:
            bool: 許可されている場合 True
        """
        if not self.enabled:
            return True

        if self.disallowed_tools and tool_name in self.disallowed_tools:
            return False

        if self.allowed_tools:
            return tool_name in self.allowed_tools

        return True
