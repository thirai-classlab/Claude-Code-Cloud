"""
Public Access Schemas

外部公開機能のPydanticスキーマ
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ============================================
# Public Access Settings
# ============================================


class PublicAccessBase(BaseModel):
    """外部公開設定ベース"""
    enabled: bool = Field(default=False, description="公開有効フラグ")
    password: Optional[str] = Field(default=None, description="パスワード（設定時のみ）")
    allowed_ips: Optional[list[str]] = Field(default=None, description="許可IPリスト（CIDR対応）")
    max_sessions_per_day: Optional[int] = Field(default=None, ge=1, description="1日あたり最大セッション数")
    max_messages_per_session: Optional[int] = Field(default=None, ge=1, description="セッションあたり最大メッセージ数")
    expires_at: Optional[datetime] = Field(default=None, description="公開期限")


class PublicAccessCreate(PublicAccessBase):
    """外部公開設定作成"""
    pass


class PublicAccessUpdate(BaseModel):
    """外部公開設定更新"""
    enabled: Optional[bool] = None
    password: Optional[str] = Field(default=None, description="新しいパスワード（空文字でクリア）")
    clear_password: Optional[bool] = Field(default=False, description="パスワードをクリア")
    allowed_ips: Optional[list[str]] = None
    max_sessions_per_day: Optional[int] = Field(default=None, ge=1)
    max_messages_per_session: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[datetime] = None
    clear_expires_at: Optional[bool] = Field(default=False, description="期限をクリア")


class PublicAccessResponse(BaseModel):
    """外部公開設定レスポンス"""
    id: str
    project_id: str
    access_token: str
    enabled: bool
    has_password: bool = Field(description="パスワード設定有無")
    allowed_ips: Optional[list[str]]
    max_sessions_per_day: Optional[int]
    max_messages_per_session: Optional[int]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    public_url: str = Field(description="公開URL")

    model_config = {"from_attributes": True}


# ============================================
# Command Public Settings
# ============================================


class CommandPublicSettingBase(BaseModel):
    """コマンド公開設定ベース"""
    is_public: bool = Field(default=False, description="外部公開フラグ")
    priority: int = Field(default=0, ge=0, description="表示優先順位")


class CommandPublicSettingUpdate(CommandPublicSettingBase):
    """コマンド公開設定更新"""
    pass


class CommandPublicSettingResponse(BaseModel):
    """コマンド公開設定レスポンス"""
    command_id: str
    command_name: str
    command_description: Optional[str]
    is_public: bool
    priority: int

    model_config = {"from_attributes": True}


class CommandPublicSettingListResponse(BaseModel):
    """コマンド公開設定一覧レスポンス"""
    commands: list[CommandPublicSettingResponse]
    total: int


# ============================================
# Public Session
# ============================================


class PublicSessionResponse(BaseModel):
    """公開セッションレスポンス"""
    id: str
    command_id: Optional[str]
    command_name: Optional[str]
    ip_address: str
    user_agent: Optional[str]
    message_count: int
    created_at: datetime
    last_activity_at: datetime

    model_config = {"from_attributes": True}


class PublicSessionListResponse(BaseModel):
    """公開セッション一覧レスポンス"""
    sessions: list[PublicSessionResponse]
    total: int


class PublicAccessStatsResponse(BaseModel):
    """アクセス統計レスポンス"""
    total_sessions: int
    today_sessions: int
    total_messages: int
    unique_ips: int


# ============================================
# Public API (認証不要)
# ============================================


class PublicProjectInfoResponse(BaseModel):
    """公開プロジェクト情報レスポンス"""
    project_name: str
    description: Optional[str]
    requires_password: bool
    is_accessible: bool
    error: Optional[str] = None


class VerifyPasswordRequest(BaseModel):
    """パスワード認証リクエスト"""
    password: str


class VerifyPasswordResponse(BaseModel):
    """パスワード認証レスポンス"""
    verified: bool
    session_token: Optional[str] = None
    error: Optional[str] = None


class PublicCommandResponse(BaseModel):
    """公開コマンドレスポンス"""
    id: str
    name: str
    description: Optional[str]


class PublicCommandListResponse(BaseModel):
    """公開コマンド一覧レスポンス"""
    commands: list[PublicCommandResponse]


class CreatePublicSessionRequest(BaseModel):
    """公開セッション作成リクエスト"""
    command_id: Optional[str] = Field(default=None, description="コマンドID（フリーチャット時はNone）")


class CreatePublicSessionResponse(BaseModel):
    """公開セッション作成レスポンス"""
    session_id: str
    command: Optional[PublicCommandResponse] = Field(default=None, description="コマンド情報（フリーチャット時はNone）")
    limits: dict
    mode: str = Field(default="command", description="セッションモード（command/free_chat）")


class PublicChatMessage(BaseModel):
    """公開チャットメッセージ"""
    role: str
    content: str
    created_at: datetime
