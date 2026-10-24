"""接口：素材来源的公共契约。

本模块只定义搜索接口和统一的素材条目模型，不接入现有 Pexels / Pixabay /
Coverr / WaveSpeed 等服务。后续适配器可以各自实现 :class:`Source`，把供应商
返回值解析成 :class:`SourceItem`。

字段约定（与 ``.agents/pipeline.md`` 的 ``sources.json`` 以及
``app/services`` 里已有的素材来源对齐）：

- ``id`` / ``url``：供应商侧标识和可定位地址（至少二者之一）。
- ``source``：已在仓库中使用的来源名，外加即将实现的搜索源
  （:class:`SourceName`）。
- ``type``：素材种类（:class:`SourceType`）。
- ``license``：权利分类（:class:`License`），缺省为 ``desconhecida``。
- ``license_note``：补充说明（例如「trecho curto」、署名要求）。
- ``covers``：该条目覆盖的脚本块 / 场景说明。
- ``duration``：时长，单位秒。
- ``published_at``：时区感知的 ISO 8601 时间；拒绝 naive datetime。

X / Reddit / Instagram / YouTube 的 ``search`` 会先检查环境变量（见
:data:`SOURCE_ENV_VARS`）。缺必需变量时只记录变量**名**并返回 ``[]``，
不抛异常、不发起网络请求。YouTube 的 ``YOUTUBE_API_KEY`` 是可选的：
缺失时告警，但仍调用子类（例如回退到 yt-dlp 搜索）。
"""

from __future__ import annotations

import functools
import math
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Mapping, TypeVar

from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SourceType(str, Enum):
    """素材种类。

    取值与 ``.agents/pipeline.md`` 的 ``sources.json`` 对齐，并补上帖子与
    文本（X / Reddit / Instagram 等搜索源会用到）。不再包含 ``audio`` /
    ``music``：配乐不是这类来源的检索结果。
    """

    video = "video"
    image = "image"
    post = "post"
    text = "text"
    stock = "stock"
    chart = "chart"
    user = "user"


class SourceName(str, Enum):
    """素材来源名。

    - 视频库存 / 生成：``app/services/task.py`` 的 ``_SUPPORTED_VIDEO_SOURCES``
      与 ``config.example.toml`` 的 ``video_source``。
    - 配乐：``_VIDEO_MUSIC_PROVIDERS``（Sonilo、ElevenLabs）。
    - 代理流水线：``yt-dlp``（``.agents/playbooks/yt-dlp.md``）。
    - 即将实现的搜索源：``x``、``reddit``、``instagram``、``youtube``。
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
    sonilo = "sonilo"
    elevenlabs = "elevenlabs"
    yt_dlp = "yt-dlp"
    x = "x"
    reddit = "reddit"
    instagram = "instagram"
    youtube = "youtube"


class License(str, Enum):
    """素材权利分类。

    ``proprio`` 表示频道保留全部权利（all rights reserved）。
    无法判断时使用默认值 ``desconhecida``。
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
    """某个搜索源需要的环境变量。

    ``required``：任一缺失或空白时，``search`` 记录变量名并返回 ``[]``，
    不调用子类、不发起网络请求。
    ``optional``：缺失时只告警，仍调用子类。YouTube 的 ``YOUTUBE_API_KEY``
    属于此类，子类可以回退到 yt-dlp 搜索。
    """

    required: tuple[str, ...] = ()
    optional: tuple[str, ...] = ()


SOURCE_ENV_VARS: dict[SourceName, SourceEnvSpec] = {
    SourceName.x: SourceEnvSpec(required=("X_BEARER_TOKEN",)),
    SourceName.reddit: SourceEnvSpec(
        required=(
            "REDDIT_CLIENT_ID",
            "REDDIT_CLIENT_SECRET",
            "REDDIT_USER_AGENT",
        )
    ),
    SourceName.instagram: SourceEnvSpec(
        required=("INSTAGRAM_TOKEN", "INSTAGRAM_USER_ID")
    ),
    SourceName.youtube: SourceEnvSpec(optional=("YOUTUBE_API_KEY",)),
}

_F = TypeVar("_F", bound=Callable[..., list[Any]])
_SOURCE_ENV_GUARD_ATTR = "_source_env_guarded"


def _env_present(name: str) -> bool:
    """判断环境变量是否已设置（非空）。从不返回或记录变量值。"""
    raw = os.environ.get(name)
    return isinstance(raw, str) and bool(raw.strip())


def missing_source_env_vars(
    source: SourceName,
    *,
    required: bool = True,
    optional: bool = False,
) -> list[str]:
    """返回该来源中缺失的环境变量名（只返回名字，不读出值）。"""
    spec = SOURCE_ENV_VARS.get(source)
    if spec is None:
        return []
    names: list[str] = []
    if required:
        names.extend(spec.required)
    if optional:
        names.extend(spec.optional)
    return [name for name in names if not _env_present(name)]


def _warn_missing_env(source: SourceName | None, names: list[str], *, required: bool) -> None:
    """只记录变量名，绝不写入环境变量的值。"""
    source_label = source.value if source is not None else "unknown"
    listed = ", ".join(names)
    if required:
        logger.warning(
            f"skipping {source_label} search: missing required environment "
            f"variables: {listed}"
        )
        return
    logger.warning(
        f"{source_label} search: missing optional environment variables: "
        f"{listed}; the source may fall back (YouTube can use yt-dlp search)"
    )


def require_source_env(func: _F) -> _F:
    """装饰 ``search``：缺必需环境变量时告警并返回 ``[]``。

    可选变量（YouTube 的 ``YOUTUBE_API_KEY``）只告警，不拦截。
    告警只包含变量名，不包含值。:class:`Source` 的子类在定义 ``search``
    时会自动套上本装饰器。
    """

    @functools.wraps(func)
    def wrapper(self: Source, *args: Any, **kwargs: Any) -> list[SourceItem]:
        if not self.allow_search():
            return []
        return func(self, *args, **kwargs)

    setattr(wrapper, _SOURCE_ENV_GUARD_ATTR, True)
    return wrapper  # type: ignore[return-value]


def _enum_values(enum_cls: type[Enum]) -> str:
    return ", ".join(item.value for item in enum_cls)


def parse_source_type(value: Any) -> SourceType:
    """把原始值解析为 :class:`SourceType`。"""
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
    """把原始值解析为 :class:`SourceName`。"""
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
    """把原始值解析为 :class:`License`。

    ``None`` 或空字符串回落到默认值 ``desconhecida``。
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
    """把 ``covers`` 解析为字符串列表。"""
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
    """把时长解析为秒（可空）。

    接受非负有限数字，或 ``MM:SS`` / ``H:MM:SS`` 文本（与 ``sources.json``
    里出现的写法兼容）。布尔值会被拒绝，避免 ``True`` 被当成 ``1``。
    """
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise ValueError("duration must be seconds, not a boolean")
    if isinstance(value, (int, float)):
        seconds = float(value)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if ":" in text:
            parts = text.split(":")
            if len(parts) not in {2, 3}:
                raise ValueError("duration text must be seconds, MM:SS, or H:MM:SS")
            try:
                numbers = [float(part) for part in parts]
            except ValueError as exc:
                raise ValueError(
                    "duration text must be seconds, MM:SS, or H:MM:SS"
                ) from exc
            seconds = 0.0
            for number in numbers:
                seconds = seconds * 60 + number
        else:
            try:
                seconds = float(text)
            except ValueError as exc:
                raise ValueError("duration must be a number of seconds") from exc
    else:
        raise ValueError("duration must be a number of seconds")
    if not math.isfinite(seconds) or seconds < 0:
        raise ValueError("duration must be a non-negative finite number of seconds")
    return seconds


def parse_published_at(value: Any) -> datetime | None:
    """把 ``published_at`` 解析为带时区的 datetime。

    接受带 ``tzinfo`` 的 ``datetime``，或带偏移的 ISO 8601 字符串（含 ``Z``）。
    naive datetime 与不带时区的 ISO 字符串一律拒绝。
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
    """把可空说明字段解析为去空白后的字符串。"""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("license_note must be a string")
    text = value.strip()
    return text or None


class SourceItem(BaseModel):
    """一次搜索返回的单条素材。

    ``id`` 与 ``url`` 至少要提供一个：库存素材通常两者都有；本地文件可以只有
    路径（``url``）或文件名（``id``）。``license`` 缺省为 ``desconhecida``。
    """

    model_config = ConfigDict(extra="ignore")

    id: str | None = None
    url: str | None = None
    source: SourceName
    type: SourceType
    license: License = License.desconhecida
    license_note: str | None = None
    covers: list[str] = Field(default_factory=list)
    duration: float | None = None
    published_at: datetime | None = None

    @field_validator("id", "url", mode="before")
    @classmethod
    def _parse_identifier(cls, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("id and url must be strings")
        text = value.strip()
        return text or None

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

    @model_validator(mode="after")
    def _require_id_or_url(self) -> SourceItem:
        if not self.id and not self.url:
            raise ValueError("SourceItem requires at least id or url")
        return self


def parse_source_item(data: SourceItem | Mapping[str, Any]) -> SourceItem:
    """把映射（或已构造的条目）解析为 :class:`SourceItem`。

    供 ``sources.json``、缓存记录和各来源适配器复用同一套字段解析规则。
    未知字段会被忽略，以便兼容现有 ``channel`` 等扩展键。
    """
    if isinstance(data, SourceItem):
        return data
    return SourceItem.model_validate(data)


class Source(ABC):
    """素材来源的抽象基类。

    具体实现负责查询外部或本地目录，并把结果收成 :class:`SourceItem`。
    子类应设置 :attr:`name`。``search`` 会先走 :meth:`allow_search`：

    - X / Reddit / Instagram：缺任一必需环境变量 → 告警（只写变量名）并
      返回 ``[]``，不发起网络请求。
    - YouTube：``YOUTUBE_API_KEY`` 可选。缺失时告警，但仍调用子类，
      由子类决定是否回退到 yt-dlp 等其它路径。
    """

    name: SourceName | None = None

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        search = cls.__dict__.get("search")
        if search is None or getattr(search, _SOURCE_ENV_GUARD_ATTR, False):
            return
        cls.search = require_source_env(search)

    def missing_required_env_vars(self) -> list[str]:
        """该实例 ``name`` 上缺失的必需环境变量名。"""
        if self.name is None:
            return []
        return missing_source_env_vars(self.name, required=True, optional=False)

    def missing_optional_env_vars(self) -> list[str]:
        """该实例 ``name`` 上缺失的可选环境变量名。"""
        if self.name is None:
            return []
        return missing_source_env_vars(self.name, required=False, optional=True)

    def allow_search(self) -> bool:
        """检查环境变量。缺必需变量时告警并返回 ``False``。

        可选变量缺失只告警，仍返回 ``True``，让子类自行决定（YouTube
        可回退到 yt-dlp）。从不记录变量值。
        """
        missing_required = self.missing_required_env_vars()
        if missing_required:
            _warn_missing_env(self.name, missing_required, required=True)
            return False
        missing_optional = self.missing_optional_env_vars()
        if missing_optional:
            _warn_missing_env(self.name, missing_optional, required=False)
        return True

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        """按查询词搜索素材，最多返回 ``limit`` 条。

        子类实现会被 :func:`require_source_env` 包装：缺必需环境变量时
        不会进入本方法。

        :param query: 搜索词或关键词。
        :param limit: 返回条数上限，默认 10。
        :returns: 解析后的素材条目列表。
        """
