"""Public interface for material sources.

Vendor adapters are not wired yet. Callers should depend on :class:`Source`
and :class:`SourceItem`. Adapters must store the public page URL, never a
signed file URL. Search env vars live in :data:`SOURCE_ENV_VARS`.
Validate ``licencas.json`` with :func:`validate_licencas_file` or
``python -m app.services.sources``.
"""

from app.services.sources.base import (
    GENERATOR_SOURCE_NAMES,
    SEARCHABLE_SOURCE_NAMES,
    SEARCH_SOURCE_NAMES,
    SOURCE_ENV_VARS,
    License,
    Source,
    SourceEnvSpec,
    SourceItem,
    SourceItemError,
    SourceName,
    SourceType,
    missing_env_names,
    missing_source_env_vars,
    register_search_env,
    parse_covers,
    parse_duration,
    parse_license,
    parse_published_at,
    parse_search_limit,
    parse_source_item,
    source_item_error_details,
    parse_source_name,
    parse_source_type,
    parse_url,
    require_source_env,
    validate_search_results,
)
from app.services.sources.licencas import (
    LicenseIssue,
    validate_licencas,
    validate_licencas_file,
)

__all__ = [
    "GENERATOR_SOURCE_NAMES",
    "SEARCHABLE_SOURCE_NAMES",
    "SEARCH_SOURCE_NAMES",
    "SOURCE_ENV_VARS",
    "License",
    "LicenseIssue",
    "Source",
    "SourceEnvSpec",
    "SourceItem",
    "SourceItemError",
    "SourceName",
    "SourceType",
    "missing_env_names",
    "missing_source_env_vars",
    "parse_covers",
    "parse_duration",
    "parse_license",
    "parse_published_at",
    "parse_search_limit",
    "parse_source_item",
    "source_item_error_details",
    "parse_source_name",
    "parse_source_type",
    "parse_url",
    "register_search_env",
    "require_source_env",
    "validate_licencas",
    "validate_licencas_file",
    "validate_search_results",
]
