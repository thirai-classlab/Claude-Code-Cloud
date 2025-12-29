"""
Project Configuration Schemas

MCP Server, Agent, Skill, Command のPydanticスキーマ
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================
# MCP Server Schemas
# ============================================


class MCPServerBase(BaseModel):
    """MCPサーバー基本スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="MCPサーバー名")
    command: str = Field(..., min_length=1, max_length=500, description="実行コマンド")
    args: List[str] = Field(default_factory=list, description="コマンド引数")
    env: Dict[str, str] = Field(default_factory=dict, description="環境変数")
    enabled: bool = Field(default=True, description="有効フラグ")
    enabled_tools: Optional[List[str]] = Field(default=None, description="有効化されたツールのリスト（nullは全ツール有効）")


class MCPServerCreate(MCPServerBase):
    """MCPサーバー作成スキーマ"""
    pass


class MCPServerUpdate(BaseModel):
    """MCPサーバー更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    command: Optional[str] = Field(None, min_length=1, max_length=500)
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    enabled: Optional[bool] = None
    enabled_tools: Optional[List[str]] = None


class MCPServerResponse(MCPServerBase):
    """MCPサーバーレスポンススキーマ"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# MCP Test/Tools Schemas
# ============================================


class MCPTool(BaseModel):
    """MCPツールスキーマ"""
    name: str = Field(..., description="ツール名")
    description: Optional[str] = Field(None, description="ツール説明")
    input_schema: Optional[Dict[str, Any]] = Field(None, description="入力スキーマ")


class MCPTestResponse(BaseModel):
    """MCPサーバー接続テストレスポンス"""
    success: bool = Field(..., description="接続成功フラグ")
    tools: List[MCPTool] = Field(default_factory=list, description="利用可能なツール一覧")
    error: Optional[str] = Field(None, description="エラーメッセージ")


class MCPToolsResponse(BaseModel):
    """MCPサーバーツール一覧レスポンス"""
    tools: List[MCPTool] = Field(default_factory=list, description="利用可能なツール一覧")


# ============================================
# Agent Schemas
# ============================================


class AgentBase(BaseModel):
    """エージェント基本スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="エージェント名")
    description: Optional[str] = Field(None, max_length=500, description="説明")
    category: str = Field(default="custom", max_length=50, description="カテゴリ")
    model: str = Field(default="sonnet", max_length=50, description="使用モデル (sonnet/opus/haiku)")
    tools: List[str] = Field(default_factory=list, description="利用可能ツール")
    system_prompt: Optional[str] = Field(None, description="システムプロンプト")
    enabled: bool = Field(default=True, description="有効フラグ")


class AgentCreate(AgentBase):
    """エージェント作成スキーマ"""
    pass


class AgentUpdate(BaseModel):
    """エージェント更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    model: Optional[str] = Field(None, max_length=50)
    tools: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    enabled: Optional[bool] = None


class AgentResponse(AgentBase):
    """エージェントレスポンススキーマ"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Skill Schemas
# ============================================


class SkillBase(BaseModel):
    """スキル基本スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="スキル名")
    description: Optional[str] = Field(None, max_length=500, description="説明")
    category: str = Field(default="custom", max_length=50, description="カテゴリ")
    content: Optional[str] = Field(None, description="スキル定義/プロンプト内容")
    enabled: bool = Field(default=True, description="有効フラグ")


class SkillCreate(SkillBase):
    """スキル作成スキーマ"""
    pass


class SkillUpdate(BaseModel):
    """スキル更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    content: Optional[str] = None
    enabled: Optional[bool] = None


class SkillResponse(SkillBase):
    """スキルレスポンススキーマ"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Command Schemas
# ============================================


class CommandBase(BaseModel):
    """コマンド基本スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="コマンド名")
    description: Optional[str] = Field(None, max_length=500, description="説明")
    category: str = Field(default="custom", max_length=50, description="カテゴリ")
    content: Optional[str] = Field(None, description="コマンド定義/スクリプト内容")
    enabled: bool = Field(default=True, description="有効フラグ")


class CommandCreate(CommandBase):
    """コマンド作成スキーマ"""
    pass


class CommandUpdate(BaseModel):
    """コマンド更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    content: Optional[str] = None
    enabled: Optional[bool] = None


class CommandResponse(CommandBase):
    """コマンドレスポンススキーマ"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Project Config Aggregate Schemas
# ============================================


class ProjectConfigResponse(BaseModel):
    """プロジェクト設定全体レスポンス"""
    project_id: str
    mcp_servers: List[MCPServerResponse] = Field(default_factory=list)
    agents: List[AgentResponse] = Field(default_factory=list)
    skills: List[SkillResponse] = Field(default_factory=list)
    commands: List[CommandResponse] = Field(default_factory=list)


class ProjectConfigJSON(BaseModel):
    """AgentSdkClient用JSON形式の設定"""
    mcp_servers: List[Dict[str, Any]] = Field(default_factory=list)
    agents: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    commands: List[Dict[str, Any]] = Field(default_factory=list)
