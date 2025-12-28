"""
Logging Configuration

構造化ログの設定
"""

import logging
import sys
from typing import Any

import structlog


def setup_logging(log_level: str = "INFO", debug: bool = False) -> None:
    """
    ロギング設定の初期化

    Args:
        log_level: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        debug: デバッグモード
    """
    # ログレベル設定
    level = logging.DEBUG if debug else getattr(logging, log_level.upper())

    # 標準ライブラリロガー設定
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    # structlog設定
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if not debug else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> Any:
    """
    ロガーインスタンス取得

    Args:
        name: ロガー名 (通常は __name__)

    Returns:
        structlog.BoundLogger: 構造化ロガー
    """
    return structlog.get_logger(name)
