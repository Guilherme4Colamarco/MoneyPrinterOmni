"""素材来源的公共接口。

具体供应商适配器尚未接入；调用方应依赖 :class:`Source` 与 :class:`SourceItem`。
搜索源的环境变量见 :data:`SOURCE_ENV_VARS` 与 :func:`require_source_env`。
"""

from app.services.sources.base import (
    SOURCE_ENV_VARS,
    License,
    Source,
    SourceEnvSpec,
    SourceItem,
    SourceName,
    SourceType,
    missing_source_env_vars,
    parse_covers,
    parse_duration,
    parse_license,
    parse_published_at,
    parse_source_item,
    parse_source_name,
    parse_source_type,
    require_source_env,
)

__all__ = [
    "SOURCE_ENV_VARS",
    "License",
    "Source",
    "SourceEnvSpec",
    "SourceItem",
    "SourceName",
    "SourceType",
    "missing_source_env_vars",
    "parse_covers",
    "parse_duration",
    "parse_license",
    "parse_published_at",
    "parse_source_item",
    "parse_source_name",
    "parse_source_type",
    "require_source_env",
]
