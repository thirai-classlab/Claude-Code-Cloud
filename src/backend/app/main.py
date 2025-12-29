"""
FastAPI Application Entry Point

Web版Claude Code バックエンドアプリケーション
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import agents, auth, commands, cron, files, health, mcp, project_config, projects, sessions, shares, skills, templates
from app.api.websocket.handlers import handle_chat_websocket
from app.config import settings
from app.core.cron_scheduler import get_cron_scheduler, shutdown_cron_scheduler
from app.models.errors import AppException, ErrorResponse
from app.utils.database import init_database, close_database, get_session_context
from app.utils.logger import get_logger, setup_logging

# ロギング設定
setup_logging(log_level=settings.log_level, debug=settings.debug)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    アプリケーションライフサイクル管理

    起動時と終了時の処理を定義します。
    """
    # 起動時処理
    logger.info("Starting application", version="1.0.0")

    # データベース初期化 (MySQL/SQLAlchemy)
    try:
        await init_database()
        logger.info("Database connection established")
    except Exception as e:
        logger.error("Failed to connect to database", error=str(e))
        raise

    # ワークスペースディレクトリ作成
    import os

    os.makedirs(settings.workspace_base, exist_ok=True)
    logger.info("Workspace directory initialized", path=settings.workspace_base)

    # Cronスケジューラー起動
    try:
        scheduler = await get_cron_scheduler()
        logger.info("Cron scheduler initialized")
    except Exception as e:
        logger.error("Failed to initialize cron scheduler", error=str(e))

    yield

    # 終了時処理
    logger.info("Shutting down application")

    # Cronスケジューラー停止
    await shutdown_cron_scheduler()
    logger.info("Cron scheduler stopped")

    # データベース接続クローズ
    await close_database()
    logger.info("Database connection closed")


# FastAPI アプリケーション初期化
app = FastAPI(
    title="Claude Code Backend",
    description="Web版Claude Code バックエンドAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# エラーハンドラー
@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException) -> JSONResponse:
    """アプリケーション例外ハンドラー"""
    error_response = ErrorResponse(
        code=exc.code, message=exc.message, details=exc.details
    )
    return JSONResponse(
        status_code=exc.status_code, content=error_response.model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception) -> JSONResponse:
    """一般例外ハンドラー"""
    logger.error("Unhandled exception", error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"code": "internal_error", "message": "Internal server error"},
    )


# ルート登録
app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(projects.router, prefix=settings.api_prefix)
app.include_router(sessions.router, prefix=settings.api_prefix)
app.include_router(files.router, prefix=settings.api_prefix)
app.include_router(mcp.router, prefix=settings.api_prefix)
app.include_router(agents.router, prefix=settings.api_prefix)
app.include_router(commands.router, prefix=settings.api_prefix)
app.include_router(skills.router, prefix=settings.api_prefix)
app.include_router(cron.router, prefix=settings.api_prefix)
app.include_router(shares.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(project_config.router, prefix=settings.api_prefix)
app.include_router(templates.router, prefix=settings.api_prefix)


# WebSocketエンドポイント
@app.websocket(f"{settings.ws_prefix}/chat/{{session_id}}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str) -> None:
    """
    チャットWebSocketエンドポイント

    Args:
        websocket: WebSocketインスタンス
        session_id: セッションID
    """
    await handle_chat_websocket(websocket, session_id)


# ルートエンドポイント
@app.get("/")
async def root() -> dict:
    """ルートエンドポイント"""
    return {
        "name": "Claude Code Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


# アプリケーション起動
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
