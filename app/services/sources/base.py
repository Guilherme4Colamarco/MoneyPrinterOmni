"""Common contract for material sources.

This module only defines the search interface and the shared item model.
Existing Pexels / Pixabay / Coverr / WaveSpeed services are not wired here.
Adapters can implement :class:`Source` and parse vendor payloads into
:class:`SourceItem`.

Field contract (aligned with ``.agents/pipeline.md`` ``sources.json`` and
the material providers in ``app/services``):

- ``url``: required original http(s) link. javascript:, ftp:, file paths
  and other non-http locators are rejected.
- ``id``: optional vendor-side identifier.
- ``source``: source name (:class:`SourceName`).
- ``type``: kind of material (:class:`SourceType`).
- ``license``: rights class (:class:`License`), default ``desconhecida``.
- ``license_note``: extra credit text (short-clip note, attribution).
- ``covers``: script blocks or scenes this item illustrates, as in
  ``sources.json`` (for example ``["bloco 2: portais entre os jogos"]``).
  Kept because the director's spec requires it.
- ``duration``: length in seconds (int/float or None). Strings are rejected.
- ``published_at``: timezone-aware ISO 8601; naive datetimes are rejected.

``search`` is wrapped so it checks environment variables
(:data:`SOURCE_ENV_VARS`), validates ``limit``, and checks the returned
list. Missing required vars log the variable **names** only and return
``[]`` without raising or making network calls. ``YOUTUBE_API_KEY`` is
required until Guilherme decides otherwise.
"""

from __future__ import annotations

import functools
import json
import math
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Mapping, TypeVar
from urllib.parse import urlsplit

from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

_F = TypeVar("_F", bound=Callable[..., list[Any]])
_SOURCE_ENV_GUARD_ATTR = "_source_env_guarded"


class SourceType(str, Enum):
    """Kind of material.

    Values match ``sources.json`` (video, image, stock, chart, user) plus
    post and text for X / Reddit / Instagram search results.
    """

    video = "video"
    image = "image"
    post = "post"
    text = "text"
    stock = "stock"
    chart = "chart"
    user = "user"


class SourceName(str, Enum):
    """Material source names.

    Video/image providers from ``_SUPPORTED_VIDEO_SOURCES`` and
    ``config.example.toml``, plus ``yt-dlp`` and the four search sources
    the team will implement (x, reddit, instagram, youtube). Music/TTS
    providers (Sonilo, ElevenLabs) are not material sources.

    Search registration is allowlisted: the four planned search APIs
    (x, reddit, instagram, youtube) plus the stock/local providers the
    app already searches (pexels, pixabay, coverr, local). ``yt-dlp`` is
    a downloader, not a search API. Generator names (``wavespeed``,
    ``volcengine_seedance``, ``ofox``, ``metaso_minimax``, ``muapi``,
    ``loomloom``, ``openai_image``) are provenance labels only.
    """

    pexels = "pexels"
    pixabay = "pixabay"
    coverr = "coverr"
    local = "local"
    wavespeed = "wavespeed"
    volcengine_seedance = "volcengine_seedance"
    ofox = "ofox"
    metaso_minimax = "metaso_minimax"
    muapi = "muapi"
    loomloom = "loomloom"
    openai_image = "openai_image"
    yt_dlp = "yt-dlp"
    x = "x"
    reddit = "reddit"
    instagram = "instagram"
    youtube = "youtube"


class License(str, Enum):
    """Rights class for a material item.

    ``proprio`` means all rights reserved to the channel.
    Use ``desconhecida`` when the license cannot be determined.
    """

    cc0 = "cc0"
    cc_by = "cc-by"
    cc_by_sa = "cc-by-sa"
    dominio_publico = "dominio-publico"
    stock = "stock"
    terceiro = "terceiro"
    proprio = "proprio"
    desconhecida = "desconhecida"


@dataclass(frozen=True, slots=True)
class SourceEnvSpec:
    """Environment variables a search source needs.

    ``required``: if any is missing or blank, ``search`` logs the names
    and returns ``[]`` without calling the subclass.
    ``optional``: reserved. No current source uses optional vars;
    ``YOUTUBE_API_KEY`` is required until Guilherme decides otherwise.
    """

    required: tuple[str, ...] = ()
    optional: tuple[str, ...] = ()


GENERATOR_SOURCE_NAMES: frozenset[SourceName] = frozenset(
    {
        SourceName.wavespeed,
        SourceName.volcengine_seedance,
        SourceName.ofox,
        SourceName.metaso_minimax,
        SourceName.muapi,
        SourceName.loomloom,
        SourceName.openai_image,
    }
)
SEARCH_SOURCE_NAMES: frozenset[SourceName] = frozenset(
    {
        SourceName.x,
        SourceName.reddit,
        SourceName.instagram,
        SourceName.youtube,
    }
)
# Allowlist for register_search_env: social search APIs plus stock/local
# providers that already have a search() path in material.py. yt-dlp and
# generators are names, not searchable providers.
SEARCHABLE_SOURCE_NAMES: frozenset[SourceName] = SEARCH_SOURCE_NAMES | frozenset(
    {
        SourceName.pexels,
        SourceName.pixabay,
        SourceName.coverr,
        SourceName.local,
    }
)

SOURCE_ENV_VARS: dict[SourceName, SourceEnvSpec] = {}


def register_search_env(name: SourceName, spec: SourceEnvSpec) -> None:
    """Register env vars for a search source.

    Only :data:`SEARCHABLE_SOURCE_NAMES` may be registered. ``yt-dlp``
    (downloader) and generator provenance labels are rejected.
    """
    if name not in SEARCHABLE_SOURCE_NAMES:
        raise ValueError(
            f"{name.value} cannot be registered as a search source"
        )
    SOURCE_ENV_VARS[name] = spec


register_search_env(SourceName.x, SourceEnvSpec(required=("X_BEARER_TOKEN",)))
register_search_env(
    SourceName.reddit,
    SourceEnvSpec(
        required=(
            "REDDIT_CLIENT_ID",
            "REDDIT_CLIENT_SECRET",
            "REDDIT_USER_AGENT",
        )
    ),
)
register_search_env(
    SourceName.instagram,
    SourceEnvSpec(required=("INSTAGRAM_TOKEN", "INSTAGRAM_USER_ID")),
)
register_search_env(SourceName.youtube, SourceEnvSpec(required=("YOUTUBE_API_KEY",)))


def _enum_values(enum_cls: type[Enum]) -> str:
    return ", ".join(item.value for item in enum_cls)


def _env_present(name: str) -> bool:
    """Return whether an env var is set and non-blank. Never returns the value."""
    raw = os.environ.get(name)
    return isinstance(raw, str) and bool(raw.strip())


def missing_env_names(
    spec: SourceEnvSpec,
    *,
    required: bool = True,
    optional: bool = False,
) -> list[str]:
    """Return missing variable **names** from a spec. Values are never read out."""
    names: list[str] = []
    if required:
        names.extend(spec.required)
    if optional:
        names.extend(spec.optional)
    return [name for name in names if not _env_present(name)]


def missing_source_env_vars(
    source: SourceName,
    *,
    required: bool = True,
    optional: bool = False,
) -> list[str]:
    """Return missing env var names for a named source (names only)."""
    spec = SOURCE_ENV_VARS.get(source)
    if spec is None:
        return []
    return missing_env_names(spec, required=required, optional=optional)


def _warn_missing_env(source: SourceName | None, names: list[str]) -> None:
    """Log missing variable names only — never the values."""
    source_label = source.value if source is not None else "unknown"
    logger.warning(
        f"skipping {source_label} search: missing required environment "
        f"variables: {', '.join(names)}"
    )


def parse_search_limit(value: Any) -> int:
    """Require ``limit`` to be an ``int >= 1``. Booleans are rejected."""
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError("limit must be an int >= 1")
    return value


def validate_search_results(results: Any, limit: int) -> list[SourceItem]:
    """Require a ``list[SourceItem]`` and truncate it to ``limit``.

    Over-long results are truncated, not rejected, so a subclass that
    ignores ``limit`` still cannot return more items than the caller asked
    for.
    """
    if not isinstance(results, list):
        raise TypeError("search must return a list of SourceItem")
    items: list[SourceItem] = []
    for item in results:
        if not isinstance(item, SourceItem):
            raise TypeError("search must return a list of SourceItem")
        items.append(item)
    return items[:limit]


def require_source_env(func: _F) -> _F:
    """Wrap ``search``: env check, ``limit`` validation, result check.

    Missing required env vars: warn with names only and return ``[]``.
    Invalid ``limit`` or a non-``list[SourceItem]`` result: raise.
    Results longer than ``limit`` are truncated.
    """

    @functools.wraps(func)
    def wrapper(
        self: Source,
        query: str = "",
        limit: int = 10,
        *args: Any,
        **kwargs: Any,
    ) -> list[SourceItem]:
        limit = parse_search_limit(limit)
        if not self.allow_search():
            return []
        return validate_search_results(func(self, query, limit, *args, **kwargs), limit)

    setattr(wrapper, _SOURCE_ENV_GUARD_ATTR, True)
    return wrapper  # type: ignore[return-value]


def parse_source_type(value: Any) -> SourceType:
    """Parse a raw value into :class:`SourceType`."""
    if isinstance(value, SourceType):
        return value
    if isinstance(value, str):
        text = value.strip()
        try:
            return SourceType(text)
        except ValueError:
            raise ValueError(
                f"type must be one of: {_enum_values(SourceType)}"
            ) from None
    raise ValueError(f"type must be one of: {_enum_values(SourceType)}")


def parse_source_name(value: Any) -> SourceName:
    """Parse a raw value into :class:`SourceName`."""
    if isinstance(value, SourceName):
        return value
    if isinstance(value, str):
        text = value.strip()
        try:
            return SourceName(text)
        except ValueError:
            raise ValueError(
                f"source must be one of: {_enum_values(SourceName)}"
            ) from None
    raise ValueError(f"source must be one of: {_enum_values(SourceName)}")


def parse_license(value: Any) -> License:
    """Parse a raw value into :class:`License`.

    ``None`` or a blank string fall back to ``desconhecida``.
    """
    if value is None:
        return License.desconhecida
    if isinstance(value, License):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return License.desconhecida
        try:
            return License(text)
        except ValueError:
            raise ValueError(
                f"license must be one of: {_enum_values(License)}"
            ) from None
    raise ValueError(f"license must be one of: {_enum_values(License)}")


def parse_covers(value: Any) -> list[str]:
    """Parse ``covers`` into a list of scene/block labels."""
    if value is None or value == "":
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (list, tuple)):
        covers: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("covers items must be strings")
            covers.append(item)
        return covers
    raise ValueError("covers must be a string or a list of strings")


def parse_duration(value: Any) -> float | None:
    """Parse duration as non-negative seconds.

    Accepts ``int``, ``float`` or ``None`` only. Strings such as
    ``\"01:30\"`` are rejected. Booleans are rejected so ``True`` is not
    treated as ``1``.
    """
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("duration must be a number of seconds or None")
    seconds = float(value)
    if not math.isfinite(seconds) or seconds < 0:
        raise ValueError("duration must be a non-negative finite number of seconds")
    return seconds


def parse_published_at(value: Any) -> datetime | None:
    """Parse ``published_at`` as a timezone-aware datetime.

    Accepts an aware ``datetime`` or an ISO 8601 string with an offset
    (including ``Z``). Naive values are rejected.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("published_at must be timezone-aware")
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.endswith(("Z", "z")):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError as exc:
            raise ValueError(
                "published_at must be timezone-aware ISO 8601"
            ) from exc
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            raise ValueError("published_at must be timezone-aware ISO 8601")
        return parsed
    raise ValueError(
        "published_at must be a timezone-aware datetime or ISO 8601 string"
    )


def parse_optional_text(value: Any) -> str | None:
    """Parse an optional note into a stripped string."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("license_note must be a string")
    text = value.strip()
    return text or None


def parse_item_id(value: Any) -> str | None:
    """Parse an optional vendor id."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("id must be a string")
    text = value.strip()
    return text or None


def parse_url(value: Any) -> str:
    """Require an http(s) URL with a host.

    Rejects ``javascript:``, ``ftp:``, ``file:``, bare paths such as
    ``/etc/passwd``, and URLs with credentials.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("url is required and must be an http or https URL with a host")
    text = value.strip()
    try:
        parsed = urlsplit(text)
    except ValueError as exc:
        raise ValueError(
            "url is required and must be an http or https URL with a host"
        ) from exc
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise ValueError("url is required and must be an http or https URL with a host")
    return text


class SourceItem(BaseModel):
    """One material item returned by search.

    ``url`` is required and must be the original http(s) link.
    ``license`` defaults to ``desconhecida``.
    ``covers`` lists the script blocks or scenes this item illustrates.
    Unknown fields are rejected.
    """

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    id: str | None = None
    url: str
    source: SourceName
    type: SourceType
    license: License = License.desconhecida
    license_note: str | None = None
    covers: list[str] = Field(default_factory=list)
    duration: float | None = None
    published_at: datetime | None = None

    @field_validator("id", mode="before")
    @classmethod
    def _parse_id(cls, value: Any) -> str | None:
        return parse_item_id(value)

    @field_validator("url", mode="before")
    @classmethod
    def _parse_url(cls, value: Any) -> str:
        return parse_url(value)

    @field_validator("source", mode="before")
    @classmethod
    def _parse_source(cls, value: Any) -> SourceName:
        return parse_source_name(value)

    @field_validator("type", mode="before")
    @classmethod
    def _parse_type(cls, value: Any) -> SourceType:
        return parse_source_type(value)

    @field_validator("license", mode="before")
    @classmethod
    def _parse_license(cls, value: Any) -> License:
        return parse_license(value)

    @field_validator("license_note", mode="before")
    @classmethod
    def _parse_license_note(cls, value: Any) -> str | None:
        return parse_optional_text(value)

    @field_validator("covers", mode="before")
    @classmethod
    def _parse_covers(cls, value: Any) -> list[str]:
        return parse_covers(value)

    @field_validator("duration", mode="before")
    @classmethod
    def _parse_duration(cls, value: Any) -> float | None:
        return parse_duration(value)

    @field_validator("published_at", mode="before")
    @classmethod
    def _parse_published_at(cls, value: Any) -> datetime | None:
        return parse_published_at(value)


class SourceItemError(ValueError):
    """Validation error that never exposes the rejected input.

    ``str``, ``repr``, :meth:`json` and :meth:`errors` omit the ``input``
    field so secrets in a URL or extra field cannot leak.
    """

    def __init__(self, details: list[dict[str, Any]]):
        self._details = details
        message = "; ".join(
            str(item.get("msg", "")) for item in details if item.get("msg")
        )
        super().__init__(message or "invalid SourceItem")

    def errors(self) -> list[dict[str, Any]]:
        return [dict(item) for item in self._details]

    def json(self, **_kwargs: Any) -> str:
        return json.dumps(self._details)


def source_item_error_details(exc: BaseException) -> list[dict[str, Any]]:
    """Public helper: error details without the rejected input."""
    if isinstance(exc, SourceItemError):
        return exc.errors()
    if isinstance(exc, ValidationError):
        return exc.errors(include_input=False, include_url=False)
    raise TypeError("expected a SourceItemError or ValidationError")


def parse_source_item(data: SourceItem | Mapping[str, Any]) -> SourceItem:
    """Parse a mapping (or an existing item) into :class:`SourceItem`.

    Unknown fields raise :class:`SourceItemError` without the input.
    """
    if isinstance(data, SourceItem):
        return data
    try:
        return SourceItem.model_validate(data)
    except ValidationError as exc:
        raise SourceItemError(
            exc.errors(include_input=False, include_url=False)
        ) from None


class Source(ABC):
    """Abstract material source.

    Subclasses should set :attr:`name`. ``search`` is wrapped so that:

    - X / Reddit / Instagram / YouTube: any missing required env var
      logs the names and returns ``[]`` with no network call.
    - ``YOUTUBE_API_KEY`` is required until Guilherme decides otherwise.
    - ``limit`` must be an ``int >= 1``.
    - the subclass must return a ``list[SourceItem]``, truncated to
      ``limit``.
    """

    name: SourceName | None = None

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        search = cls.__dict__.get("search")
        if search is None or getattr(search, _SOURCE_ENV_GUARD_ATTR, False):
            return
        cls.search = require_source_env(search)

    def missing_required_env_vars(self) -> list[str]:
        """Missing required env var names for this instance's ``name``."""
        if self.name is None:
            return []
        return missing_source_env_vars(self.name, required=True, optional=False)

    def missing_optional_env_vars(self) -> list[str]:
        """Missing optional env var names for this instance's ``name``."""
        if self.name is None:
            return []
        return missing_source_env_vars(self.name, required=False, optional=True)

    def allow_search(self) -> bool:
        """Check required env vars. Log names and return False if any are missing.

        Values are never logged.
        """
        missing_required = self.missing_required_env_vars()
        if missing_required:
            _warn_missing_env(self.name, missing_required)
            return False
        return True

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        """Search for material matching ``query``, returning at most ``limit`` items.

        The subclass implementation is wrapped by :func:`require_source_env`.

        :param query: search terms.
        :param limit: maximum items to return; must be an ``int >= 1``.
        :returns: parsed material items, truncated to ``limit``.
        """
