"""
Usage Service

プロジェクトの使用量集計と利用制限チェックサービス
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import ProjectModel, SessionModel
from app.utils.helpers import jst_now


class UsageService:
    """使用量サービス"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_cost_by_period(
        self,
        project_id: str,
        days: int
    ) -> Tuple[float, int, int]:
        """
        指定期間のコスト・トークン数を取得

        Args:
            project_id: プロジェクトID
            days: 過去何日分を取得するか

        Returns:
            Tuple[cost, input_tokens, output_tokens]
        """
        since = datetime.now(timezone.utc) - timedelta(days=days)

        result = await self.session.execute(
            select(
                func.coalesce(func.sum(SessionModel.total_cost_usd), 0.0).label("cost"),
                func.coalesce(func.sum(SessionModel.total_tokens), 0).label("tokens"),
                func.count(SessionModel.id).label("session_count"),
            )
            .where(SessionModel.project_id == project_id)
            .where(SessionModel.created_at >= since)
        )
        row = result.one()
        return float(row.cost), int(row.tokens), int(row.session_count)

    async def get_usage_stats(self, project_id: str) -> dict:
        """
        プロジェクトの使用量統計を取得

        Args:
            project_id: プロジェクトID

        Returns:
            使用量統計辞書
        """
        # 全期間の統計
        result = await self.session.execute(
            select(
                func.coalesce(func.sum(SessionModel.total_cost_usd), 0.0).label("total_cost"),
                func.coalesce(func.sum(SessionModel.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(SessionModel.message_count), 0).label("message_count"),
                func.count(SessionModel.id).label("session_count"),
            )
            .where(SessionModel.project_id == project_id)
        )
        total_row = result.one()

        # 期間別コスト
        cost_daily, _, _ = await self.get_cost_by_period(project_id, 1)
        cost_weekly, _, _ = await self.get_cost_by_period(project_id, 7)
        cost_monthly, _, _ = await self.get_cost_by_period(project_id, 30)

        return {
            "project_id": project_id,
            "total_tokens": int(total_row.total_tokens),
            "total_cost": float(total_row.total_cost),
            "input_tokens": 0,  # 現状SessionModelには分離されていない
            "output_tokens": 0,
            "session_count": int(total_row.session_count),
            "message_count": int(total_row.message_count),
            "cost_daily": cost_daily,
            "cost_weekly": cost_weekly,
            "cost_monthly": cost_monthly,
        }

    async def check_cost_limits(self, project_id: str) -> dict:
        """
        プロジェクトの利用制限をチェック

        Args:
            project_id: プロジェクトID

        Returns:
            利用制限チェック結果辞書
        """
        # プロジェクトの制限設定を取得
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            return {
                "project_id": project_id,
                "can_use": False,
                "exceeded_limits": ["project_not_found"],
                "cost_daily": 0.0,
                "cost_weekly": 0.0,
                "cost_monthly": 0.0,
                "limit_daily": None,
                "limit_weekly": None,
                "limit_monthly": None,
            }

        # 期間別コスト取得
        cost_daily, _, _ = await self.get_cost_by_period(project_id, 1)
        cost_weekly, _, _ = await self.get_cost_by_period(project_id, 7)
        cost_monthly, _, _ = await self.get_cost_by_period(project_id, 30)

        # 超過チェック
        exceeded_limits: List[str] = []

        if project.cost_limit_daily is not None and cost_daily >= project.cost_limit_daily:
            exceeded_limits.append("daily")

        if project.cost_limit_weekly is not None and cost_weekly >= project.cost_limit_weekly:
            exceeded_limits.append("weekly")

        if project.cost_limit_monthly is not None and cost_monthly >= project.cost_limit_monthly:
            exceeded_limits.append("monthly")

        return {
            "project_id": project_id,
            "can_use": len(exceeded_limits) == 0,
            "exceeded_limits": exceeded_limits,
            "cost_daily": cost_daily,
            "cost_weekly": cost_weekly,
            "cost_monthly": cost_monthly,
            "limit_daily": project.cost_limit_daily,
            "limit_weekly": project.cost_limit_weekly,
            "limit_monthly": project.cost_limit_monthly,
        }

    async def update_cost_limits(
        self,
        project_id: str,
        cost_limit_daily: Optional[float] = None,
        cost_limit_weekly: Optional[float] = None,
        cost_limit_monthly: Optional[float] = None,
        clear_limits: bool = False,
    ) -> Optional[ProjectModel]:
        """
        プロジェクトの利用制限を更新

        Args:
            project_id: プロジェクトID
            cost_limit_daily: 1日の制限（USD）
            cost_limit_weekly: 7日の制限（USD）
            cost_limit_monthly: 30日の制限（USD）
            clear_limits: Trueの場合、すべての制限をクリア

        Returns:
            更新されたプロジェクト
        """
        result = await self.session.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            return None

        if clear_limits:
            project.cost_limit_daily = None
            project.cost_limit_weekly = None
            project.cost_limit_monthly = None
        else:
            # 渡された値のみ更新
            if cost_limit_daily is not None:
                project.cost_limit_daily = cost_limit_daily
            if cost_limit_weekly is not None:
                project.cost_limit_weekly = cost_limit_weekly
            if cost_limit_monthly is not None:
                project.cost_limit_monthly = cost_limit_monthly

        await self.session.commit()
        await self.session.refresh(project)

        return project
