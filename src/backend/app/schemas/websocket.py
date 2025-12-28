"""
WebSocket Message Schemas

WebSocketメッセージのスキーマ定義
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WSChatMessage(BaseModel):
    """WebSocket チャットメッセージ (クライアント -> サーバー)"""

    type: str = Field(default="chat", description="メッセージタイプ")
    content: str = Field(..., description="メッセージ内容")
    files: Optional[List[Dict[str, str]]] = Field(default=None, description="添付ファイル")


class WSInterruptMessage(BaseModel):
    """WebSocket 中断メッセージ (クライアント -> サーバー)"""

    type: str = Field(default="interrupt", description="メッセージタイプ")


class WSStreamMessage(BaseModel):
    """WebSocket ストリーミングメッセージ (サーバー -> クライアント)"""

    type: str = Field(..., description="メッセージタイプ")
    content: Optional[Any] = Field(default=None, description="メッセージ内容")
    session_id: Optional[str] = Field(default=None, description="セッションID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="メタデータ")
    timestamp: Optional[str] = Field(default=None, description="タイムスタンプ")


class WSErrorMessage(BaseModel):
    """WebSocket エラーメッセージ (サーバー -> クライアント)"""

    type: str = Field(default="error", description="メッセージタイプ")
    error: str = Field(..., description="エラーメッセージ")
    code: Optional[str] = Field(default=None, description="エラーコード")
