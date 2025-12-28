"""
Error Models

エラー関連のデータモデル
"""

from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """エラーコード"""

    # 一般エラー
    INTERNAL_ERROR = "internal_error"
    INVALID_REQUEST = "invalid_request"
    VALIDATION_ERROR = "validation_error"

    # 認証・認可エラー
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"

    # リソースエラー
    NOT_FOUND = "not_found"
    ALREADY_EXISTS = "already_exists"
    CONFLICT = "conflict"

    # セッション・プロジェクトエラー
    SESSION_NOT_FOUND = "session_not_found"
    SESSION_CLOSED = "session_closed"
    PROJECT_NOT_FOUND = "project_not_found"
    MAX_PROJECTS_EXCEEDED = "max_projects_exceeded"
    MAX_SESSIONS_EXCEEDED = "max_sessions_exceeded"

    # Claude API エラー
    CLAUDE_API_ERROR = "claude_api_error"
    CLAUDE_RATE_LIMIT = "claude_rate_limit"
    CLAUDE_TIMEOUT = "claude_timeout"

    # ファイル操作エラー
    FILE_NOT_FOUND = "file_not_found"
    FILE_ACCESS_DENIED = "file_access_denied"
    FILE_TOO_LARGE = "file_too_large"

    # セキュリティエラー
    SANDBOX_VIOLATION = "sandbox_violation"
    PERMISSION_DENIED = "permission_denied"


class ErrorResponse(BaseModel):
    """エラーレスポンス"""

    code: ErrorCode = Field(..., description="エラーコード")
    message: str = Field(..., description="エラーメッセージ")
    details: Optional[Dict[str, Any]] = Field(default=None, description="エラー詳細")
    request_id: Optional[str] = Field(default=None, description="リクエストID")

    class Config:
        """Pydantic configuration"""

        use_enum_values = True


class AppException(Exception):
    """アプリケーション基底例外"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500,
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(message)


class MaxProjectsExceededError(AppException):
    """最大プロジェクト数超過エラー"""

    def __init__(self, message: str = "Maximum number of projects exceeded"):
        super().__init__(
            code=ErrorCode.MAX_PROJECTS_EXCEEDED, message=message, status_code=400
        )


class MaxSessionsExceededError(AppException):
    """最大セッション数超過エラー"""

    def __init__(self, message: str = "Maximum number of sessions exceeded"):
        super().__init__(
            code=ErrorCode.MAX_SESSIONS_EXCEEDED, message=message, status_code=400
        )


class SessionNotFoundError(AppException):
    """セッション未検出エラー"""

    def __init__(self, session_id: str):
        super().__init__(
            code=ErrorCode.SESSION_NOT_FOUND,
            message=f"Session {session_id} not found",
            status_code=404,
        )


class ProjectNotFoundError(AppException):
    """プロジェクト未検出エラー"""

    def __init__(self, project_id: str):
        super().__init__(
            code=ErrorCode.PROJECT_NOT_FOUND,
            message=f"Project {project_id} not found",
            status_code=404,
        )
