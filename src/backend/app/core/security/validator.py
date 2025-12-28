"""
Input Validation

入力検証ユーティリティ
"""

import os
import re
from typing import Optional

from app.models.errors import AppException, ErrorCode


class InputValidator:
    """入力検証クラス"""

    # 危険なパターン
    DANGEROUS_PATTERNS = [
        r"\.\.\/",  # パストラバーサル
        r"\/etc\/",  # システムファイルアクセス
        r"\/proc\/",  # プロセス情報アクセス
        r"rm\s+-rf\s+\/",  # 危険なコマンド
        r"sudo",  # 権限昇格
    ]

    @staticmethod
    def validate_message_content(content: str, max_length: int = 50000) -> None:
        """
        メッセージ内容の検証

        Args:
            content: メッセージ内容
            max_length: 最大文字数

        Raises:
            AppException: 検証エラー
        """
        if not content or not content.strip():
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Message content cannot be empty",
                status_code=400,
            )

        if len(content) > max_length:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message=f"Message content exceeds maximum length of {max_length}",
                status_code=400,
            )

    @staticmethod
    def validate_file_path(file_path: str, workspace_path: str) -> None:
        """
        ファイルパスの検証

        Args:
            file_path: ファイルパス
            workspace_path: ワークスペースパス

        Raises:
            AppException: 検証エラー
        """
        if not file_path:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR, message="File path cannot be empty", status_code=400
            )

        # パストラバーサル検証
        abs_workspace = os.path.abspath(workspace_path)
        abs_file = os.path.abspath(os.path.join(workspace_path, file_path))

        if not abs_file.startswith(abs_workspace):
            raise AppException(
                code=ErrorCode.SANDBOX_VIOLATION,
                message="File path is outside workspace",
                status_code=403,
            )

    @staticmethod
    def check_dangerous_patterns(text: str) -> Optional[str]:
        """
        危険なパターンのチェック

        Args:
            text: チェックするテキスト

        Returns:
            Optional[str]: 検出されたパターン、なければ None
        """
        for pattern in InputValidator.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return pattern
        return None

    @staticmethod
    def validate_project_name(name: str) -> None:
        """
        プロジェクト名の検証

        Args:
            name: プロジェクト名

        Raises:
            AppException: 検証エラー
        """
        if not name or not name.strip():
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Project name cannot be empty",
                status_code=400,
            )

        if len(name) > 100:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Project name exceeds maximum length of 100",
                status_code=400,
            )

        # 英数字、ハイフン、アンダースコアのみ許可
        if not re.match(r"^[a-zA-Z0-9_\-\s]+$", name):
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Project name contains invalid characters",
                status_code=400,
            )
