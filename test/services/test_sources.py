from datetime import datetime, timezone, tzinfo
from typing import Any

import pytest
from pydantic import ValidationError

from app.services.sources import (
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
from app.services.sources.base import parse_optional_text


class _NaiveTZ(tzinfo):
    """tzinfo that claims a timezone but reports no offset."""

    def utcoffset(self, dt):
        return None

    def dst(self, dt):
        return None

    def tzname(self, dt):
        return "naive"


def _item(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": "clip-1",
        "url": "https://example.com/clip-1",
        "source": SourceName.pexels,
        "type": SourceType.video,
    }
    data.update(overrides)
    return data


class DummySource(Source):
    """In-memory source used to lock the search contract without network I/O."""

    def __init__(self, items: list[SourceItem] | None = None) -> None:
        self.items = items or [
            parse_source_item(
                _item(
                    id="ocean-1",
                    url="https://example.com/ocean-1",
                    source="pexels",
                    type="video",
                )
            ),
            parse_source_item(
                _item(
                    id="city-1",
                    url="https://example.com/city-1",
                    source="pixabay",
                    type="image",
                )
            ),
            parse_source_item(
                _item(
                    id="theme-1",
                    url="https://example.com/theme-1",
                    source="elevenlabs",
                    type="music",
                )
            ),
        ]

    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        needle = query.lower()
        matched = [
            item
            for item in self.items
            if needle in (item.id or "").lower()
            or needle in (item.url or "").lower()
            or needle in item.source.value
        ]
        return matched[:limit]


def test_source_type_values():
    assert {item.value for item in SourceType} == {
        "video",
        "image",
        "audio",
        "music",
    }


def test_source_name_values_match_repo_sources():
    assert {item.value for item in SourceName} == {
        "pexels",
        "pixabay",
        "coverr",
        "local",
        "wavespeed",
        "volcengine_seedance",
        "ofox",
        "metaso_minimax",
        "muapi",
        "loomloom",
        "openai_image",
        "sonilo",
        "elevenlabs",
        "yt-dlp",
    }


def test_license_values_and_default():
    assert {item.value for item in License} == {
        "cc0",
        "cc-by",
        "cc-by-sa",
        "dominio-publico",
        "stock",
        "terceiro",
        "proprio",
        "desconhecida",
    }
    assert License.proprio.value == "proprio"
    assert parse_license(None) is License.desconhecida
    assert parse_license("") is License.desconhecida
    assert parse_source_item(_item()).license is License.desconhecida


def test_source_item_requires_id_or_url():
    parse_source_item(_item(url=None))
    parse_source_item(_item(id=None))
    with pytest.raises(ValidationError, match="at least id or url"):
        parse_source_item(_item(id=None, url=None))
    with pytest.raises(ValidationError, match="at least id or url"):
        parse_source_item(_item(id="  ", url=""))


def test_published_at_accepts_only_timezone_aware_values():
    aware = datetime(2024, 6, 1, 12, 0, tzinfo=timezone.utc)
    item = parse_source_item(_item(published_at=aware))
    assert item.published_at == aware

    zulu = parse_published_at("2024-06-01T12:00:00Z")
    assert zulu == aware
    offset = parse_published_at("2024-06-01T09:00:00-03:00")
    assert offset is not None
    assert offset.utcoffset() is not None
    assert parse_source_item(_item(published_at="2024-06-01T12:00:00+00:00")).published_at == aware

    with pytest.raises(ValueError, match="timezone-aware"):
        parse_published_at(datetime(2024, 6, 1, 12, 0))
    with pytest.raises(ValueError, match="timezone-aware"):
        parse_published_at("2024-06-01T12:00:00")
    with pytest.raises(ValueError, match="timezone-aware"):
        parse_published_at(datetime(2024, 6, 1, 12, 0, tzinfo=_NaiveTZ()))
    with pytest.raises(ValidationError, match="timezone-aware"):
        parse_source_item(_item(published_at=datetime(2024, 6, 1, 12, 0)))
    with pytest.raises(ValidationError, match="timezone-aware"):
        parse_source_item(_item(published_at="2024-06-01T12:00:00"))


def test_field_parsers_cover_duration_covers_and_enums():
    assert parse_duration(12) == 12.0
    assert parse_duration("1:40") == 100.0
    assert parse_duration("1:02:03") == 3723.0
    assert parse_duration(None) is None
    with pytest.raises(ValueError, match="boolean"):
        parse_duration(True)
    with pytest.raises(ValueError, match="non-negative"):
        parse_duration(-1)

    assert parse_covers("bloco 2") == ["bloco 2"]
    assert parse_covers(["a", "b"]) == ["a", "b"]
    assert parse_covers(None) == []

    assert parse_source_name("yt-dlp") is SourceName.yt_dlp
    assert parse_source_name(SourceName.local) is SourceName.local
    assert parse_source_type("music") is SourceType.music
    assert parse_source_type(SourceType.audio) is SourceType.audio
    assert parse_license("proprio") is License.proprio
    assert parse_license(License.cc0) is License.cc0
    assert parse_published_at(None) is None
    assert parse_published_at("  ") is None
    assert parse_duration("  ") is None
    assert parse_optional_text(None) is None
    assert parse_optional_text("  ") is None
    with pytest.raises(ValueError, match="source must be one of"):
        parse_source_name("unknown-vendor")
    with pytest.raises(ValueError, match="source must be one of"):
        parse_source_name(1)
    with pytest.raises(ValueError, match="type must be one of"):
        parse_source_type("chart")
    with pytest.raises(ValueError, match="type must be one of"):
        parse_source_type(1)
    with pytest.raises(ValueError, match="license must be one of"):
        parse_license("CC BY 4.0")
    with pytest.raises(ValueError, match="license must be one of"):
        parse_license(1)
    with pytest.raises(ValueError, match="covers"):
        parse_covers(1)
    with pytest.raises(ValueError, match="covers items"):
        parse_covers(["ok", 2])
    with pytest.raises(ValueError, match="MM:SS"):
        parse_duration("1:02:03:04")
    with pytest.raises(ValueError, match="MM:SS"):
        parse_duration("1:xx")
    with pytest.raises(ValueError, match="number of seconds"):
        parse_duration("abc")
    with pytest.raises(ValueError, match="number of seconds"):
        parse_duration(["12"])
    with pytest.raises(ValueError, match="non-negative"):
        parse_duration(float("inf"))
    with pytest.raises(ValueError, match="timezone-aware ISO 8601"):
        parse_published_at("not-a-date")
    with pytest.raises(ValueError, match="timezone-aware datetime or ISO 8601"):
        parse_published_at(1717200000)
    with pytest.raises(ValidationError, match="license_note must be a string"):
        parse_source_item(_item(license_note=1))
    with pytest.raises(ValidationError, match="id and url must be strings"):
        parse_source_item(_item(id=12))


def test_parse_source_item_is_idempotent_and_ignores_unknown_keys():
    item = parse_source_item(
        _item(
            license="cc-by",
            license_note="  crédito obrigatório  ",
            covers=["bloco 1"],
            duration="0:15",
            channel="DryxioGTA",
        )
    )
    assert item.license is License.cc_by
    assert item.license_note == "crédito obrigatório"
    assert item.covers == ["bloco 1"]
    assert item.duration == 15.0
    assert parse_source_item(item) is item


def test_source_is_abstract_and_dummy_honors_search_contract():
    with pytest.raises(TypeError):
        Source()

    source = DummySource()
    results = source.search("ocean")
    assert isinstance(results, list)
    assert len(results) == 1
    assert all(isinstance(item, SourceItem) for item in results)
    assert results[0].source is SourceName.pexels
    assert results[0].type is SourceType.video
    assert results[0].license is License.desconhecida

    limited = source.search("", limit=2)
    assert len(limited) == 2
    assert DummySource().search("missing-query") == []
