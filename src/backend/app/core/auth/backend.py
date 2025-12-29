"""
Authentication Backend

JWT認証バックエンド設定
"""

from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)

from app.config import settings

# Bearer Token Transport
# Authorization: Bearer <token> 形式でトークンを送受信
bearer_transport = BearerTransport(tokenUrl="auth/login")


def get_jwt_strategy() -> JWTStrategy:
    """
    JWT認証ストラテジー取得

    Returns:
        JWTStrategy: JWT認証用ストラテジー
            - secret: settings.secret_key
            - lifetime: 3600秒（1時間）
    """
    return JWTStrategy(
        secret=settings.secret_key,
        lifetime_seconds=3600,  # 1時間
    )


# 認証バックエンド
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)
