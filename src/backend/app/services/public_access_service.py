"""
Public Access Service

外部公開機能のビジネスロジック
"""

import secrets
import ipaddress
from datetime import datetime, timezone, timedelta
from typing import Optional
import bcrypt
import jwt

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.database import (
    ProjectModel,
    ProjectCommandModel,
    ProjectPublicAccessModel,
    CommandPublicSettingModel,
    PublicSessionModel,
)


settings = get_settings()


class PublicAccessService:
    """外部公開サービス"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # Public Access Settings (管理者向け)
    # ============================================

    async def get_public_access(self, project_id: str) -> Optional[ProjectPublicAccessModel]:
        """外部公開設定を取得"""
        result = await self.db.execute(
            select(ProjectPublicAccessModel).where(
                ProjectPublicAccessModel.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def create_public_access(
        self,
        project_id: str,
        enabled: bool = False,
        password: Optional[str] = None,
        allowed_ips: Optional[list[str]] = None,
        max_sessions_per_day: Optional[int] = None,
        max_messages_per_session: Optional[int] = None,
        expires_at: Optional[datetime] = None,
    ) -> ProjectPublicAccessModel:
        """外部公開設定を作成"""
        # 既存チェック
        existing = await self.get_public_access(project_id)
        if existing:
            raise ValueError("Public access already exists for this project")

        # トークン生成
        access_token = secrets.token_urlsafe(48)  # 64文字程度

        # パスワードハッシュ
        password_hash = None
        if password:
            password_hash = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

        public_access = ProjectPublicAccessModel(
            project_id=project_id,
            access_token=access_token,
            enabled=enabled,
            password_hash=password_hash,
            allowed_ips=allowed_ips,
            max_sessions_per_day=max_sessions_per_day,
            max_messages_per_session=max_messages_per_session,
            expires_at=expires_at,
        )

        self.db.add(public_access)
        await self.db.commit()
        await self.db.refresh(public_access)

        return public_access

    async def update_public_access(
        self,
        project_id: str,
        enabled: Optional[bool] = None,
        password: Optional[str] = None,
        clear_password: bool = False,
        allowed_ips: Optional[list[str]] = None,
        max_sessions_per_day: Optional[int] = None,
        max_messages_per_session: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        clear_expires_at: bool = False,
    ) -> Optional[ProjectPublicAccessModel]:
        """外部公開設定を更新"""
        public_access = await self.get_public_access(project_id)
        if not public_access:
            return None

        if enabled is not None:
            public_access.enabled = enabled

        if clear_password:
            public_access.password_hash = None
        elif password:
            public_access.password_hash = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

        if allowed_ips is not None:
            public_access.allowed_ips = allowed_ips if allowed_ips else None

        if max_sessions_per_day is not None:
            public_access.max_sessions_per_day = max_sessions_per_day

        if max_messages_per_session is not None:
            public_access.max_messages_per_session = max_messages_per_session

        if clear_expires_at:
            public_access.expires_at = None
        elif expires_at is not None:
            public_access.expires_at = expires_at

        await self.db.commit()
        await self.db.refresh(public_access)

        return public_access

    async def delete_public_access(self, project_id: str) -> bool:
        """外部公開設定を削除"""
        public_access = await self.get_public_access(project_id)
        if not public_access:
            return False

        await self.db.delete(public_access)
        await self.db.commit()
        return True

    async def regenerate_token(self, project_id: str) -> Optional[str]:
        """トークンを再生成"""
        public_access = await self.get_public_access(project_id)
        if not public_access:
            return None

        new_token = secrets.token_urlsafe(48)
        public_access.access_token = new_token

        await self.db.commit()
        return new_token

    # ============================================
    # Command Public Settings
    # ============================================

    async def get_command_public_settings(
        self, project_id: str
    ) -> list[dict]:
        """プロジェクトのコマンド公開設定一覧を取得"""
        result = await self.db.execute(
            select(ProjectCommandModel)
            .options(selectinload(ProjectCommandModel.public_setting))
            .where(
                and_(
                    ProjectCommandModel.project_id == project_id,
                    ProjectCommandModel.enabled == True,
                )
            )
            .order_by(ProjectCommandModel.name)
        )
        commands = result.scalars().all()

        return [
            {
                "command_id": cmd.id,
                "command_name": cmd.name,
                "command_description": cmd.description,
                "is_public": cmd.public_setting.is_public if cmd.public_setting else False,
                "priority": cmd.public_setting.priority if cmd.public_setting else 0,
            }
            for cmd in commands
        ]

    async def update_command_public_setting(
        self,
        command_id: str,
        is_public: bool,
        priority: int = 0,
    ) -> Optional[CommandPublicSettingModel]:
        """コマンド公開設定を更新（なければ作成）"""
        # コマンド存在確認
        result = await self.db.execute(
            select(ProjectCommandModel).where(ProjectCommandModel.id == command_id)
        )
        command = result.scalar_one_or_none()
        if not command:
            return None

        # 既存設定確認
        result = await self.db.execute(
            select(CommandPublicSettingModel).where(
                CommandPublicSettingModel.command_id == command_id
            )
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.is_public = is_public
            setting.priority = priority
        else:
            setting = CommandPublicSettingModel(
                command_id=command_id,
                is_public=is_public,
                priority=priority,
            )
            self.db.add(setting)

        await self.db.commit()
        await self.db.refresh(setting)

        return setting

    # ============================================
    # Public Sessions (管理者向け)
    # ============================================

    async def list_public_sessions(
        self,
        project_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PublicSessionModel], int]:
        """公開セッション一覧を取得"""
        # 公開設定取得
        public_access = await self.get_public_access(project_id)
        if not public_access:
            return [], 0

        # セッション一覧
        result = await self.db.execute(
            select(PublicSessionModel)
            .options(selectinload(PublicSessionModel.command))
            .where(PublicSessionModel.public_access_id == public_access.id)
            .order_by(PublicSessionModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        sessions = result.scalars().all()

        # 総数
        count_result = await self.db.execute(
            select(func.count(PublicSessionModel.id)).where(
                PublicSessionModel.public_access_id == public_access.id
            )
        )
        total = count_result.scalar() or 0

        return list(sessions), total

    async def get_public_access_stats(self, project_id: str) -> dict:
        """アクセス統計を取得"""
        public_access = await self.get_public_access(project_id)
        if not public_access:
            return {
                "total_sessions": 0,
                "today_sessions": 0,
                "total_messages": 0,
                "unique_ips": 0,
            }

        # 今日の開始時刻
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # 総セッション数
        total_result = await self.db.execute(
            select(func.count(PublicSessionModel.id)).where(
                PublicSessionModel.public_access_id == public_access.id
            )
        )
        total_sessions = total_result.scalar() or 0

        # 今日のセッション数
        today_result = await self.db.execute(
            select(func.count(PublicSessionModel.id)).where(
                and_(
                    PublicSessionModel.public_access_id == public_access.id,
                    PublicSessionModel.created_at >= today_start,
                )
            )
        )
        today_sessions = today_result.scalar() or 0

        # 総メッセージ数
        msg_result = await self.db.execute(
            select(func.sum(PublicSessionModel.message_count)).where(
                PublicSessionModel.public_access_id == public_access.id
            )
        )
        total_messages = msg_result.scalar() or 0

        # ユニークIP数
        ip_result = await self.db.execute(
            select(func.count(func.distinct(PublicSessionModel.ip_address))).where(
                PublicSessionModel.public_access_id == public_access.id
            )
        )
        unique_ips = ip_result.scalar() or 0

        return {
            "total_sessions": total_sessions,
            "today_sessions": today_sessions,
            "total_messages": total_messages,
            "unique_ips": unique_ips,
        }

    # ============================================
    # Public API (認証不要)
    # ============================================

    async def get_public_access_by_token(
        self, token: str
    ) -> Optional[ProjectPublicAccessModel]:
        """トークンから公開設定を取得"""
        result = await self.db.execute(
            select(ProjectPublicAccessModel)
            .options(selectinload(ProjectPublicAccessModel.project))
            .where(ProjectPublicAccessModel.access_token == token)
        )
        return result.scalar_one_or_none()

    def check_ip_allowed(
        self, public_access: ProjectPublicAccessModel, client_ip: str
    ) -> bool:
        """IPアドレスが許可されているかチェック"""
        if not public_access.allowed_ips:
            return True

        try:
            client_addr = ipaddress.ip_address(client_ip)
            for allowed in public_access.allowed_ips:
                try:
                    # CIDR記法対応
                    if "/" in allowed:
                        network = ipaddress.ip_network(allowed, strict=False)
                        if client_addr in network:
                            return True
                    else:
                        if client_addr == ipaddress.ip_address(allowed):
                            return True
                except ValueError:
                    continue
            return False
        except ValueError:
            return False

    def check_expired(self, public_access: ProjectPublicAccessModel) -> bool:
        """期限切れかチェック"""
        if not public_access.expires_at:
            return False
        return datetime.now(timezone.utc) > public_access.expires_at

    async def check_session_limit(
        self, public_access: ProjectPublicAccessModel
    ) -> bool:
        """今日のセッション上限に達しているかチェック"""
        if not public_access.max_sessions_per_day:
            return False

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        result = await self.db.execute(
            select(func.count(PublicSessionModel.id)).where(
                and_(
                    PublicSessionModel.public_access_id == public_access.id,
                    PublicSessionModel.created_at >= today_start,
                )
            )
        )
        today_count = result.scalar() or 0

        return today_count >= public_access.max_sessions_per_day

    def verify_password(
        self, public_access: ProjectPublicAccessModel, password: str
    ) -> bool:
        """パスワードを検証"""
        if not public_access.password_hash:
            return True
        return bcrypt.checkpw(
            password.encode("utf-8"),
            public_access.password_hash.encode("utf-8"),
        )

    def create_session_token(
        self, public_access_id: str, expires_hours: int = 24
    ) -> str:
        """セッショントークンを生成"""
        payload = {
            "public_access_id": public_access_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=expires_hours),
            "type": "public_session",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def verify_session_token(self, token: str) -> Optional[str]:
        """セッショントークンを検証し、public_access_idを返す"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("type") != "public_session":
                return None
            return payload.get("public_access_id")
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def get_public_commands(
        self, public_access: ProjectPublicAccessModel
    ) -> list[ProjectCommandModel]:
        """公開コマンド一覧を取得"""
        result = await self.db.execute(
            select(ProjectCommandModel)
            .join(CommandPublicSettingModel)
            .where(
                and_(
                    ProjectCommandModel.project_id == public_access.project_id,
                    ProjectCommandModel.enabled == True,
                    CommandPublicSettingModel.is_public == True,
                )
            )
            .order_by(
                CommandPublicSettingModel.priority,
                ProjectCommandModel.name,
            )
        )
        return list(result.scalars().all())

    async def create_public_session(
        self,
        public_access: ProjectPublicAccessModel,
        command_id: str,
        ip_address: str,
        user_agent: Optional[str] = None,
    ) -> Optional[PublicSessionModel]:
        """公開セッションを作成"""
        # コマンドが公開されているか確認
        result = await self.db.execute(
            select(ProjectCommandModel)
            .join(CommandPublicSettingModel)
            .where(
                and_(
                    ProjectCommandModel.id == command_id,
                    ProjectCommandModel.project_id == public_access.project_id,
                    CommandPublicSettingModel.is_public == True,
                )
            )
        )
        command = result.scalar_one_or_none()
        if not command:
            return None

        session = PublicSessionModel(
            public_access_id=public_access.id,
            command_id=command_id,
            ip_address=ip_address,
            user_agent=user_agent,
            message_count=0,
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_public_session(
        self, session_id: str
    ) -> Optional[PublicSessionModel]:
        """公開セッションを取得"""
        result = await self.db.execute(
            select(PublicSessionModel)
            .options(
                selectinload(PublicSessionModel.public_access),
                selectinload(PublicSessionModel.command),
            )
            .where(PublicSessionModel.id == session_id)
        )
        return result.scalar_one_or_none()

    async def increment_message_count(self, session_id: str) -> bool:
        """メッセージカウントをインクリメント"""
        result = await self.db.execute(
            select(PublicSessionModel).where(PublicSessionModel.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False

        session.message_count += 1
        session.last_activity_at = datetime.now(timezone.utc)

        await self.db.commit()
        return True

    async def check_message_limit(self, session: PublicSessionModel) -> bool:
        """メッセージ上限に達しているかチェック"""
        if not session.public_access:
            # リレーションがロードされていない場合は再取得
            result = await self.db.execute(
                select(PublicSessionModel)
                .options(selectinload(PublicSessionModel.public_access))
                .where(PublicSessionModel.id == session.id)
            )
            session = result.scalar_one_or_none()
            if not session:
                return True

        if not session.public_access.max_messages_per_session:
            return False

        return session.message_count >= session.public_access.max_messages_per_session
