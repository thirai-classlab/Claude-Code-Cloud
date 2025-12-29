"""
Error Handling Middleware

APIエラーハンドリング用デコレータ
"""

from functools import wraps
from typing import Callable, TypeVar, ParamSpec

from fastapi import HTTPException

from app.models.errors import AppException
from app.utils.logger import get_logger

logger = get_logger(__name__)

P = ParamSpec('P')
T = TypeVar('T')


def handle_exceptions(func: Callable[P, T]) -> Callable[P, T]:
    """
    API例外ハンドリングデコレータ

    AppExceptionをHTTPExceptionに変換し、
    予期せぬ例外をログ出力して500エラーとして返します。
    """
    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        try:
            return await func(*args, **kwargs)
        except AppException as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in {func.__name__}", error=str(e), exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")
    return wrapper
