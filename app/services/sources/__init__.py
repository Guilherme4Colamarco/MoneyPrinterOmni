"""素材来源的公共接口。

具体供应商适配器尚未接入；调用方应依赖 :class:`Source` 与 :class:`SourceItem`。
"""

from app.services.sources.base import (
    License,
    Source,
    SourceItem,
    SourceName,
    SourceType,
    parse_covers,
    parse_duration,
    parse_license,
    parse_published_at,
    parse_source_item,
    parse_source_name,
    parse_source_type,
)

__all__ = [
    "License",
    "Source",
    "SourceItem",
    "SourceName",
    "SourceType",
    "parse_covers",
    "parse_duration",
    "parse_license",
    "parse_published_at",
    "parse_source_item",
    "parse_source_name",
    "parse_source_type",
]
