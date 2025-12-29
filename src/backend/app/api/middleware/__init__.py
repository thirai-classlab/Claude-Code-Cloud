"""
Middleware module for API error handling and request processing.
"""

from app.api.middleware.error_handler import handle_exceptions

__all__ = ["handle_exceptions"]
