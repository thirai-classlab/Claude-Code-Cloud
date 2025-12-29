"""
Database Connection Manager

MySQL/SQLAlchemy接続管理
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.database import Base
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Global engine and session factory
_engine = None
_async_session_factory = None


def get_database_url() -> str:
    """
    データベースURL取得

    Returns:
        str: MySQL接続URL
    """
    return (
        f"mysql+aiomysql://{settings.mysql_user}:{settings.mysql_password}"
        f"@{settings.mysql_host}:{settings.mysql_port}/{settings.mysql_database}"
        f"?charset=utf8mb4"
    )


async def init_database() -> None:
    """
    データベース初期化

    エンジンとセッションファクトリを作成します。
    """
    global _engine, _async_session_factory

    database_url = get_database_url()
    logger.info("Initializing database connection", host=settings.mysql_host)

    _engine = create_async_engine(
        database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
    )

    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    # テーブル作成
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database initialized successfully")


async def close_database() -> None:
    """データベース接続をクローズ"""
    global _engine, _async_session_factory

    if _engine:
        logger.info("Closing database connection")
        await _engine.dispose()
        _engine = None
        _async_session_factory = None


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    データベースセッション取得

    Yields:
        AsyncSession: 非同期セッション
    """
    if _async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")

    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    """
    コンテキストマネージャー形式でセッション取得

    Usage:
        async with get_session_context() as session:
            # use session
    """
    if _async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")

    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_session_factory() -> async_sessionmaker:
    """
    セッションファクトリ取得

    Returns:
        async_sessionmaker: セッションファクトリ
    """
    if _async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _async_session_factory
