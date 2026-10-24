"""接口：素材来源的公共契约。

本模块只定义搜索接口和统一的素材条目模型，不接入现有 Pexels / Pixabay /
Coverr / WaveSpeed 等服务。后续适配器可以各自实现 :class:`Source`，把供应商
返回值解析成 :class:`SourceItem`。

字段约定（与 ``.agents/pipeline.md`` 的 ``sources.json`` 以及
``app/services`` 里已有的素材来源对齐）：

- ``id`` / ``url``：供应商侧标识和可定位地址（至少二者之一）。
- ``source``：已在仓库中使用的来源名（:class:`SourceName`）。
- ``type``：素材种类（:class:`SourceType`）。
- ``license``：权利分类（:class:`License`），缺省为 ``desconhecida``。
- ``license_note``：补充说明（例如「trecho curto」、署名要求）。
- ``covers``：该条目覆盖的脚本块 / 场景说明。
- ``duration``：时长，单位秒。
- ``published_at``：时区感知的 ISO 8601 时间；拒绝 naive datetime。
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Mapping

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SourceType(str, Enum):
    """素材种类。

    取值来自现有流水线：库存/生成视频、文生图与本地图片、自定义旁白音频、
    以及 BGM / 配乐服务。
    """

    video = "video"
    image = "image"
    audio = "audio"
    music = "music"


class SourceName(str, Enum):
    """仓库已经使用的素材来源名。

    - 视频库存 / 生成：``app/services/task.py`` 的 ``_SUPPORTED_VIDEO_SOURCES``
      与 ``config.example.toml`` 的 ``video_source``。
    - 配乐：``_VIDEO_MUSIC_PROVIDERS``（Sonilo、ElevenLabs）。
    - 代理流水线：``yt-dlp``（``.agents/playbooks/yt-dlp.md``）。
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
    本基类不发起网络请求。
    """

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        """按查询词搜索素材，最多返回 ``limit`` 条。

        :param query: 搜索词或关键词。
        :param limit: 返回条数上限，默认 10。
        :returns: 解析后的素材条目列表。
        """
