"""
File Service

ファイル操作のビジネスロジック
"""

import os
from typing import List, Optional

import aiofiles

from app.core.security.validator import InputValidator
from app.models.errors import AppException, ErrorCode
from app.utils.logger import get_logger

logger = get_logger(__name__)


class FileInfo:
    """ファイル情報"""

    def __init__(
        self,
        path: str,
        name: str,
        size: int,
        is_directory: bool,
        modified_at: Optional[str] = None,
    ):
        self.path = path
        self.name = name
        self.size = size
        self.is_directory = is_directory
        self.modified_at = modified_at


class FileService:
    """
    ファイルサービス

    ファイル操作のビジネスロジックを提供します。
    """

    def __init__(self, workspace_base: str):
        """
        Args:
            workspace_base: ワークスペース基底ディレクトリ
        """
        self.workspace_base = workspace_base

    def _get_absolute_path(self, project_id: str, relative_path: str) -> str:
        """
        絶対パス取得

        Args:
            project_id: プロジェクトID
            relative_path: 相対パス

        Returns:
            str: 絶対パス
        """
        workspace_path = os.path.join(self.workspace_base, project_id)
        return os.path.join(workspace_path, relative_path)

    async def list_files(self, project_id: str, path: str = ".") -> List[FileInfo]:
        """
        ファイル一覧取得

        Args:
            project_id: プロジェクトID
            path: ディレクトリパス (相対パス)

        Returns:
            List[FileInfo]: ファイル情報リスト
        """
        workspace_path = os.path.join(self.workspace_base, project_id)
        abs_path = self._get_absolute_path(project_id, path)

        # パス検証
        InputValidator.validate_file_path(path, workspace_path)

        if not os.path.exists(abs_path):
            raise AppException(
                code=ErrorCode.FILE_NOT_FOUND,
                message=f"Path {path} not found",
                status_code=404,
            )

        files = []
        try:
            for entry in os.listdir(abs_path):
                entry_path = os.path.join(abs_path, entry)
                stat = os.stat(entry_path)

                files.append(
                    FileInfo(
                        path=os.path.join(path, entry),
                        name=entry,
                        size=stat.st_size,
                        is_directory=os.path.isdir(entry_path),
                        modified_at=str(stat.st_mtime),
                    )
                )
        except PermissionError:
            raise AppException(
                code=ErrorCode.FILE_ACCESS_DENIED,
                message=f"Permission denied: {path}",
                status_code=403,
            )

        return files

    async def read_file(self, project_id: str, file_path: str) -> str:
        """
        ファイル読み込み

        Args:
            project_id: プロジェクトID
            file_path: ファイルパス (相対パス)

        Returns:
            str: ファイル内容
        """
        workspace_path = os.path.join(self.workspace_base, project_id)
        abs_path = self._get_absolute_path(project_id, file_path)

        # パス検証
        InputValidator.validate_file_path(file_path, workspace_path)

        if not os.path.exists(abs_path):
            raise AppException(
                code=ErrorCode.FILE_NOT_FOUND,
                message=f"File {file_path} not found",
                status_code=404,
            )

        if os.path.isdir(abs_path):
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message=f"{file_path} is a directory",
                status_code=400,
            )

        try:
            async with aiofiles.open(abs_path, mode="r", encoding="utf-8") as f:
                content = await f.read()
            return content
        except PermissionError:
            raise AppException(
                code=ErrorCode.FILE_ACCESS_DENIED,
                message=f"Permission denied: {file_path}",
                status_code=403,
            )
        except UnicodeDecodeError:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message=f"File {file_path} is not a text file",
                status_code=400,
            )

    async def write_file(self, project_id: str, file_path: str, content: str) -> None:
        """
        ファイル書き込み

        Args:
            project_id: プロジェクトID
            file_path: ファイルパス (相対パス)
            content: ファイル内容
        """
        workspace_path = os.path.join(self.workspace_base, project_id)
        abs_path = self._get_absolute_path(project_id, file_path)

        # パス検証
        InputValidator.validate_file_path(file_path, workspace_path)

        # ディレクトリ作成
        dir_path = os.path.dirname(abs_path)
        os.makedirs(dir_path, exist_ok=True)

        try:
            async with aiofiles.open(abs_path, mode="w", encoding="utf-8") as f:
                await f.write(content)
            logger.info("File written", project_id=project_id, path=file_path)
        except PermissionError:
            raise AppException(
                code=ErrorCode.FILE_ACCESS_DENIED,
                message=f"Permission denied: {file_path}",
                status_code=403,
            )

    async def delete_file(self, project_id: str, file_path: str) -> None:
        """
        ファイル削除

        Args:
            project_id: プロジェクトID
            file_path: ファイルパス (相対パス)
        """
        workspace_path = os.path.join(self.workspace_base, project_id)
        abs_path = self._get_absolute_path(project_id, file_path)

        # パス検証
        InputValidator.validate_file_path(file_path, workspace_path)

        if not os.path.exists(abs_path):
            raise AppException(
                code=ErrorCode.FILE_NOT_FOUND,
                message=f"File {file_path} not found",
                status_code=404,
            )

        try:
            if os.path.isdir(abs_path):
                os.rmdir(abs_path)
            else:
                os.remove(abs_path)
            logger.info("File deleted", project_id=project_id, path=file_path)
        except PermissionError:
            raise AppException(
                code=ErrorCode.FILE_ACCESS_DENIED,
                message=f"Permission denied: {file_path}",
                status_code=403,
            )
        except OSError as e:
            raise AppException(
                code=ErrorCode.INTERNAL_ERROR,
                message=f"Failed to delete {file_path}: {str(e)}",
                status_code=500,
            )
