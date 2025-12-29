"""
Session Manager

セッションのライフサイクル管理 (SQLAlchemy版)
"""

import json
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.models.database import SessionModel, MessageModel
from app.models.errors import MaxSessionsExceededError, ProjectNotFoundError, SessionNotFoundError
from app.models.messages import ChatMessage, MessageRole
from app.models.sessions import Session, SessionStatus
from app.utils.helpers import generate_id
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MessageSaveError(Exception):
    """メッセージ保存エラー"""
    pass


class SessionManager:
    """
    セッション管理クラス

    責務:
    - セッション作成・取得・削除
    - セッションステータス管理
    - MySQL永続化 (SQLAlchemy)
    """

    def __init__(self, session: AsyncSession):
        """
        Args:
            session: SQLAlchemy AsyncSession
        """
        self.session = session
        self.max_sessions_per_project = settings.max_sessions_per_project
        self.session_timeout = settings.session_timeout

    def _model_to_pydantic(self, model: SessionModel) -> Session:
        """SQLAlchemyモデルをPydanticモデルに変換"""
        return Session.model_validate(model)

    def _message_model_to_pydantic(self, model: MessageModel) -> ChatMessage:
        """MessageモデルをPydanticモデルに変換"""
        return ChatMessage.model_validate(model)

    async def create_session(
        self,
        project_id: str,
        name: Optional[str] = None,
        user_id: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Session:
        """
        新規セッション作成

        Args:
            project_id: 所属プロジェクトID
            name: セッション名 (オプション)
            user_id: ユーザー識別子 (オプション)
            model: 使用Claudeモデル (オプション)

        Returns:
            Session: 作成されたセッション

        Raises:
            MaxSessionsExceededError: 最大セッション数超過
        """
        # セッション数チェック
        session_count = await self._count_sessions(project_id)
        if session_count >= self.max_sessions_per_project:
            raise MaxSessionsExceededError(
                f"Maximum sessions ({self.max_sessions_per_project}) exceeded for project"
            )

        # セッション生成
        session_id = generate_id()
        now = datetime.now(timezone.utc)

        session_model = SessionModel(
            id=session_id,
            project_id=project_id,
            name=name or f"Session {session_count + 1}",
            status="active",
            user_id=user_id,
            model=model or settings.default_model,
            message_count=0,
            total_tokens=0,
            total_cost_usd=0.0,
            created_at=now,
            updated_at=now,
            last_activity_at=now,
        )

        # DBに保存
        self.session.add(session_model)
        await self.session.flush()

        logger.info("Session created", session_id=session_id, project_id=project_id)
        return self._model_to_pydantic(session_model)

    async def get_session(self, session_id: str) -> Optional[Session]:
        """
        セッション取得

        Args:
            session_id: セッションID

        Returns:
            Optional[Session]: セッション (存在しない場合 None)
        """
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        session_model = result.scalar_one_or_none()

        if not session_model:
            return None

        return self._model_to_pydantic(session_model)

    async def list_sessions(
        self, project_id: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> List[Session]:
        """
        セッション一覧取得

        Args:
            project_id: プロジェクトID (指定時はそのプロジェクトのセッションのみ)
            limit: 最大取得件数
            offset: オフセット

        Returns:
            List[Session]: セッションリスト
        """
        stmt = select(SessionModel)

        if project_id is not None:
            stmt = stmt.where(SessionModel.project_id == project_id)

        stmt = stmt.order_by(SessionModel.last_activity_at.desc()).offset(offset).limit(limit)

        result = await self.session.execute(stmt)
        session_models = result.scalars().all()

        return [self._model_to_pydantic(s) for s in session_models]

    async def update_session(
        self,
        session_id: str,
        name: Optional[str] = None,
        status: Optional[SessionStatus] = None,
    ) -> Optional[Session]:
        """
        セッション更新

        Args:
            session_id: セッションID
            name: 新しいセッション名 (オプション)
            status: 新しいステータス (オプション)

        Returns:
            Optional[Session]: 更新されたセッション
        """
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        session_model = result.scalar_one_or_none()

        if not session_model:
            return None

        if name:
            session_model.name = name
        if status:
            session_model.status = status.value
        session_model.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        logger.info("Session updated", session_id=session_id)
        return self._model_to_pydantic(session_model)

    async def update_activity(self, session_id: str) -> None:
        """
        セッションの最終アクティビティを更新

        Args:
            session_id: セッションID
        """
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        session_model = result.scalar_one_or_none()

        if session_model:
            session_model.last_activity_at = datetime.now(timezone.utc)
            await self.session.flush()

    async def update_usage(
        self, session_id: str, tokens: int, cost_usd: float
    ) -> Optional[Session]:
        """
        セッションの使用量を更新

        Args:
            session_id: セッションID
            tokens: 追加トークン数
            cost_usd: 追加コスト (USD)

        Returns:
            Optional[Session]: 更新されたセッション
        """
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        session_model = result.scalar_one_or_none()

        if not session_model:
            return None

        session_model.message_count += 1
        session_model.total_tokens += tokens
        session_model.total_cost_usd += cost_usd
        session_model.updated_at = datetime.now(timezone.utc)
        session_model.last_activity_at = datetime.now(timezone.utc)

        await self.session.flush()
        return self._model_to_pydantic(session_model)

    async def close_session(self, session_id: str) -> Optional[Session]:
        """
        セッションをクローズ

        Args:
            session_id: セッションID

        Returns:
            Optional[Session]: クローズされたセッション
        """
        return await self.update_session(session_id, status=SessionStatus.CLOSED)

    async def delete_session(self, session_id: str) -> None:
        """
        セッション削除

        Args:
            session_id: セッションID
        """
        stmt = delete(SessionModel).where(SessionModel.id == session_id)
        await self.session.execute(stmt)
        await self.session.flush()
        logger.info("Session deleted", session_id=session_id)

    async def _count_sessions(self, project_id: str) -> int:
        """プロジェクト配下のセッション数カウント"""
        stmt = select(func.count(SessionModel.id)).where(
            SessionModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    # メッセージ履歴管理
    async def save_message(
        self, session_id: str, role: MessageRole, content: str, tokens: Optional[int] = None,
        max_retries: int = 3
    ) -> ChatMessage:
        """
        セッションにメッセージを保存（リトライ機能付き）

        Args:
            session_id: セッションID
            role: メッセージロール
            content: メッセージ内容
            tokens: トークン数 (オプション)
            max_retries: 最大リトライ回数

        Returns:
            ChatMessage: 保存されたメッセージ

        Raises:
            MessageSaveError: 保存失敗時
        """
        message_id = generate_id()
        now = datetime.now(timezone.utc)

        message_model = MessageModel(
            id=message_id,
            session_id=session_id,
            role=role.value if hasattr(role, 'value') else str(role),
            content=content,
            tokens=tokens,
            created_at=now,
        )

        last_error = None
        for attempt in range(max_retries):
            try:
                self.session.add(message_model)
                await self.session.flush()
                logger.info("Message saved", session_id=session_id, message_id=message_id)
                return self._message_model_to_pydantic(message_model)
            except SQLAlchemyError as e:
                last_error = e
                logger.warning(
                    "Message save failed, retrying",
                    session_id=session_id,
                    attempt=attempt + 1,
                    error=str(e)
                )
                await self.session.rollback()
                # 新しいIDで再試行
                message_id = generate_id()
                message_model.id = message_id

        logger.error("Message save failed after retries", session_id=session_id, error=str(last_error))
        raise MessageSaveError(f"Failed to save message after {max_retries} retries: {last_error}")

    async def save_partial_message(
        self, session_id: str, role: MessageRole, content: str, is_complete: bool = False
    ) -> ChatMessage:
        """
        部分メッセージを保存（ストリーミング中断時用）

        Args:
            session_id: セッションID
            role: メッセージロール
            content: 部分的なメッセージ内容
            is_complete: 完了フラグ

        Returns:
            ChatMessage: 保存されたメッセージ
        """
        if not content.strip():
            logger.debug("Empty content, skipping partial save", session_id=session_id)
            return None

        # 部分メッセージには [PARTIAL] プレフィックスを追加（完了時は除去）
        if not is_complete:
            content = f"[PARTIAL] {content}"

        try:
            return await self.save_message(session_id, role, content)
        except MessageSaveError as e:
            logger.error("Failed to save partial message", session_id=session_id, error=str(e))
            raise

    async def get_messages(
        self, session_id: str, limit: Optional[int] = None, offset: int = 0,
        role: Optional[MessageRole] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> List[ChatMessage]:
        """
        セッションのメッセージ履歴を取得

        Args:
            session_id: セッションID
            limit: 最大取得件数 (Noneの場合は全件)
            offset: オフセット
            role: メッセージロールでフィルタ
            start_date: 開始日時でフィルタ
            end_date: 終了日時でフィルタ
            search: メッセージ内容で検索

        Returns:
            List[ChatMessage]: メッセージリスト
        """
        conditions = [MessageModel.session_id == session_id]

        if role:
            role_value = role.value if hasattr(role, 'value') else str(role)
            conditions.append(MessageModel.role == role_value)

        if start_date:
            conditions.append(MessageModel.created_at >= start_date)

        if end_date:
            conditions.append(MessageModel.created_at <= end_date)

        if search:
            conditions.append(MessageModel.content.like(f"%{search}%"))

        stmt = select(MessageModel).where(
            and_(*conditions)
        ).order_by(MessageModel.created_at.asc()).offset(offset)

        if limit:
            stmt = stmt.limit(limit)

        result = await self.session.execute(stmt)
        message_models = result.scalars().all()

        return [self._message_model_to_pydantic(m) for m in message_models]

    async def count_messages(
        self, session_id: str,
        role: Optional[MessageRole] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> int:
        """
        セッションのメッセージ総件数を取得

        Args:
            session_id: セッションID
            role: メッセージロールでフィルタ
            start_date: 開始日時でフィルタ
            end_date: 終了日時でフィルタ
            search: メッセージ内容で検索

        Returns:
            int: メッセージ総件数
        """
        conditions = [MessageModel.session_id == session_id]

        if role:
            role_value = role.value if hasattr(role, 'value') else str(role)
            conditions.append(MessageModel.role == role_value)

        if start_date:
            conditions.append(MessageModel.created_at >= start_date)

        if end_date:
            conditions.append(MessageModel.created_at <= end_date)

        if search:
            conditions.append(MessageModel.content.like(f"%{search}%"))

        stmt = select(func.count(MessageModel.id)).where(and_(*conditions))
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_messages_with_count(
        self, session_id: str, limit: Optional[int] = None, offset: int = 0,
        role: Optional[MessageRole] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[ChatMessage], int]:
        """
        セッションのメッセージ履歴と総件数を取得

        Args:
            session_id: セッションID
            limit: 最大取得件数 (Noneの場合は全件)
            offset: オフセット
            role: メッセージロールでフィルタ
            start_date: 開始日時でフィルタ
            end_date: 終了日時でフィルタ
            search: メッセージ内容で検索

        Returns:
            Tuple[List[ChatMessage], int]: (メッセージリスト, 総件数)
        """
        messages = await self.get_messages(
            session_id, limit, offset, role, start_date, end_date, search
        )
        total = await self.count_messages(
            session_id, role, start_date, end_date, search
        )
        return messages, total

    async def delete_messages(self, session_id: str) -> None:
        """
        セッションのメッセージ履歴を削除

        Args:
            session_id: セッションID
        """
        stmt = delete(MessageModel).where(MessageModel.session_id == session_id)
        await self.session.execute(stmt)
        await self.session.flush()
        logger.info("Messages deleted", session_id=session_id)

    async def get_message_history(self, session_id: str) -> List[dict]:
        """
        Claude API形式のメッセージ履歴を取得

        Args:
            session_id: セッションID

        Returns:
            List[dict]: Claude API形式のメッセージリスト
                [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        """
        messages = await self.get_messages(session_id)
        result = []
        for msg in messages:
            content = msg.content
            # JSONとして保存されたcontentをパース
            if content.startswith('[') or content.startswith('{'):
                try:
                    content = json.loads(content)
                except json.JSONDecodeError:
                    pass  # パースできない場合はそのまま文字列として使用
            # msg.roleがenumの場合も文字列の場合も対応
            role = msg.role.value if hasattr(msg.role, 'value') else str(msg.role)
            result.append({"role": role, "content": content})
        return result

    async def save_message_history(
        self, session_id: str, messages: List[dict]
    ) -> None:
        """
        Claude API形式のメッセージ履歴を保存

        Args:
            session_id: セッションID
            messages: メッセージリスト
        """
        for msg in messages:
            role = MessageRole(msg["role"])
            content = msg["content"]
            # リストや辞書はJSONとしてシリアライズ
            if not isinstance(content, str):
                content = json.dumps(content)
            await self.save_message(session_id, role, content)
