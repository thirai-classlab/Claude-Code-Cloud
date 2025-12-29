"""
Template Management API

プロジェクトテンプレート管理エンドポイント
認証必須：JWTトークンが必要
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.api.middleware import handle_exceptions
from app.core.auth.users import current_active_user
from app.models.database import UserModel
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
    TemplateFileCreate,
    TemplateFileResponse,
    CreateProjectFromTemplateRequest,
    CreateTemplateFromProjectRequest,
)
from app.schemas.response import ProjectResponse
from app.services.template_service import TemplateService

router = APIRouter(prefix="/templates", tags=["templates"])


async def get_template_service(
    session: AsyncSession = Depends(get_db_session),
) -> TemplateService:
    """TemplateService取得"""
    return TemplateService(session)


# ============================================
# Template CRUD
# ============================================


@router.get("", response_model=List[TemplateListResponse])
@handle_exceptions
async def list_templates(
    current_user: UserModel = Depends(current_active_user),
    include_public: bool = Query(default=True, description="公開テンプレートを含める"),
    search: Optional[str] = Query(default=None, description="検索キーワード"),
    service: TemplateService = Depends(get_template_service),
) -> List[TemplateListResponse]:
    """
    テンプレート一覧取得

    自分のテンプレートと公開テンプレートを返す
    """
    return await service.list_templates(
        user_id=current_user.id,
        include_public=include_public,
        search=search,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
@handle_exceptions
async def get_template(
    template_id: str,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """
    テンプレート詳細取得

    自分のテンプレートまたは公開テンプレートのみ閲覧可能
    """
    template = await service.get_template(template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        is_public=template.is_public,
        mcp_servers=template.mcp_servers or [],
        agents=template.agents or [],
        skills=template.skills or [],
        commands=template.commands or [],
        files=[
            TemplateFileResponse(
                id=f.id,
                template_id=f.template_id,
                file_path=f.file_path,
                content=f.content,
                created_at=f.created_at,
            )
            for f in (template.files or [])
        ],
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("", response_model=TemplateResponse, status_code=201)
@handle_exceptions
async def create_template(
    request: TemplateCreate,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """
    テンプレート作成
    """
    template = await service.create_template(current_user.id, request)

    return TemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        is_public=template.is_public,
        mcp_servers=template.mcp_servers or [],
        agents=template.agents or [],
        skills=template.skills or [],
        commands=template.commands or [],
        files=[
            TemplateFileResponse(
                id=f.id,
                template_id=f.template_id,
                file_path=f.file_path,
                content=f.content,
                created_at=f.created_at,
            )
            for f in (template.files or [])
        ],
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.patch("/{template_id}", response_model=TemplateResponse)
@handle_exceptions
async def update_template(
    template_id: str,
    request: TemplateUpdate,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """
    テンプレート更新（所有者のみ）
    """
    template = await service.update_template(template_id, current_user.id, request)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or access denied")

    # filesを再取得
    template = await service.get_template(template_id, current_user.id)

    return TemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        is_public=template.is_public,
        mcp_servers=template.mcp_servers or [],
        agents=template.agents or [],
        skills=template.skills or [],
        commands=template.commands or [],
        files=[
            TemplateFileResponse(
                id=f.id,
                template_id=f.template_id,
                file_path=f.file_path,
                content=f.content,
                created_at=f.created_at,
            )
            for f in (template.files or [])
        ],
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.delete("/{template_id}", status_code=204)
@handle_exceptions
async def delete_template(
    template_id: str,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> None:
    """
    テンプレート削除（所有者のみ）
    """
    success = await service.delete_template(template_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found or access denied")


# ============================================
# Template File Operations
# ============================================


@router.post("/{template_id}/files", response_model=TemplateFileResponse, status_code=201)
@handle_exceptions
async def add_template_file(
    template_id: str,
    request: TemplateFileCreate,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> TemplateFileResponse:
    """
    テンプレートにファイルを追加（所有者のみ）
    """
    template_file = await service.add_template_file(template_id, current_user.id, request)
    if not template_file:
        raise HTTPException(status_code=404, detail="Template not found or access denied")

    return TemplateFileResponse(
        id=template_file.id,
        template_id=template_file.template_id,
        file_path=template_file.file_path,
        content=template_file.content,
        created_at=template_file.created_at,
    )


@router.delete("/{template_id}/files/{file_id}", status_code=204)
@handle_exceptions
async def delete_template_file(
    template_id: str,
    file_id: str,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> None:
    """
    テンプレートからファイルを削除（所有者のみ）
    """
    success = await service.delete_template_file(template_id, current_user.id, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template or file not found, or access denied")


# ============================================
# Template <-> Project Operations
# ============================================


@router.post("/from-project", response_model=TemplateResponse, status_code=201)
@handle_exceptions
async def create_template_from_project(
    request: CreateTemplateFromProjectRequest,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """
    既存プロジェクトからテンプレートを作成

    プロジェクトの設定（MCP、Agent、Skill、Command）とワークスペースファイルをテンプレート化
    """
    template = await service.create_template_from_project(current_user.id, request)
    if not template:
        raise HTTPException(status_code=404, detail="Project not found")

    # filesを再取得
    template = await service.get_template(template.id, current_user.id)

    return TemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        is_public=template.is_public,
        mcp_servers=template.mcp_servers or [],
        agents=template.agents or [],
        skills=template.skills or [],
        commands=template.commands or [],
        files=[
            TemplateFileResponse(
                id=f.id,
                template_id=f.template_id,
                file_path=f.file_path,
                content=f.content,
                created_at=f.created_at,
            )
            for f in (template.files or [])
        ],
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("/create-project", response_model=ProjectResponse, status_code=201)
@handle_exceptions
async def create_project_from_template(
    request: CreateProjectFromTemplateRequest,
    current_user: UserModel = Depends(current_active_user),
    service: TemplateService = Depends(get_template_service),
) -> ProjectResponse:
    """
    テンプレートから新規プロジェクトを作成

    テンプレートの設定とファイルをプロジェクトにコピー
    """
    project = await service.create_project_from_template(current_user.id, request)
    if not project:
        raise HTTPException(status_code=404, detail="Template not found or access denied")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        user_id=project.user_id,
        status=project.status,
        workspace_path=project.workspace_path,
        session_count=project.session_count,
        api_key=project.api_key,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )
