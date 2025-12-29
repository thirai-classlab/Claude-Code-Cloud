"""
Response Schemas

APIレスポンスのスキーマ定義
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.projects import Project, ProjectStatus
from app.models.sessions import Session, SessionStatus


class ProjectResponse(BaseModel):
    """プロジェクトレスポンス"""

    id: str
    name: str
    description: Optional[str]
    user_id: Optional[str]
    status: ProjectStatus
    workspace_path: Optional[str]
    session_count: int
    created_at: datetime
    updated_at: datetime


class SessionResponse(BaseModel):
    """セッションレスポンス"""

    id: str
    project_id: str
    name: Optional[str]
    status: SessionStatus
    user_id: Optional[str]
    model: str
    message_count: int
    total_tokens: int
    total_cost_usd: float
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime


class ProjectListResponse(BaseModel):
    """プロジェクト一覧レスポンス"""

    projects: List[ProjectResponse]
    total: int
    limit: int
    offset: int


class SessionListResponse(BaseModel):
    """セッション一覧レスポンス"""

    sessions: List[SessionResponse]
    total: int
    limit: int
    offset: int


class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str = Field(default="ok", description="サービスステータス")
    version: str = Field(default="1.0.0", description="バージョン")
    timestamp: str = Field(..., description="タイムスタンプ")


class ConfigResponse(BaseModel):
    """クライアント設定レスポンス"""

    api_prefix: str
    ws_prefix: str
    default_model: str
    max_tokens: int
    features: Dict[str, bool]


class FileInfoResponse(BaseModel):
    """ファイル情報レスポンス"""

    path: str
    name: str
    size: int
    is_directory: bool
    modified_at: Optional[str]


class FileListResponse(BaseModel):
    """ファイル一覧レスポンス"""

    files: List[FileInfoResponse]
    total: int


class FileContentResponse(BaseModel):
    """ファイル内容レスポンス"""

    path: str
    content: str
    size: int
    mime_type: Optional[str]


class MessageResponse(BaseModel):
    """メッセージレスポンス"""

    message: str
    success: bool = True
    data: Optional[Any] = None


class ChatMessageResponse(BaseModel):
    """チャットメッセージレスポンス"""

    id: str
    session_id: str
    role: str
    content: str
    tokens: Optional[int]
    created_at: str


class MessageHistoryResponse(BaseModel):
    """メッセージ履歴レスポンス"""

    messages: List[ChatMessageResponse]
    total: int
    session_id: str
