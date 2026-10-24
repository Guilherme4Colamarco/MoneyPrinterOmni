import json
import runpy
import sys
from datetime import datetime, timezone, tzinfo
from typing import Any
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.services.sources import (
    SOURCE_ENV_VARS,
    License,
    Source,
    SourceEnvSpec,
    SourceItem,
    SourceName,
    SourceType,
    missing_env_names,
    missing_source_env_vars,
    parse_covers,
    parse_duration,
    parse_license,
    parse_published_at,
    parse_search_limit,
    parse_source_item,
    parse_source_name,
    parse_source_type,
    parse_url,
    require_source_env,
    validate_licencas,
    validate_licencas_file,
    validate_search_results,
)
from app.services.sources.base import parse_optional_text
from app.services.sources.licencas import main as licencas_main


SEARCH_ENV_VARS = (
    "X_BEARER_TOKEN",
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
    "REDDIT_USER_AGENT",
    "INSTAGRAM_TOKEN",
    "INSTAGRAM_USER_ID",
    "YOUTUBE_API_KEY",
)
ENV_SECRETS = {
    "X_BEARER_TOKEN": "x-secret-token",
    "REDDIT_CLIENT_ID": "reddit-id-secret",
    "REDDIT_CLIENT_SECRET": "reddit-secret-value",
    "REDDIT_USER_AGENT": "mpt-test-agent",
    "INSTAGRAM_TOKEN": "ig-secret-token",
    "INSTAGRAM_USER_ID": "ig-user-42",
    "YOUTUBE_API_KEY": "yt-secret-key",
}


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

    name = SourceName.local

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
                    id="post-1",
                    url="https://example.com/post-1",
                    source="x",
                    type="post",
                )
            ),
        ]

    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        needle = query.lower()
        matched = [
            item
            for item in self.items
            if needle in (item.id or "").lower()
            or needle in item.url.lower()
            or needle in item.source.value
        ]
        return matched


class RecordingSource(Source):
    """Named source that records whether the search body ran."""

    def __init__(self, name: SourceName) -> None:
        self.name = name
        self.called = False

    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        self.called = True
        source_name = self.name or SourceName.local
        return [
            parse_source_item(
                _item(
                    id=f"{source_name.value}-1",
                    url=f"https://example.com/{source_name.value}",
                    source=source_name,
                    type="post",
                )
            )
        ]


class OverproducingSource(Source):
    name = SourceName.local

    def search(self, query: str, limit: int = 10) -> list[SourceItem]:
        return [
            parse_source_item(_item(id=f"n{index}", url=f"https://example.com/{index}"))
            for index in range(5)
        ]


class DictResultSource(Source):
    name = SourceName.local

    def search(self, query: str, limit: int = 10):
        return {"id": "nope", "url": "https://example.com/nope"}


class MixedResultSource(Source):
    name = SourceName.local

    def search(self, query: str, limit: int = 10):
        return [{"id": "nope", "url": "https://example.com/nope"}]


@pytest.fixture
def clear_search_env(monkeypatch):
    for name in SEARCH_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


def _set_source_env(monkeypatch, *names: str) -> None:
    for name in names:
        monkeypatch.setenv(name, ENV_SECRETS[name])


def _warning_text(warning) -> str:
    return " ".join(str(arg) for arg in warning.call_args.args)


def test_source_type_values():
    assert {item.value for item in SourceType} == {
        "video",
        "image",
        "post",
        "text",
        "stock",
        "chart",
        "user",
    }


def test_source_name_values_are_material_sources_only():
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
        "yt-dlp",
        "x",
        "reddit",
        "instagram",
        "youtube",
    }
    assert "sonilo" not in {item.value for item in SourceName}
    assert "elevenlabs" not in {item.value for item in SourceName}
    for name in (SourceName.x, SourceName.reddit, SourceName.instagram, SourceName.youtube):
        assert name in SOURCE_ENV_VARS
        assert SOURCE_ENV_VARS[name].required


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


def test_url_is_required_http_https_with_host():
    parse_source_item(_item(id=None))
    assert parse_url("https://example.com/clip") == "https://example.com/clip"
    assert parse_url("http://localhost/a").startswith("http://")
    with pytest.raises(ValidationError, match="http or https"):
        parse_source_item(_item(url=None))
    with pytest.raises(ValidationError, match="http or https"):
        parse_source_item(_item(url=""))
    with pytest.raises(ValueError, match="http or https"):
        parse_url("javascript:alert(1)")
    with pytest.raises(ValueError, match="http or https"):
        parse_url("ftp://example.com/a")
    with pytest.raises(ValueError, match="http or https"):
        parse_url("/etc/passwd")
    with pytest.raises(ValueError, match="http or https"):
        parse_url("file:///etc/passwd")
    with pytest.raises(ValueError, match="http or https"):
        parse_url("https://user:pass@example.com/secret")
    with pytest.raises(ValueError, match="http or https"):
        parse_url("http://[")


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
    assert parse_duration(1.5) == 1.5
    assert parse_duration(None) is None
    with pytest.raises(ValueError, match="number of seconds or None"):
        parse_duration("01:30")
    with pytest.raises(ValueError, match="number of seconds or None"):
        parse_duration("1:40")
    with pytest.raises(ValueError, match="number of seconds or None"):
        parse_duration(True)
    with pytest.raises(ValueError, match="number of seconds or None"):
        parse_duration("  ")
    with pytest.raises(ValueError, match="non-negative"):
        parse_duration(-1)
    with pytest.raises(ValueError, match="non-negative"):
        parse_duration(float("inf"))

    assert parse_covers("bloco 2") == ["bloco 2"]
    assert parse_covers(["a", "b"]) == ["a", "b"]
    assert parse_covers(None) == []

    assert parse_source_name("yt-dlp") is SourceName.yt_dlp
    assert parse_source_name("youtube") is SourceName.youtube
    assert parse_source_name(SourceName.local) is SourceName.local
    assert parse_source_type("chart") is SourceType.chart
    assert parse_source_type(SourceType.post) is SourceType.post
    assert parse_license("proprio") is License.proprio
    assert parse_license(License.cc0) is License.cc0
    assert parse_published_at(None) is None
    assert parse_published_at("  ") is None
    assert parse_optional_text(None) is None
    assert parse_optional_text("  ") is None
    with pytest.raises(ValueError, match="source must be one of"):
        parse_source_name("unknown-vendor")
    with pytest.raises(ValueError, match="source must be one of"):
        parse_source_name(1)
    with pytest.raises(ValueError, match="type must be one of"):
        parse_source_type("music")
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
    with pytest.raises(ValueError, match="timezone-aware ISO 8601"):
        parse_published_at("not-a-date")
    with pytest.raises(ValueError, match="timezone-aware datetime or ISO 8601"):
        parse_published_at(1717200000)
    with pytest.raises(ValidationError, match="license_note must be a string"):
        parse_source_item(_item(license_note=1))
    with pytest.raises(ValidationError, match="id must be a string"):
        parse_source_item(_item(id=12))


def test_parse_source_item_rejects_unknown_fields():
    item = parse_source_item(
        _item(
            license="cc-by",
            license_note="  crédito obrigatório  ",
            covers=["bloco 1"],
            duration=15,
        )
    )
    assert item.license is License.cc_by
    assert item.license_note == "crédito obrigatório"
    assert item.covers == ["bloco 1"]
    assert item.duration == 15.0
    assert parse_source_item(item) is item
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        parse_source_item(_item(channel="DryxioGTA"))


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


def test_search_wrapper_validates_limit_and_results():
    with pytest.raises(ValueError, match="limit must be an int >= 1"):
        parse_search_limit(0)
    with pytest.raises(ValueError, match="limit must be an int >= 1"):
        parse_search_limit(-1)
    with pytest.raises(ValueError, match="limit must be an int >= 1"):
        parse_search_limit(True)
    with pytest.raises(ValueError, match="limit must be an int >= 1"):
        DummySource().search("ocean", limit=0)

    truncated = OverproducingSource().search("any", limit=2)
    assert len(truncated) == 2
    assert all(isinstance(item, SourceItem) for item in truncated)

    with pytest.raises(TypeError, match="list of SourceItem"):
        DictResultSource().search("any")
    with pytest.raises(TypeError, match="list of SourceItem"):
        MixedResultSource().search("any")
    with pytest.raises(TypeError, match="list of SourceItem"):
        validate_search_results({"id": "x"}, limit=1)


@pytest.mark.parametrize(
    ("source_name", "required_vars"),
    [
        (SourceName.x, ("X_BEARER_TOKEN",)),
        (
            SourceName.reddit,
            ("REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT"),
        ),
        (SourceName.instagram, ("INSTAGRAM_TOKEN", "INSTAGRAM_USER_ID")),
        (SourceName.youtube, ("YOUTUBE_API_KEY",)),
    ],
)
def test_required_search_sources_warn_and_return_empty_without_env(
    clear_search_env, source_name, required_vars
):
    source = RecordingSource(source_name)
    with patch("app.services.sources.base.logger.warning") as warning:
        results = source.search("anything")

    assert results == []
    assert source.called is False
    warning.assert_called_once()
    text = _warning_text(warning)
    for name in required_vars:
        assert name in text
    assert "yt-dlp" not in text
    for secret in ENV_SECRETS.values():
        assert secret not in text
        assert secret not in warning.call_args.args


def test_instagram_skips_when_either_required_var_is_missing(
    clear_search_env, monkeypatch
):
    _set_source_env(monkeypatch, "INSTAGRAM_TOKEN")
    source = RecordingSource(SourceName.instagram)
    with patch("app.services.sources.base.logger.warning") as warning:
        results = source.search("reel")

    assert results == []
    assert source.called is False
    text = _warning_text(warning)
    assert "INSTAGRAM_USER_ID" in text
    assert ENV_SECRETS["INSTAGRAM_TOKEN"] not in text


def test_unnamed_and_predecorated_sources_still_run_search(clear_search_env):
    class UnnamedSource(Source):
        def search(self, query: str, limit: int = 10) -> list[SourceItem]:
            return [parse_source_item(_item(source="local", type="user"))]

    class PredecoratedSource(Source):
        name = SourceName.local

        @require_source_env
        def search(self, query: str, limit: int = 10) -> list[SourceItem]:
            return [parse_source_item(_item(source="local", type="chart"))]

    unnamed = UnnamedSource()
    assert unnamed.missing_required_env_vars() == []
    assert unnamed.missing_optional_env_vars() == []
    assert DummySource().missing_optional_env_vars() == []
    assert unnamed.search("q")[0].type is SourceType.user
    assert PredecoratedSource().search("q")[0].type is SourceType.chart


def test_search_runs_when_all_source_env_vars_are_present(
    clear_search_env, monkeypatch
):
    _set_source_env(monkeypatch, *SEARCH_ENV_VARS)
    with patch("app.services.sources.base.logger.warning") as warning:
        for name in (
            SourceName.x,
            SourceName.reddit,
            SourceName.instagram,
            SourceName.youtube,
        ):
            source = RecordingSource(name)
            results = source.search("ok")
            assert source.called is True
            assert len(results) == 1
            assert results[0].source is name
    warning.assert_not_called()
    for call in warning.call_args_list:
        for secret in ENV_SECRETS.values():
            assert secret not in str(call)


def test_optional_env_helper_is_reserved_and_does_not_block(monkeypatch):
    monkeypatch.delenv("OPTIONAL_DEMO", raising=False)
    spec = SourceEnvSpec(optional=("OPTIONAL_DEMO",))
    assert missing_env_names(spec, required=True, optional=False) == []
    assert missing_env_names(spec, required=False, optional=True) == ["OPTIONAL_DEMO"]
    assert missing_source_env_vars(SourceName.local) == []


def test_validate_licencas_json_reports_invalid_entries(tmp_path, capsys):
    valid = [
        {"id": "a", "license": "cc-by"},
        {"id": "b", "licenca": License.terceiro},
        "cc0",
    ]
    assert validate_licencas(valid) == []
    assert validate_licencas({"items": [{"license": "stock"}]}) == []
    assert validate_licencas({"clip": "proprio", "other": {"licenca": "cc0"}}) == []

    issues = validate_licencas(
        [
            {"id": "bad", "license": "CC BY 4.0"},
            {"id": "missing"},
            {"id": "blank", "license": "  "},
            12,
        ]
    )
    assert [issue.location for issue in issues] == [
        "[0].license",
        "[1]",
        "[2].license",
        "[3]",
    ]

    mapped = validate_licencas(
        {"good": "cc0", "bad": "MIT", "obj": {"title": "x"}, "num": 12}
    )
    assert {issue.location for issue in mapped} == {"bad", "obj", "num"}
    assert validate_licencas("nope")[0].location == "$"
    assert validate_licencas({"licenses": {"no": "list"}})[0].location == "licenses"

    path = tmp_path / "licencas.json"
    path.write_text(json.dumps([{"license": "cc-by"}, {"license": "not-a-license"}]), encoding="utf-8")
    file_issues = validate_licencas_file(path)
    assert len(file_issues) == 1
    assert file_issues[0].location == "[1].license"

    assert licencas_main([str(path)]) == 1
    assert "INVALID" in capsys.readouterr().err

    good = tmp_path / "ok.json"
    good.write_text(json.dumps([{"license": "cc0"}]), encoding="utf-8")
    assert licencas_main([str(good)]) == 0
    assert capsys.readouterr().out.strip() == "OK"

    assert licencas_main([str(tmp_path / "missing.json")]) == 2
    broken = tmp_path / "broken.json"
    broken.write_text("{", encoding="utf-8")
    assert licencas_main([str(broken)]) == 2
    assert licencas_main([str(tmp_path)]) == 2

    with patch.object(sys, "argv", ["app.services.sources", str(good)]):
        with pytest.raises(SystemExit) as exited:
            runpy.run_module("app.services.sources", run_name="__main__")
    assert exited.value.code == 0
