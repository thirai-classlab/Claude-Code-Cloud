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
    api_key: Optional[str] = None
    # 利用制限設定（USD単位、Noneは無制限）
    cost_limit_daily: Optional[float] = None
    cost_limit_weekly: Optional[float] = None
    cost_limit_monthly: Optional[float] = None
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
    limit: Optional[int] = None
    offset: int = 0
    has_more: bool = False


class PaginatedMessageHistoryResponse(BaseModel):
    """ペジネーション付きメッセージ履歴レスポンス"""

    messages: List[ChatMessageResponse]
    session_id: str
    pagination: "PaginationInfo"


class PaginationInfo(BaseModel):
    """ペジネーション情報"""

    total: int = Field(description="総件数")
    limit: int = Field(description="取得件数上限")
    offset: int = Field(description="オフセット")
    has_more: bool = Field(description="次のページがあるか")
    next_offset: Optional[int] = Field(None, description="次のページのオフセット")


class UsageStatsResponse(BaseModel):
    """使用量統計レスポンス"""

    project_id: str
    total_tokens: int = Field(description="総トークン数")
    total_cost: float = Field(description="総コスト（USD）")
    input_tokens: int = Field(description="入力トークン数")
    output_tokens: int = Field(description="出力トークン数")
    session_count: int = Field(description="セッション数")
    message_count: int = Field(description="メッセージ数")
    # 期間別使用量
    cost_daily: float = Field(description="過去1日のコスト（USD）")
    cost_weekly: float = Field(description="過去7日のコスト（USD）")
    cost_monthly: float = Field(description="過去30日のコスト（USD）")


class CostLimitCheckResponse(BaseModel):
    """利用制限チェックレスポンス"""

    project_id: str
    can_use: bool = Field(description="利用可能かどうか")
    exceeded_limits: List[str] = Field(default_factory=list, description="超過した制限タイプのリスト")
    # 現在の使用量
    cost_daily: float = Field(description="過去1日のコスト（USD）")
    cost_weekly: float = Field(description="過去7日のコスト（USD）")
    cost_monthly: float = Field(description="過去30日のコスト（USD）")
    # 制限値
    limit_daily: Optional[float] = Field(None, description="1日の制限（USD）")
    limit_weekly: Optional[float] = Field(None, description="7日の制限（USD）")
    limit_monthly: Optional[float] = Field(None, description="30日の制限（USD）")


class CostLimitUpdateRequest(BaseModel):
    """利用制限更新リクエスト"""

    cost_limit_daily: Optional[float] = Field(None, ge=0, description="1日の制限（USD）、nullで無制限")
    cost_limit_weekly: Optional[float] = Field(None, ge=0, description="7日の制限（USD）、nullで無制限")
    cost_limit_monthly: Optional[float] = Field(None, ge=0, description="30日の制限（USD）、nullで無制限")
