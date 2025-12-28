"""
File Operations API

ファイル操作エンドポイント
"""

from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.errors import AppException
from app.schemas.request import FileDeleteRequest, FileReadRequest, FileWriteRequest
from app.schemas.response import FileContentResponse, FileInfoResponse, FileListResponse
from app.services.file_service import FileInfo, FileService
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/files", tags=["files"])


def get_file_service() -> FileService:
    """ファイルサービス取得"""
    return FileService(workspace_base=settings.workspace_base)


@router.get("", response_model=FileListResponse)
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
    try:
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

    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error listing files", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/content", response_model=FileContentResponse)
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
    try:
        service = get_file_service()
        content = await service.read_file(project_id, path)

        return FileContentResponse(
            path=path,
            content=content,
            size=len(content),
            mime_type="text/plain",
        )

    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error reading file", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/content", status_code=201)
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
    try:
        service = get_file_service()
        await service.write_file(project_id, path, content)

        return {"message": "File written successfully", "path": path}

    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error writing file", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/content", status_code=204)
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
    try:
        service = get_file_service()
        await service.delete_file(project_id, path)

    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Error deleting file", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
