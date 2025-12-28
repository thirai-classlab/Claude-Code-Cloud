"""
Helper Functions

汎用ヘルパー関数
"""

import hashlib
import uuid
from datetime import datetime
from typing import Any, Dict


def generate_id() -> str:
    """UUID v4 を生成"""
    return str(uuid.uuid4())


def generate_hash(data: str) -> str:
    """SHA256ハッシュを生成"""
    return hashlib.sha256(data.encode()).hexdigest()


def current_timestamp() -> str:
    """現在のタイムスタンプをISO形式で取得"""
    return datetime.utcnow().isoformat()


def safe_dict_get(d: Dict[str, Any], key: str, default: Any = None) -> Any:
    """辞書から安全に値を取得"""
    try:
        return d.get(key, default)
    except (AttributeError, TypeError):
        return default


def truncate_string(s: str, max_length: int = 100, suffix: str = "...") -> str:
    """文字列を切り詰める"""
    if len(s) <= max_length:
        return s
    return s[: max_length - len(suffix)] + suffix
