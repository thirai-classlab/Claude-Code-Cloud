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


class WSPongMessage(BaseModel):
    """WebSocket pong メッセージ (クライアント -> サーバー)"""

    type: str = Field(default="pong", description="メッセージタイプ")
    timestamp: Optional[float] = Field(default=None, description="タイムスタンプ")


class WSAckMessage(BaseModel):
    """WebSocket ACK メッセージ (クライアント -> サーバー)"""

    type: str = Field(default="ack", description="メッセージタイプ")
    message_id: str = Field(..., description="確認するメッセージID")


class WSGetStateMessage(BaseModel):
    """WebSocket 状態取得メッセージ (クライアント -> サーバー)"""

    type: str = Field(default="get_state", description="メッセージタイプ")


class WSStreamMessage(BaseModel):
    """WebSocket ストリーミングメッセージ (サーバー -> クライアント)"""

    type: str = Field(..., description="メッセージタイプ")
    content: Optional[Any] = Field(default=None, description="メッセージ内容")
    session_id: Optional[str] = Field(default=None, description="セッションID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="メタデータ")
    timestamp: Optional[float] = Field(default=None, description="タイムスタンプ")
    message_id: Optional[str] = Field(default=None, description="メッセージID（ACK用）")


class WSConnectedMessage(BaseModel):
    """WebSocket 接続確認メッセージ (サーバー -> クライアント)"""

    type: str = Field(default="connected", description="メッセージタイプ")
    session_id: str = Field(..., description="セッションID")
    timestamp: float = Field(..., description="タイムスタンプ")


class WSPingMessage(BaseModel):
    """WebSocket ping メッセージ (サーバー -> クライアント)"""

    type: str = Field(default="ping", description="メッセージタイプ")
    timestamp: float = Field(..., description="タイムスタンプ")


class WSStateMessage(BaseModel):
    """WebSocket 状態メッセージ (サーバー -> クライアント)"""

    type: str = Field(default="state", description="メッセージタイプ")
    session_id: str = Field(..., description="セッションID")
    connection_state: str = Field(..., description="接続状態")
    is_processing: bool = Field(..., description="処理中かどうか")
    has_partial_response: bool = Field(..., description="部分レスポンスがあるか")
    last_activity: float = Field(..., description="最終アクティビティ時刻")
    timestamp: float = Field(..., description="タイムスタンプ")


class WSInterruptedMessage(BaseModel):
    """WebSocket 中断完了メッセージ (サーバー -> クライアント)"""

    type: str = Field(default="interrupted", description="メッセージタイプ")
    message: str = Field(..., description="メッセージ")
    partial_saved: bool = Field(default=False, description="部分レスポンスが保存されたか")
    timestamp: float = Field(..., description="タイムスタンプ")


class WSErrorMessage(BaseModel):
    """WebSocket エラーメッセージ (サーバー -> クライアント)"""

    type: str = Field(default="error", description="メッセージタイプ")
    error: str = Field(..., description="エラーメッセージ")
    code: Optional[str] = Field(default=None, description="エラーコード")
    details: Optional[Dict[str, Any]] = Field(default=None, description="詳細情報")
    timestamp: Optional[float] = Field(default=None, description="タイムスタンプ")


class WSResultMessage(BaseModel):
    """WebSocket 完了メッセージ (サーバー -> クライアント)"""

    type: str = Field(default="result", description="メッセージタイプ")
    usage: Dict[str, Any] = Field(..., description="使用量情報")
    interrupted: bool = Field(default=False, description="中断されたか")
    timestamp: float = Field(..., description="タイムスタンプ")
