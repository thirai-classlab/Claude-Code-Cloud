"""
Authentication Routes

認証関連のAPIエンドポイント
"""

from fastapi import APIRouter, Depends

from app.core.auth.backend import auth_backend
from app.core.auth.users import current_active_user, fastapi_users
from app.models.database import UserModel
from app.schemas.user import UserCreate, UserRead, UserUpdate

# メインルーター
router = APIRouter(prefix="/auth", tags=["auth"])

# 認証ルーター（ログイン/ログアウト）
# POST /auth/login - ログイン（JWTトークン取得）
# POST /auth/logout - ログアウト
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
)

# 登録ルーター
# POST /auth/register - 新規ユーザー登録
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
)

# ユーザー管理ルーター
# GET /auth/users/me - 現在のユーザー情報取得
# PATCH /auth/users/me - 現在のユーザー情報更新
# GET /auth/users/{id} - 指定ユーザー情報取得（スーパーユーザーのみ）
# PATCH /auth/users/{id} - 指定ユーザー情報更新（スーパーユーザーのみ）
# DELETE /auth/users/{id} - 指定ユーザー削除（スーパーユーザーのみ）
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
)


@router.get("/me", response_model=UserRead, tags=["auth"])
async def get_current_user(
    user: UserModel = Depends(current_active_user),
) -> UserRead:
    """
    現在のユーザー情報取得

    認証済みユーザーの情報を返します。

    Returns:
        UserRead: 現在のユーザー情報
    """
    return UserRead(
        id=user.id,
        email=user.email,
        is_active=bool(user.is_active),
        is_superuser=bool(user.is_superuser),
        is_verified=bool(user.is_verified),
        display_name=user.display_name,
    )
