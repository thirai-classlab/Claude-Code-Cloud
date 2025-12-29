"""
Request Schemas

APIリクエストのスキーマ定義
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    """プロジェクト作成リクエスト"""

    name: str = Field(..., min_length=1, max_length=100, description="プロジェクト名")
    description: Optional[str] = Field(default=None, max_length=500, description="プロジェクト説明")


class UpdateProjectRequest(BaseModel):
    """プロジェクト更新リクエスト"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="プロジェクト名")
    description: Optional[str] = Field(default=None, max_length=500, description="プロジェクト説明")


class CreateSessionRequest(BaseModel):
    """セッション作成リクエスト"""

    project_id: Optional[str] = Field(default=None, description="所属プロジェクトID (URL指定時は不要)")
    name: Optional[str] = Field(default=None, max_length=100, description="セッション名")
    user_id: Optional[str] = Field(default=None, description="ユーザーID")
    model: Optional[str] = Field(default=None, description="使用Claudeモデル")


class UpdateSessionRequest(BaseModel):
    """セッション更新リクエスト"""

    name: Optional[str] = Field(default=None, max_length=100, description="セッション名")


class ChatMessageRequest(BaseModel):
    """チャットメッセージリクエスト"""

    type: str = Field(default="chat", description="メッセージタイプ")
    content: str = Field(..., min_length=1, description="メッセージ内容")
    files: Optional[List[dict]] = Field(default=None, description="添付ファイル")


class FileReadRequest(BaseModel):
    """ファイル読み込みリクエスト"""

    path: str = Field(..., description="ファイルパス (相対パス)")


class FileWriteRequest(BaseModel):
    """ファイル書き込みリクエスト"""

    path: str = Field(..., description="ファイルパス (相対パス)")
    content: str = Field(..., description="ファイル内容")


class FileDeleteRequest(BaseModel):
    """ファイル削除リクエスト"""

    path: str = Field(..., description="ファイルパス (相対パス)")


class SaveMessageRequest(BaseModel):
    """メッセージ保存リクエスト"""

    role: str = Field(..., description="メッセージロール (user/assistant)")
    content: str = Field(..., description="メッセージ内容")
    tokens: Optional[int] = Field(default=None, description="トークン数")
