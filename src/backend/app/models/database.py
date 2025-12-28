"""
SQLAlchemy Database Models

データベースモデル定義
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """SQLAlchemy Base class"""
    pass


class ProjectModel(Base):
    """プロジェクトテーブル"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    user_id = Column(String(36), nullable=True, index=True)
    status = Column(
        Enum("active", "archived", "deleted", name="project_status"),
        default="active",
        nullable=False,
    )
    workspace_path = Column(String(500), nullable=True)
    session_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    sessions = relationship("SessionModel", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_projects_user_status", "user_id", "status"),
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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_cron_logs_job_created", "job_id", "created_at"),
    )
