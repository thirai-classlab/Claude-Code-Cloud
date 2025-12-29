"""
Authentication Module

FastAPI-Usersを使用した認証機能
StringベースのIDを使用するカスタム実装
"""

from app.core.auth.backend import auth_backend
from app.core.auth.db import get_user_db, SQLAlchemyUserDatabaseString
from app.core.auth.manager import get_user_manager, UserManager
from app.core.auth.users import (
    current_active_user,
    current_superuser,
    current_user,
    current_user_optional,
    current_verified_user,
    fastapi_users,
)

__all__ = [
    # Backend
    "auth_backend",
    # Database
    "get_user_db",
    "SQLAlchemyUserDatabaseString",
    # Manager
    "get_user_manager",
    "UserManager",
    # Users
    "current_active_user",
    "current_superuser",
    "current_user",
    "current_user_optional",
    "current_verified_user",
    "fastapi_users",
]
