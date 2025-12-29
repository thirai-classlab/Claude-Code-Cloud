"""
SQLAlchemy Database Models

データベースモデル定義
"""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """SQLAlchemy Base class"""
    pass


class UserModel(Base):
    """
    ユーザーテーブル

    FastAPI-Users互換のユーザーモデル
    - UUIDではなくString(36)をIDに使用（既存システムとの互換性）
    - 認証に必要なフィールド（hashed_password, is_active等）を追加
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=True)
    is_active = Column(Integer, default=1, nullable=False)  # Boolean as Integer for MySQL compatibility
    is_superuser = Column(Integer, default=0, nullable=False)
    is_verified = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owned_projects = relationship("ProjectModel", back_populates="owner", foreign_keys="ProjectModel.user_id")
    shared_projects = relationship("ProjectShareModel", back_populates="user", foreign_keys="ProjectShareModel.user_id")
    shares_given = relationship("ProjectShareModel", back_populates="sharer", foreign_keys="ProjectShareModel.shared_by")


class ProjectModel(Base):
    """プロジェクトテーブル"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(
        Enum("active", "archived", "deleted", name="project_status"),
        default="active",
        nullable=False,
    )
    workspace_path = Column(String(500), nullable=True)
    session_count = Column(Integer, default=0)
    api_key = Column(String(500), nullable=True)  # プロジェクト固有のAPIキー（暗号化推奨）
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    sessions = relationship("SessionModel", back_populates="project", cascade="all, delete-orphan")
    owner = relationship("UserModel", back_populates="owned_projects", foreign_keys=[user_id])
    shares = relationship("ProjectShareModel", back_populates="project", cascade="all, delete-orphan")
    # Project configurations
    mcp_servers = relationship("ProjectMCPServerModel", back_populates="project", cascade="all, delete-orphan")
    agents = relationship("ProjectAgentModel", back_populates="project", cascade="all, delete-orphan")
    skills = relationship("ProjectSkillModel", back_populates="project", cascade="all, delete-orphan")
    commands = relationship("ProjectCommandModel", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_projects_user_status", "user_id", "status"),
    )


class ProjectShareModel(Base):
    """プロジェクト共有テーブル"""
    __tablename__ = "project_shares"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission_level = Column(
        Enum("read", "write", "admin", name="permission_level"),
        default="read",
        nullable=False,
    )
    shared_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="shares")
    user = relationship("UserModel", back_populates="shared_projects", foreign_keys=[user_id])
    sharer = relationship("UserModel", back_populates="shares_given", foreign_keys=[shared_by])

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_shares_project_user"),
        Index("ix_project_shares_project_user", "project_id", "user_id"),
        Index("ix_project_shares_user_id", "user_id"),
    )


class SessionModel(Base):
    """セッションテーブル"""
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=True)
    status = Column(
        Enum("active", "idle", "processing", "closed", name="session_status"),
        default="active",
        nullable=False,
    )
    user_id = Column(String(36), nullable=True, index=True)
    model = Column(String(50), default="claude-opus-4-5", nullable=False)
    message_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_activity_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="sessions")
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sessions_project_status", "project_id", "status"),
        Index("ix_sessions_last_activity", "last_activity_at"),
    )


class MessageModel(Base):
    """メッセージテーブル"""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(
        Enum("user", "assistant", "system", name="message_role"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("SessionModel", back_populates="messages")

    __table_args__ = (
        Index("ix_messages_session_created", "session_id", "created_at"),
    )


class CronLogModel(Base):
    """Cron実行ログテーブル"""
    __tablename__ = "cron_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(100), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # success, error, running
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_cron_logs_job_created", "job_id", "created_at"),
    )


# ============================================
# Project Configuration Models (MCP, Agent, Skill, Command)
# ============================================


class ProjectMCPServerModel(Base):
    """プロジェクトMCPサーバー設定テーブル"""
    __tablename__ = "project_mcp_servers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    command = Column(String(500), nullable=False)
    args = Column(JSON, default=list)  # List of arguments
    env = Column(JSON, default=dict)   # Environment variables
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="mcp_servers")

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_mcp_servers_project_name"),
        Index("ix_project_mcp_servers_project", "project_id"),
    )


class ProjectAgentModel(Base):
    """プロジェクトエージェント設定テーブル"""
    __tablename__ = "project_agents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(50), default="custom", nullable=False)
    model = Column(String(50), default="sonnet", nullable=False)
    tools = Column(JSON, default=list)  # List of tool names
    system_prompt = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="agents")

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_agents_project_name"),
        Index("ix_project_agents_project", "project_id"),
    )


class ProjectSkillModel(Base):
    """プロジェクトスキル設定テーブル"""
    __tablename__ = "project_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(50), default="custom", nullable=False)
    content = Column(Text, nullable=True)  # Skill definition/prompt content
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="skills")

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_skills_project_name"),
        Index("ix_project_skills_project", "project_id"),
    )


class ProjectCommandModel(Base):
    """プロジェクトコマンド設定テーブル"""
    __tablename__ = "project_commands"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(50), default="custom", nullable=False)
    content = Column(Text, nullable=True)  # Command definition/script content
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("ProjectModel", back_populates="commands")

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_commands_project_name"),
        Index("ix_project_commands_project", "project_id"),
    )
