"""
Cron Schedule API Routes

Manages cron schedules for automatic command execution.
Reads and writes .cron.json configuration files.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from redis.asyncio import Redis

from app.config import settings
from app.core.cron_scheduler import get_cron_scheduler, CronScheduler
from app.utils.redis_client import get_redis

router = APIRouter(prefix="/cron", tags=["cron"])


class CronScheduleCreate(BaseModel):
    """Request to create a new cron schedule"""
    name: str = Field(..., description="Schedule name (unique identifier)")
    command: str = Field(..., description="Command to execute (e.g., /backup)")
    cron: str = Field(..., description="Cron expression (e.g., '0 2 * * *')")
    description: str = Field("", description="Description of what this schedule does")
    enabled: bool = Field(True, description="Whether schedule is active")
    timezone: str = Field("Asia/Tokyo", description="Timezone for schedule")
    args: Dict[str, Any] = Field(default_factory=dict, description="Arguments for command")


class CronScheduleUpdate(BaseModel):
    """Request to update a cron schedule"""
    command: Optional[str] = Field(None, description="Command to execute")
    cron: Optional[str] = Field(None, description="Cron expression")
    description: Optional[str] = Field(None, description="Description")
    enabled: Optional[bool] = Field(None, description="Whether schedule is active")
    timezone: Optional[str] = Field(None, description="Timezone")
    args: Optional[Dict[str, Any]] = Field(None, description="Arguments")


class CronScheduleResponse(BaseModel):
    """Response containing schedule information"""
    name: str
    command: str
    cron: str
    description: str
    enabled: bool
    timezone: str
    next_run: Optional[str] = None


class CronConfigResponse(BaseModel):
    """Response containing full cron configuration"""
    schedules: List[CronScheduleResponse]
    path: str


class ExecutionLogResponse(BaseModel):
    """Response containing execution log"""
    schedule_name: str
    command: str
    project_id: str
    started_at: str
    completed_at: Optional[str]
    status: str
    result: Optional[str]
    error: Optional[str]


def get_cron_config_path(project_id: str) -> Path:
    """Get the path to the .cron.json file for a project"""
    workspace_base = Path(settings.workspace_path)
    project_path = workspace_base / project_id
    return project_path / ".cron.json"


def load_cron_config(project_id: str) -> Dict[str, Any]:
    """Load cron configuration from file"""
    config_path = get_cron_config_path(project_id)

    if not config_path.exists():
        return {"schedules": {}, "version": "1.0"}

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {"schedules": {}, "version": "1.0"}


def save_cron_config(project_id: str, config: Dict[str, Any]) -> None:
    """Save cron configuration to file"""
    config_path = get_cron_config_path(project_id)

    if not config_path.parent.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Project workspace not found: {project_id}"
        )

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


async def get_scheduler(redis: Redis = Depends(get_redis)) -> CronScheduler:
    """Get the cron scheduler instance"""
    return await get_cron_scheduler(redis)


@router.get("/projects/{project_id}/schedules", response_model=CronConfigResponse)
async def list_schedules(
    project_id: str,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> CronConfigResponse:
    """
    List all cron schedules for a project
    """
    config_path = get_cron_config_path(project_id)

    # Get schedules from scheduler (includes next_run info)
    active_schedules = await scheduler.get_project_schedules(project_id)

    # Also load from file to include disabled schedules
    config = load_cron_config(project_id)
    schedules_data = config.get("schedules", {})

    # Merge file config with active schedule info
    schedules = []
    for name, sched_config in schedules_data.items():
        active_info = next(
            (s for s in active_schedules if s["name"] == name),
            None
        )

        schedules.append(CronScheduleResponse(
            name=name,
            command=sched_config.get("command", ""),
            cron=sched_config.get("cron", ""),
            description=sched_config.get("description", ""),
            enabled=sched_config.get("enabled", True),
            timezone=sched_config.get("timezone", "Asia/Tokyo"),
            next_run=active_info["next_run"] if active_info else None,
        ))

    return CronConfigResponse(schedules=schedules, path=str(config_path))


@router.post("/projects/{project_id}/schedules", response_model=CronScheduleResponse)
async def create_schedule(
    project_id: str,
    request: CronScheduleCreate,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> CronScheduleResponse:
    """
    Create a new cron schedule
    """
    config = load_cron_config(project_id)
    schedules = config.get("schedules", {})

    if request.name in schedules:
        raise HTTPException(
            status_code=409,
            detail=f"Schedule '{request.name}' already exists"
        )

    # Add new schedule
    schedule_data = {
        "command": request.command,
        "cron": request.cron,
        "description": request.description,
        "enabled": request.enabled,
        "timezone": request.timezone,
        "args": request.args,
    }

    schedules[request.name] = schedule_data
    config["schedules"] = schedules

    # Save configuration
    save_cron_config(project_id, config)

    # Reload scheduler for this project
    await scheduler.reload_project_schedules(project_id)

    # Get next run time
    active_schedules = await scheduler.get_project_schedules(project_id)
    next_run = None
    for s in active_schedules:
        if s["name"] == request.name:
            next_run = s["next_run"]
            break

    return CronScheduleResponse(
        name=request.name,
        command=request.command,
        cron=request.cron,
        description=request.description,
        enabled=request.enabled,
        timezone=request.timezone,
        next_run=next_run,
    )


@router.put("/projects/{project_id}/schedules/{schedule_name}")
async def update_schedule(
    project_id: str,
    schedule_name: str,
    request: CronScheduleUpdate,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> CronScheduleResponse:
    """
    Update an existing cron schedule
    """
    config = load_cron_config(project_id)
    schedules = config.get("schedules", {})

    if schedule_name not in schedules:
        raise HTTPException(
            status_code=404,
            detail=f"Schedule '{schedule_name}' not found"
        )

    # Update fields
    current = schedules[schedule_name]

    if request.command is not None:
        current["command"] = request.command
    if request.cron is not None:
        current["cron"] = request.cron
    if request.description is not None:
        current["description"] = request.description
    if request.enabled is not None:
        current["enabled"] = request.enabled
    if request.timezone is not None:
        current["timezone"] = request.timezone
    if request.args is not None:
        current["args"] = request.args

    schedules[schedule_name] = current
    config["schedules"] = schedules

    # Save configuration
    save_cron_config(project_id, config)

    # Reload scheduler
    await scheduler.reload_project_schedules(project_id)

    # Get next run time
    active_schedules = await scheduler.get_project_schedules(project_id)
    next_run = None
    for s in active_schedules:
        if s["name"] == schedule_name:
            next_run = s["next_run"]
            break

    return CronScheduleResponse(
        name=schedule_name,
        command=current.get("command", ""),
        cron=current.get("cron", ""),
        description=current.get("description", ""),
        enabled=current.get("enabled", True),
        timezone=current.get("timezone", "Asia/Tokyo"),
        next_run=next_run,
    )


@router.delete("/projects/{project_id}/schedules/{schedule_name}")
async def delete_schedule(
    project_id: str,
    schedule_name: str,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> Dict[str, str]:
    """
    Delete a cron schedule
    """
    config = load_cron_config(project_id)
    schedules = config.get("schedules", {})

    if schedule_name not in schedules:
        raise HTTPException(
            status_code=404,
            detail=f"Schedule '{schedule_name}' not found"
        )

    del schedules[schedule_name]
    config["schedules"] = schedules

    # Save configuration
    save_cron_config(project_id, config)

    # Reload scheduler
    await scheduler.reload_project_schedules(project_id)

    return {"message": f"Schedule '{schedule_name}' deleted successfully"}


@router.post("/projects/{project_id}/schedules/{schedule_name}/toggle")
async def toggle_schedule(
    project_id: str,
    schedule_name: str,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> CronScheduleResponse:
    """
    Toggle a schedule's enabled status
    """
    config = load_cron_config(project_id)
    schedules = config.get("schedules", {})

    if schedule_name not in schedules:
        raise HTTPException(
            status_code=404,
            detail=f"Schedule '{schedule_name}' not found"
        )

    # Toggle enabled status
    current = schedules[schedule_name]
    current["enabled"] = not current.get("enabled", True)
    schedules[schedule_name] = current
    config["schedules"] = schedules

    # Save configuration
    save_cron_config(project_id, config)

    # Reload scheduler
    await scheduler.reload_project_schedules(project_id)

    # Get next run time
    next_run = None
    if current["enabled"]:
        active_schedules = await scheduler.get_project_schedules(project_id)
        for s in active_schedules:
            if s["name"] == schedule_name:
                next_run = s["next_run"]
                break

    return CronScheduleResponse(
        name=schedule_name,
        command=current.get("command", ""),
        cron=current.get("cron", ""),
        description=current.get("description", ""),
        enabled=current.get("enabled", True),
        timezone=current.get("timezone", "Asia/Tokyo"),
        next_run=next_run,
    )


@router.post("/projects/{project_id}/schedules/{schedule_name}/run")
async def run_schedule_now(
    project_id: str,
    schedule_name: str,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> Dict[str, str]:
    """
    Manually trigger a scheduled command immediately
    """
    success = await scheduler.run_command_now(project_id, schedule_name)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Schedule '{schedule_name}' not found or not active"
        )

    return {
        "message": f"Schedule '{schedule_name}' triggered successfully",
        "status": "running"
    }


@router.get("/projects/{project_id}/logs", response_model=List[ExecutionLogResponse])
async def get_execution_logs(
    project_id: str,
    limit: int = 50,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> List[ExecutionLogResponse]:
    """
    Get execution logs for a project's scheduled commands
    """
    logs = await scheduler.get_execution_logs(project_id, limit=limit)

    return [
        ExecutionLogResponse(
            schedule_name=log.get("schedule_name", ""),
            command=log.get("command", ""),
            project_id=log.get("project_id", ""),
            started_at=log.get("started_at", ""),
            completed_at=log.get("completed_at"),
            status=log.get("status", ""),
            result=log.get("result"),
            error=log.get("error"),
        )
        for log in logs
    ]


@router.post("/projects/{project_id}/reload")
async def reload_schedules(
    project_id: str,
    scheduler: CronScheduler = Depends(get_scheduler)
) -> Dict[str, str]:
    """
    Reload cron schedules from .cron.json file
    """
    await scheduler.reload_project_schedules(project_id)

    return {"message": f"Schedules reloaded for project {project_id}"}


# Cron expression helper
CRON_PRESETS = {
    "every_minute": "* * * * *",
    "every_5_minutes": "*/5 * * * *",
    "every_15_minutes": "*/15 * * * *",
    "every_30_minutes": "*/30 * * * *",
    "hourly": "0 * * * *",
    "daily_midnight": "0 0 * * *",
    "daily_9am": "0 9 * * *",
    "daily_6pm": "0 18 * * *",
    "weekly_monday": "0 9 * * 1",
    "weekly_friday": "0 17 * * 5",
    "monthly_1st": "0 0 1 * *",
}


class CronPreset(BaseModel):
    """Cron preset definition"""
    name: str
    cron: str
    description: str


@router.get("/presets", response_model=List[CronPreset])
async def get_cron_presets() -> List[CronPreset]:
    """
    Get common cron expression presets
    """
    descriptions = {
        "every_minute": "Every minute",
        "every_5_minutes": "Every 5 minutes",
        "every_15_minutes": "Every 15 minutes",
        "every_30_minutes": "Every 30 minutes",
        "hourly": "Every hour at :00",
        "daily_midnight": "Daily at midnight",
        "daily_9am": "Daily at 9:00 AM",
        "daily_6pm": "Daily at 6:00 PM",
        "weekly_monday": "Every Monday at 9:00 AM",
        "weekly_friday": "Every Friday at 5:00 PM",
        "monthly_1st": "First day of each month at midnight",
    }

    return [
        CronPreset(name=name, cron=cron, description=descriptions[name])
        for name, cron in CRON_PRESETS.items()
    ]
