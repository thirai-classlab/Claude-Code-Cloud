"""
Cron Scheduler Service

Manages scheduled command executions using cron expressions.
Reads schedule configurations from .cron.json in each project workspace.
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, JobExecutionEvent
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.logger import get_logger
from app.utils.database import get_session_context
from app.models.database import CronLogModel
from app.config import settings

logger = get_logger(__name__)


@dataclass
class CronScheduleConfig:
    """Cron schedule configuration"""
    name: str
    command: str
    cron: str  # Cron expression (e.g., "0 2 * * *")
    description: str = ""
    enabled: bool = True
    project_id: str = ""
    timezone: str = "Asia/Tokyo"
    args: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CronExecutionLog:
    """Execution log entry"""
    schedule_name: str
    command: str
    project_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "running"  # running, completed, failed
    result: Optional[str] = None
    error: Optional[str] = None


class CronScheduler:
    """
    Cron scheduler for command execution

    Manages scheduled tasks for all projects, loading configurations from
    .cron.json files in each workspace.
    """

    def __init__(self) -> None:
        """Initialize the cron scheduler"""
        self.scheduler = AsyncIOScheduler(timezone="Asia/Tokyo")
        self.active_schedules: Dict[str, CronScheduleConfig] = {}
        self._execution_logs: Dict[str, List[CronExecutionLog]] = {}

    async def start(self) -> None:
        """Start the scheduler"""
        self.scheduler.add_listener(self._on_job_event, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
        self.scheduler.start()
        logger.info("Cron scheduler started")

        # Load schedules for all existing projects
        await self._load_all_project_schedules()

    async def stop(self) -> None:
        """Stop the scheduler"""
        self.scheduler.shutdown(wait=False)
        logger.info("Cron scheduler stopped")

    async def _load_all_project_schedules(self) -> None:
        """Load cron schedules for all projects"""
        workspace_base = Path(settings.workspace_base)

        if not workspace_base.exists():
            logger.warning("Workspace base does not exist", path=str(workspace_base))
            return

        for project_dir in workspace_base.iterdir():
            if project_dir.is_dir():
                await self.load_project_schedules(str(project_dir))

    async def load_project_schedules(self, workspace_path: str) -> List[CronScheduleConfig]:
        """
        Load cron schedules from a project's .cron.json file

        Args:
            workspace_path: Path to the project workspace

        Returns:
            List of loaded schedule configurations
        """
        schedules: List[CronScheduleConfig] = []
        cron_path = Path(workspace_path) / ".cron.json"
        project_id = Path(workspace_path).name

        if not cron_path.exists():
            logger.debug("No .cron.json found", path=str(cron_path))
            return schedules

        try:
            with open(cron_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            schedules_data = data.get("schedules", {})

            for name, config in schedules_data.items():
                schedule = CronScheduleConfig(
                    name=name,
                    command=config.get("command", ""),
                    cron=config.get("cron", ""),
                    description=config.get("description", ""),
                    enabled=config.get("enabled", True),
                    project_id=project_id,
                    timezone=config.get("timezone", "Asia/Tokyo"),
                    args=config.get("args", {}),
                )

                if schedule.enabled and schedule.cron:
                    schedules.append(schedule)
                    await self._add_schedule(schedule)

            logger.info(
                "Loaded cron schedules for project",
                project_id=project_id,
                count=len(schedules),
                schedules=[s.name for s in schedules],
            )

        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in .cron.json", path=str(cron_path), error=str(e))
        except Exception as e:
            logger.error("Error loading .cron.json", path=str(cron_path), error=str(e))

        return schedules

    async def _add_schedule(self, schedule: CronScheduleConfig) -> bool:
        """
        Add a schedule to the scheduler

        Args:
            schedule: Schedule configuration

        Returns:
            True if added successfully
        """
        job_id = f"{schedule.project_id}:{schedule.name}"

        # Remove existing job if any
        existing = self.scheduler.get_job(job_id)
        if existing:
            self.scheduler.remove_job(job_id)

        try:
            # Parse cron expression
            trigger = CronTrigger.from_crontab(schedule.cron, timezone=schedule.timezone)

            # Add job
            self.scheduler.add_job(
                self._execute_command,
                trigger=trigger,
                id=job_id,
                args=[schedule],
                name=f"{schedule.name} ({schedule.command})",
                replace_existing=True,
            )

            self.active_schedules[job_id] = schedule

            logger.info(
                "Added cron schedule",
                job_id=job_id,
                cron=schedule.cron,
                command=schedule.command,
            )

            return True

        except Exception as e:
            logger.error(
                "Failed to add cron schedule",
                job_id=job_id,
                cron=schedule.cron,
                error=str(e),
            )
            return False

    async def _execute_command(self, schedule: CronScheduleConfig) -> None:
        """
        Execute a scheduled command

        Args:
            schedule: Schedule configuration
        """
        from pathlib import Path
        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
        from app.core.config_loader import (
            load_project_config,
            generate_enhanced_system_prompt,
            get_enabled_tools,
        )
        from app.core.project_manager import ProjectManager

        log_entry = CronExecutionLog(
            schedule_name=schedule.name,
            command=schedule.command,
            project_id=schedule.project_id,
            started_at=datetime.now(),
        )

        workspace_path = str(Path(settings.workspace_base) / schedule.project_id)

        logger.info(
            "Executing scheduled command",
            schedule=schedule.name,
            command=schedule.command,
            project_id=schedule.project_id,
        )

        try:
            # プロジェクトのAPIキーを取得
            async with get_session_context() as db_session:
                project_manager = ProjectManager(db_session)
                project = await project_manager.get_project(schedule.project_id)

                if not project:
                    raise ValueError(f"Project {schedule.project_id} not found")

                if not project.api_key:
                    raise ValueError(f"Project {schedule.project_id} has no API key configured")

                project_api_key = project.api_key

            # Load project configuration
            project_config = load_project_config(workspace_path)
            system_prompt = generate_enhanced_system_prompt(workspace_path, project_config)
            tools = get_enabled_tools(project_config)

            # Prepare command message
            command_message = schedule.command
            if schedule.args:
                command_message += f" {json.dumps(schedule.args)}"

            # Execute via Claude Agent SDK
            # プロジェクト固有のAPIキーを環境変数として渡す
            options = ClaudeAgentOptions(
                system_prompt=system_prompt + "\n\n[CRON EXECUTION] This command is being executed by the cron scheduler.",
                allowed_tools=tools,
                permission_mode="acceptEdits",
                cwd=Path(workspace_path),
                env={"ANTHROPIC_API_KEY": project_api_key},  # プロジェクト固有のAPIキー
            )

            result_text = ""

            async with ClaudeSDKClient(options=options) as client:
                await client.query(command_message)

                async for sdk_message in client.receive_response():
                    # Collect text response
                    if hasattr(sdk_message, 'content'):
                        for block in sdk_message.content:
                            if hasattr(block, 'text'):
                                result_text += block.text

            log_entry.completed_at = datetime.now()
            log_entry.status = "completed"
            log_entry.result = result_text[:5000]  # Truncate for storage

            logger.info(
                "Scheduled command completed",
                schedule=schedule.name,
                duration_ms=int((log_entry.completed_at - log_entry.started_at).total_seconds() * 1000),
            )

        except Exception as e:
            log_entry.completed_at = datetime.now()
            log_entry.status = "failed"
            log_entry.error = str(e)

            logger.error(
                "Scheduled command failed",
                schedule=schedule.name,
                error=str(e),
            )

        # Store log entry in MySQL
        await self._store_execution_log(log_entry)

    async def _store_execution_log(self, log: CronExecutionLog) -> None:
        """
        Store execution log in MySQL using SQLAlchemy

        Args:
            log: Execution log entry to store
        """
        job_id = f"{log.project_id}:{log.schedule_name}"

        try:
            async with get_session_context() as session:
                cron_log = CronLogModel(
                    job_id=job_id,
                    status=log.status,
                    started_at=log.started_at,
                    finished_at=log.completed_at,
                    result=log.result,
                    error=log.error,
                )
                session.add(cron_log)
                # Commit is handled by get_session_context

            logger.debug(
                "Stored cron execution log",
                job_id=job_id,
                status=log.status,
            )

        except Exception as e:
            logger.error(
                "Failed to store cron execution log",
                job_id=job_id,
                error=str(e),
            )

    def _on_job_event(self, event: JobExecutionEvent) -> None:
        """Handle job execution events"""
        if event.exception:
            logger.error(
                "Cron job error",
                job_id=event.job_id,
                error=str(event.exception),
            )
        else:
            logger.debug("Cron job executed", job_id=event.job_id)

    async def reload_project_schedules(self, project_id: str) -> None:
        """
        Reload schedules for a specific project

        Args:
            project_id: Project ID
        """
        # Remove existing schedules for this project
        jobs_to_remove = [
            job_id for job_id in self.active_schedules
            if job_id.startswith(f"{project_id}:")
        ]

        for job_id in jobs_to_remove:
            if self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)
            del self.active_schedules[job_id]

        # Reload schedules
        workspace_path = str(Path(settings.workspace_base) / project_id)
        await self.load_project_schedules(workspace_path)

    async def get_project_schedules(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all schedules for a project

        Args:
            project_id: Project ID

        Returns:
            List of schedule information
        """
        schedules = []

        for job_id, schedule in self.active_schedules.items():
            if schedule.project_id == project_id:
                job = self.scheduler.get_job(job_id)
                next_run = job.next_run_time if job else None

                schedules.append({
                    "name": schedule.name,
                    "command": schedule.command,
                    "cron": schedule.cron,
                    "description": schedule.description,
                    "enabled": schedule.enabled,
                    "timezone": schedule.timezone,
                    "next_run": next_run.isoformat() if next_run else None,
                })

        return schedules

    async def get_execution_logs(
        self,
        project_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get execution logs for a project from MySQL

        Args:
            project_id: Project ID
            limit: Maximum number of logs to return

        Returns:
            List of execution log entries
        """
        logs: List[Dict[str, Any]] = []

        try:
            async with get_session_context() as session:
                # Query logs for jobs matching the project_id prefix
                stmt = (
                    select(CronLogModel)
                    .where(CronLogModel.job_id.like(f"{project_id}:%"))
                    .order_by(desc(CronLogModel.created_at))
                    .limit(limit)
                )
                result = await session.execute(stmt)
                cron_logs = result.scalars().all()

                for cron_log in cron_logs:
                    # Extract schedule_name from job_id (format: "project_id:schedule_name")
                    job_parts = cron_log.job_id.split(":", 1)
                    schedule_name = job_parts[1] if len(job_parts) > 1 else cron_log.job_id

                    # Get command from active schedules or .cron.json
                    command = ""
                    schedule = self.active_schedules.get(cron_log.job_id)
                    if schedule:
                        command = schedule.command
                    else:
                        # Try to load from .cron.json file
                        try:
                            cron_path = Path(settings.workspace_base) / project_id / ".cron.json"
                            if cron_path.exists():
                                with open(cron_path, "r", encoding="utf-8") as f:
                                    cron_data = json.load(f)
                                    schedule_data = cron_data.get("schedules", {}).get(schedule_name, {})
                                    command = schedule_data.get("command", "")
                        except Exception:
                            pass

                    logs.append({
                        "id": cron_log.id,
                        "schedule_name": schedule_name,
                        "command": command,
                        "job_id": cron_log.job_id,
                        "project_id": project_id,
                        "started_at": cron_log.started_at.isoformat() if cron_log.started_at else None,
                        "completed_at": cron_log.finished_at.isoformat() if cron_log.finished_at else None,
                        "status": cron_log.status,
                        "result": cron_log.result,
                        "error": cron_log.error,
                        "created_at": cron_log.created_at.isoformat() if cron_log.created_at else None,
                    })

        except Exception as e:
            logger.error(
                "Failed to retrieve cron execution logs",
                project_id=project_id,
                error=str(e),
            )

        return logs

    async def get_all_execution_logs(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get all execution logs across all projects from MySQL

        Args:
            limit: Maximum number of logs to return
            offset: Number of logs to skip

        Returns:
            List of execution log entries
        """
        logs: List[Dict[str, Any]] = []

        try:
            async with get_session_context() as session:
                stmt = (
                    select(CronLogModel)
                    .order_by(desc(CronLogModel.created_at))
                    .offset(offset)
                    .limit(limit)
                )
                result = await session.execute(stmt)
                cron_logs = result.scalars().all()

                for cron_log in cron_logs:
                    # Extract project_id and schedule_name from job_id
                    job_parts = cron_log.job_id.split(":", 1)
                    project_id = job_parts[0] if len(job_parts) > 0 else ""
                    schedule_name = job_parts[1] if len(job_parts) > 1 else cron_log.job_id

                    logs.append({
                        "id": cron_log.id,
                        "schedule_name": schedule_name,
                        "job_id": cron_log.job_id,
                        "project_id": project_id,
                        "started_at": cron_log.started_at.isoformat() if cron_log.started_at else None,
                        "completed_at": cron_log.finished_at.isoformat() if cron_log.finished_at else None,
                        "status": cron_log.status,
                        "result": cron_log.result,
                        "error": cron_log.error,
                        "created_at": cron_log.created_at.isoformat() if cron_log.created_at else None,
                    })

        except Exception as e:
            logger.error(
                "Failed to retrieve all cron execution logs",
                error=str(e),
            )

        return logs

    async def run_command_now(
        self,
        project_id: str,
        schedule_name: str,
    ) -> bool:
        """
        Manually trigger a scheduled command immediately

        Args:
            project_id: Project ID
            schedule_name: Name of the schedule

        Returns:
            True if triggered successfully
        """
        job_id = f"{project_id}:{schedule_name}"
        schedule = self.active_schedules.get(job_id)

        if not schedule:
            logger.warning("Schedule not found", job_id=job_id)
            return False

        # Execute in background
        asyncio.create_task(self._execute_command(schedule))

        logger.info("Manually triggered command", job_id=job_id)
        return True


# Global scheduler instance
_scheduler: Optional[CronScheduler] = None


async def get_cron_scheduler() -> CronScheduler:
    """
    Get or create the global cron scheduler instance

    Returns:
        CronScheduler: The global scheduler instance
    """
    global _scheduler

    if _scheduler is None:
        _scheduler = CronScheduler()
        await _scheduler.start()

    return _scheduler


async def shutdown_cron_scheduler() -> None:
    """Shutdown the global cron scheduler"""
    global _scheduler

    if _scheduler:
        await _scheduler.stop()
        _scheduler = None
