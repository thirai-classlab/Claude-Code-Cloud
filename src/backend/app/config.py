"""
Application Configuration

環境変数からの設定読み込みと検証を行います。
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    アプリケーション設定

    環境変数または .env ファイルから設定を読み込みます。
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Claude API Configuration
    anthropic_api_key: str = Field(..., description="Anthropic API Key")

    # MySQL Configuration
    mysql_host: str = Field(default="localhost", description="MySQL host")
    mysql_port: int = Field(default=3306, description="MySQL port")
    mysql_user: str = Field(default="claude", description="MySQL user")
    mysql_password: str = Field(default="claude_password", description="MySQL password")
    mysql_database: str = Field(default="claude_code", description="MySQL database name")

    @field_validator("mysql_password", mode="before")
    @classmethod
    def mysql_password_empty_str_to_default(cls, v: Optional[str]) -> str:
        """空文字列をデフォルト値に変換"""
        if v is None or v == "":
            return "claude_password"
        return v

    # Workspace Configuration
    workspace_path: str = Field(default="/app/workspace", description="Workspace base path")
    workspace_base: str = Field(default="/app/workspace", description="Workspace base directory")

    # Session Configuration
    max_projects: int = Field(default=50, description="Maximum number of projects")
    max_sessions_per_project: int = Field(
        default=20, description="Maximum sessions per project"
    )
    session_timeout: int = Field(default=3600, description="Session timeout in seconds")

    # Security Configuration
    secret_key: str = Field(
        default="changeme-insecure-secret-key-for-development-only",
        description="Secret key for JWT tokens"
    )
    allowed_origins: str = Field(
        default="http://localhost:3000", description="CORS allowed origins (comma-separated)"
    )
    sandbox_mode: str = Field(default="enabled", description="Sandbox mode: enabled/disabled")
    permission_mode: str = Field(
        default="ask", description="Permission mode: ask/auto/disabled"
    )

    # Application Configuration
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", description="Log level")
    api_prefix: str = Field(default="/api", description="API route prefix")
    ws_prefix: str = Field(default="/ws", description="WebSocket route prefix")

    # Frontend URL (for public access links)
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend URL")

    # Claude Agent Configuration
    default_model: str = Field(default="claude-opus-4-5", description="Default Claude model")
    max_turns: int = Field(default=20, description="Maximum conversation turns")
    max_tokens: int = Field(default=4096, description="Maximum output tokens")

    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_per_minute: int = Field(
        default=60, description="Maximum requests per minute"
    )

    @field_validator("allowed_origins")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> List[str]:
        """CORS許可オリジンをリストに変換"""
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    @field_validator("sandbox_mode")
    @classmethod
    def validate_sandbox_mode(cls, v: str) -> str:
        """サンドボックスモードの検証"""
        if v not in ["enabled", "disabled"]:
            raise ValueError("sandbox_mode must be 'enabled' or 'disabled'")
        return v

    @field_validator("permission_mode")
    @classmethod
    def validate_permission_mode(cls, v: str) -> str:
        """パーミッションモードの検証"""
        if v not in ["ask", "auto", "disabled"]:
            raise ValueError("permission_mode must be 'ask', 'auto', or 'disabled'")
        return v

    @property
    def cors_origins(self) -> List[str]:
        """CORS許可オリジンリスト"""
        if isinstance(self.allowed_origins, list):
            return self.allowed_origins
        return [origin.strip() for origin in str(self.allowed_origins).split(",")]

    @property
    def is_sandbox_enabled(self) -> bool:
        """サンドボックスが有効かどうか"""
        return self.sandbox_mode == "enabled"


# グローバル設定インスタンス
settings = Settings()


def get_settings() -> Settings:
    """設定インスタンスを取得"""
    return settings
