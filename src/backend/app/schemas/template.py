"""
Project Template Schemas

プロジェクトテンプレートのPydanticスキーマ
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================
# Template File Schemas
# ============================================


class TemplateFileBase(BaseModel):
    """テンプレートファイル基本スキーマ"""
    file_path: str = Field(..., min_length=1, max_length=500, description="相対ファイルパス")
    content: Optional[str] = Field(None, description="ファイル内容")


class TemplateFileCreate(TemplateFileBase):
    """テンプレートファイル作成スキーマ"""
    pass


class TemplateFileResponse(TemplateFileBase):
    """テンプレートファイルレスポンススキーマ"""
    id: str
    template_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Template Schemas
# ============================================


class TemplateBase(BaseModel):
    """テンプレート基本スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="テンプレート名")
    description: Optional[str] = Field(None, max_length=500, description="説明")
    is_public: bool = Field(default=False, description="公開フラグ")


class TemplateCreate(TemplateBase):
    """テンプレート作成スキーマ"""
    mcp_servers: List[Dict[str, Any]] = Field(default_factory=list, description="MCPサーバー設定リスト")
    agents: List[Dict[str, Any]] = Field(default_factory=list, description="エージェント設定リスト")
    skills: List[Dict[str, Any]] = Field(default_factory=list, description="スキル設定リスト")
    commands: List[Dict[str, Any]] = Field(default_factory=list, description="コマンド設定リスト")
    files: List[TemplateFileCreate] = Field(default_factory=list, description="テンプレートファイルリスト")


class TemplateUpdate(BaseModel):
    """テンプレート更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    mcp_servers: Optional[List[Dict[str, Any]]] = None
    agents: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[Dict[str, Any]]] = None
    commands: Optional[List[Dict[str, Any]]] = None


class TemplateResponse(TemplateBase):
    """テンプレートレスポンススキーマ"""
    id: str
    user_id: str
    mcp_servers: List[Dict[str, Any]] = Field(default_factory=list)
    agents: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    commands: List[Dict[str, Any]] = Field(default_factory=list)
    files: List[TemplateFileResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateListResponse(TemplateBase):
    """テンプレート一覧用レスポンススキーマ (ファイル内容なし)"""
    id: str
    user_id: str
    file_count: int = Field(default=0, description="ファイル数")
    mcp_server_count: int = Field(default=0, description="MCPサーバー数")
    agent_count: int = Field(default=0, description="エージェント数")
    skill_count: int = Field(default=0, description="スキル数")
    command_count: int = Field(default=0, description="コマンド数")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Template Operation Schemas
# ============================================


class CreateProjectFromTemplateRequest(BaseModel):
    """テンプレートからプロジェクト作成リクエスト"""
    template_id: str = Field(..., description="テンプレートID")
    project_name: str = Field(..., min_length=1, max_length=100, description="プロジェクト名")
    project_description: Optional[str] = Field(None, max_length=500, description="プロジェクト説明")
    api_key: Optional[str] = Field(None, max_length=500, description="プロジェクト固有のAPIキー")


class CreateTemplateFromProjectRequest(BaseModel):
    """プロジェクトからテンプレート作成リクエスト"""
    project_id: str = Field(..., description="プロジェクトID")
    template_name: str = Field(..., min_length=1, max_length=100, description="テンプレート名")
    template_description: Optional[str] = Field(None, max_length=500, description="テンプレート説明")
    is_public: bool = Field(default=False, description="公開フラグ")
    include_files: bool = Field(default=True, description="ワークスペースファイルを含めるか")
    file_patterns: List[str] = Field(
        default_factory=lambda: ["*.py", "*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.md", "*.yaml", "*.yml"],
        description="含めるファイルパターン (glob形式)"
    )
    exclude_patterns: List[str] = Field(
        default_factory=lambda: ["node_modules/**", ".git/**", "__pycache__/**", "*.pyc", ".env*", "*.log"],
        description="除外するファイルパターン (glob形式)"
    )
