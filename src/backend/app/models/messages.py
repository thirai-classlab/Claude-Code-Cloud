"""
Message Models

メッセージとストリーミング関連のデータモデル
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MessageRole(str, Enum):
    """メッセージロール"""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageType(str, Enum):
    """ストリーミングメッセージタイプ"""

    TEXT = "text"
    TOOL_USE = "tool_use"
    TOOL_RESULT = "tool_result"
    THINKING = "thinking"
    RESULT = "result"
    ERROR = "error"
    ASSISTANT = "assistant"
    USER = "user"


class StreamMessage(BaseModel):
    """
    ストリーミングメッセージ

    WebSocketを通じてクライアントに送信されるメッセージ
    """

    type: MessageType = Field(..., description="メッセージタイプ")
    content: Optional[Any] = Field(default=None, description="メッセージ内容")
    session_id: Optional[str] = Field(default=None, description="セッションID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="追加メタデータ")
    timestamp: Optional[str] = Field(default=None, description="タイムスタンプ")

    class Config:
        """Pydantic configuration"""

        use_enum_values = True


class ChatMessage(BaseModel):
    """
    チャットメッセージ

    会話履歴に保存されるメッセージ
    """

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str = Field(..., description="メッセージID")
    session_id: str = Field(..., description="セッションID")
    role: MessageRole = Field(..., description="メッセージロール")
    content: str = Field(..., description="メッセージ内容")
    tokens: Optional[int] = Field(default=None, description="トークン数")
    created_at: str = Field(..., description="作成日時")

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime_to_str(cls, v: Union[datetime, str]) -> str:
        """datetime型をISO形式の文字列に変換"""
        if isinstance(v, datetime):
            return v.isoformat()
        return v


class FileAttachment(BaseModel):
    """ファイル添付"""

    path: str = Field(..., description="ファイルパス")
    content: str = Field(..., description="ファイル内容")
    mime_type: Optional[str] = Field(default=None, description="MIMEタイプ")


class ToolUseInfo(BaseModel):
    """ツール使用情報"""

    tool_use_id: str = Field(..., description="ツール使用ID")
    tool_name: str = Field(..., description="ツール名")
    input: Dict[str, Any] = Field(..., description="ツール入力")
    output: Optional[Any] = Field(default=None, description="ツール出力")
    success: bool = Field(default=True, description="実行成功フラグ")
    error: Optional[str] = Field(default=None, description="エラーメッセージ")
