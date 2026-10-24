import copy
import json
import runpy
import sys
from datetime import datetime, timezone, tzinfo
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.services.sources import (
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
    parse_covers,
    parse_duration,
    parse_license,
    parse_published_at,
    parse_search_limit,
    parse_source_item,
    parse_source_name,
    parse_source_type,
    parse_url,
    register_search_env,
    require_source_env,
    source_item_error_details,
    validate_licencas,
    validate_licencas_file,
    validate_search_results,
)
from app.services.sources.base import parse_optional_text
from app.services.sources.licencas import _validate_sequence, main as licencas_main

LICENCAS_FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "licencas_ia_por_tras_infantil.json"
)


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
    for name in SEARCH_SOURCE_NAMES:
        assert name in SOURCE_ENV_VARS
        assert SOURCE_ENV_VARS[name].required
    assert set(SOURCE_ENV_VARS) == set(SEARCH_SOURCE_NAMES)
    assert set(SOURCE_ENV_VARS).isdisjoint(GENERATOR_SOURCE_NAMES)
    assert SEARCHABLE_SOURCE_NAMES == SEARCH_SOURCE_NAMES | {
        SourceName.pexels,
        SourceName.pixabay,
        SourceName.coverr,
        SourceName.local,
    }
    assert SourceName.yt_dlp not in SEARCHABLE_SOURCE_NAMES
    assert SEARCHABLE_SOURCE_NAMES.isdisjoint(GENERATOR_SOURCE_NAMES)


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
    with pytest.raises(SourceItemError, match="http or https"):
        parse_source_item(_item(url=None))
    with pytest.raises(SourceItemError, match="http or https"):
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


def _assert_error_hides_sentinel(error: SourceItemError, sentinel: str) -> None:
    dumped = error.json()
    details = error.errors()
    helper = source_item_error_details(error)
    for blob in (str(error), repr(error), dumped, json.dumps(details), json.dumps(helper)):
        assert sentinel not in blob
    assert all("input" not in item for item in details)
    assert all("input" not in item for item in helper)


def test_credential_url_errors_hide_sentinel_secret():
    sentinel = "SENTINELA123"
    secret_url = f"https://user:{sentinel}@example.com/x"
    with pytest.raises(SourceItemError) as excinfo:
        parse_source_item(_item(url=secret_url))
    _assert_error_hides_sentinel(excinfo.value, sentinel)

    with pytest.raises(ValidationError) as raw_info:
        SourceItem.model_validate(_item(url=secret_url))
    stripped = source_item_error_details(raw_info.value)
    assert all("input" not in item for item in stripped)
    assert sentinel not in json.dumps(stripped)

    with pytest.raises(SourceItemError) as extra_info:
        parse_source_item(_item(canal_secreto=f"https://user:{sentinel}@evil.example/x"))
    _assert_error_hides_sentinel(extra_info.value, sentinel)

    empty = SourceItemError([])
    assert str(empty) == "invalid SourceItem"
    assert empty.errors() == []
    assert empty.json() == "[]"
    assert source_item_error_details(empty) == []
    with pytest.raises(TypeError, match="SourceItemError or ValidationError"):
        source_item_error_details(ValueError("nope"))


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
    with pytest.raises(SourceItemError, match="timezone-aware"):
        parse_source_item(_item(published_at=datetime(2024, 6, 1, 12, 0)))
    with pytest.raises(SourceItemError, match="timezone-aware"):
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
    with pytest.raises(SourceItemError, match="license_note must be a string"):
        parse_source_item(_item(license_note=1))
    with pytest.raises(SourceItemError, match="id must be a string"):
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
    with pytest.raises(SourceItemError, match="Extra inputs are not permitted"):
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


def _load_licencas_fixture() -> dict[str, Any]:
    return json.loads(LICENCAS_FIXTURE.read_text(encoding="utf-8"))


def _set_nested(data: dict[str, Any], parts: tuple[Any, ...], value: Any) -> dict[str, Any]:
    clone = copy.deepcopy(data)
    target: Any = clone
    for part in parts[:-1]:
        target = target[part]
    target[parts[-1]] = value
    return clone


def test_register_search_env_allowlist_rejects_ytdlp_and_generators():
    for name in (SourceName.yt_dlp, *GENERATOR_SOURCE_NAMES):
        with pytest.raises(ValueError, match="cannot be registered as a search source"):
            register_search_env(name, SourceEnvSpec(required=("NOPE",)))
        assert name not in SOURCE_ENV_VARS

    spec = SourceEnvSpec(required=("PEXELS_API_KEY",))
    try:
        register_search_env(SourceName.pexels, spec)
        assert SOURCE_ENV_VARS[SourceName.pexels] is spec
        register_search_env(SourceName.local, SourceEnvSpec())
        assert SourceName.local in SOURCE_ENV_VARS
    finally:
        SOURCE_ENV_VARS.pop(SourceName.pexels, None)
        SOURCE_ENV_VARS.pop(SourceName.local, None)
    assert set(SOURCE_ENV_VARS) == set(SEARCH_SOURCE_NAMES)


def test_validate_licencas_json_reports_invalid_entries(tmp_path, capsys):
    valid = [
        {"id": "a", "license": "cc-by"},
        {"id": "b", "licenca": License.terceiro},
        "cc0",
        License.cc0,
    ]
    assert validate_licencas(valid) == []
    assert validate_licencas({"items": [{"license": "stock"}]}) == []
    assert validate_licencas({"clip": "proprio", "other": {"licenca": "cc0"}}) == []
    assert validate_licencas({"owned": License.proprio}) == []
    assert validate_licencas([{"license": License.cc_by}]) == []

    issues = validate_licencas(
        [
            {"id": "bad", "license": "CC BY 4.0"},
            {"id": "missing"},
            {"id": "blank", "license": "  "},
            12,
            ["nested"],
            {"license": {"nested": True}},
        ]
    )
    assert [issue.location for issue in issues] == [
        "[0].license",
        "[1].license",
        "[2].license",
        "[3].license",
        "[4].license",
        "[5].license",
    ]
    assert issues[1].value is None
    assert issues[4].value is None
    assert issues[5].value is None

    mapped = validate_licencas(
        {"good": "cc0", "bad": "MIT", "obj": {"title": "x"}, "num": 12}
    )
    assert {issue.location for issue in mapped} == {"bad", "obj.license", "num"}
    assert validate_licencas("nope")[0].location == "$"
    assert validate_licencas({"licenses": {"no": "list"}})[0].location == "licenses.license"
    assert _validate_sequence({"no": "list"}, "music")[0].location == "music"
    assert _validate_sequence("nope", "")[0].location == "$"

    path = tmp_path / "licencas.json"
    path.write_text(json.dumps([{"license": "cc-by"}, {"license": "not-a-license"}]), encoding="utf-8")
    file_issues = validate_licencas_file(path)
    assert len(file_issues) == 1
    assert file_issues[0].location == "[1].license"
    listed = str(file_issues[0])
    assert "[1].license" in listed
    assert "not-a-license" in listed
    mapped_text = str(next(issue for issue in mapped if issue.location == "bad"))
    assert "bad" in mapped_text
    assert "MIT" in mapped_text

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


def test_validate_licencas_skips_versao_metadata():
    assert validate_licencas({"versao": "2", "clip": "cc-by"}) == []
    assert validate_licencas(
        {"versao": "1.0", "items": [{"license": "stock"}]}
    ) == []
    issues = validate_licencas({"versao": "9", "bad": "MIT"})
    assert [issue.location for issue in issues] == ["bad"]
    assert all(issue.location != "versao" for issue in issues)


def test_fixture_licencas_ia_por_tras_infantil_has_zero_errors():
    data = _load_licencas_fixture()
    assert data["versao"] == "1"
    assert len(data["music"]) == 3
    assert len(data["images"]) == 1
    assert len(data["clips"]) == 2
    assert data["clips"][0]["n"] == "01"
    assert data["clips"][0]["file"] == "timeline/01.mp4"
    assert data["clips"][0]["source_render"] == "raw/anim3_01.mp4"
    assert isinstance(data["voice"], dict)
    assert isinstance(data["render"], dict)
    assert len(data["fonts"]) == 1
    assert validate_licencas(data) == []
    assert validate_licencas_file(LICENCAS_FIXTURE) == []


@pytest.mark.parametrize(
    ("parts", "expected_path"),
    [
        (("music", 0, "license"), "music[0].license"),
        (("images", 0, "license"), "images[0].license"),
        (("clips", 1, "license"), "clips[1].license"),
        (("fonts", 0, "license"), "fonts[0].license"),
        (("voice", "license"), "voice.license"),
        (("render", "license"), "render.license"),
    ],
)
def test_invalid_license_reports_exact_section_path(parts, expected_path):
    variant = _set_nested(_load_licencas_fixture(), parts, "licenca-invalida")
    issues = validate_licencas(variant)
    assert len(issues) == 1
    assert issues[0].location == expected_path
    assert issues[0].value == "licenca-invalida"
    text = str(issues[0])
    assert expected_path in text
    assert "licenca-invalida" in text
    assert "incompetech" not in text
    assert "timeline/" not in text
    assert "Remotion" not in text
    assert "origin" not in text


def test_licencas_error_hides_origin_and_masks_credentials():
    sentinel = "SENTINELA123"
    data = _load_licencas_fixture()
    data["clips"][0]["origin"] = f"https://user:{sentinel}@example.com/clip"
    data["clips"][0]["license"] = "MIT"
    issues = validate_licencas(data)
    assert [issue.location for issue in issues] == ["clips[0].license"]
    text = str(issues[0])
    assert sentinel not in text
    assert "origin" not in text
    assert "user:" not in text

    leaked = _set_nested(
        _load_licencas_fixture(),
        ("music", 1, "license"),
        f"https://user:{sentinel}@incompetech.com/secret",
    )
    leaked_issues = validate_licencas(leaked)
    assert leaked_issues[0].location == "music[1].license"
    shown = str(leaked_issues[0])
    assert sentinel not in shown
    assert "user:pass@" not in shown
    assert "user:" not in shown
    assert "***@" in shown
