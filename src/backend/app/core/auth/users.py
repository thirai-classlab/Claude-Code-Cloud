"""
FastAPI-Users Configuration

FastAPIUsersインスタンスと依存性の定義
StringベースのIDを使用
"""

from fastapi_users import FastAPIUsers

from app.core.auth.backend import auth_backend
from app.core.auth.manager import get_user_manager
from app.models.database import UserModel


# FastAPIUsersインスタンス（StringベースのID）
fastapi_users = FastAPIUsers[UserModel, str](
    get_user_manager,
    [auth_backend],
)

# 依存性（Dependency Injection用）
current_user = fastapi_users.current_user()
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
current_verified_user = fastapi_users.current_user(active=True, verified=True)

# オプショナルユーザー（認証が必須でない場合に使用）
current_user_optional = fastapi_users.current_user(optional=True)
