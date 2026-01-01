"""
File Operations API

ファイル操作エンドポイント
"""

from fastapi import APIRouter, Query

from app.api.middleware import handle_exceptions
from app.config import settings
from app.schemas.response import FileContentResponse, FileInfoResponse, FileListResponse
from app.services.file_service import FileService

router = APIRouter(prefix="/files", tags=["files"])


def get_file_service() -> FileService:
    """ファイルサービス取得"""
    return FileService(workspace_base=settings.workspace_base)


@router.get("", response_model=FileListResponse)
@handle_exceptions
async def list_files(
    project_id: str = Query(..., description="プロジェクトID"),
    path: str = Query(default=".", description="ディレクトリパス"),
) -> FileListResponse:
    """
    ファイル一覧取得

    Args:
        project_id: プロジェクトID
        path: ディレクトリパス

    Returns:
        FileListResponse: ファイル一覧
    """
    service = get_file_service()
    files = await service.list_files(project_id, path)

    return FileListResponse(
        files=[
            FileInfoResponse(
                path=f.path,
                name=f.name,
                size=f.size,
                is_directory=f.is_directory,
                modified_at=f.modified_at,
            )
            for f in files
        ],
        total=len(files),
    )


@router.get("/content", response_model=FileContentResponse)
@handle_exceptions
async def read_file(
    project_id: str = Query(..., description="プロジェクトID"),
    path: str = Query(..., description="ファイルパス"),
) -> FileContentResponse:
    """
    ファイル読み込み

    Args:
        project_id: プロジェクトID
        path: ファイルパス

    Returns:
        FileContentResponse: ファイル内容
    """
    service = get_file_service()
    content = await service.read_file(project_id, path)

    return FileContentResponse(
        path=path,
        content=content,
        size=len(content),
        mime_type="text/plain",
    )


@router.post("/content", status_code=201)
@handle_exceptions
async def write_file(
    project_id: str = Query(..., description="プロジェクトID"),
    path: str = Query(..., description="ファイルパス"),
    content: str = Query(..., description="ファイル内容"),
) -> dict:
    """
    ファイル書き込み

    Args:
        project_id: プロジェクトID
        path: ファイルパス
        content: ファイル内容

    Returns:
        dict: 成功メッセージ
    """
    service = get_file_service()
    await service.write_file(project_id, path, content)

    return {"message": "File written successfully", "path": path}


@router.delete("/content", status_code=204)
@handle_exceptions
async def delete_file(
    project_id: str = Query(..., description="プロジェクトID"),
    path: str = Query(..., description="ファイルパス"),
) -> None:
    """
    ファイル削除

    Args:
        project_id: プロジェクトID
        path: ファイルパス
    """
    service = get_file_service()
    await service.delete_file(project_id, path)
