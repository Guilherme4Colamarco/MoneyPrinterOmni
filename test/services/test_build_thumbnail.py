"""Contorno configurável e vinheta opcional do build_thumbnail.py."""

from argparse import Namespace
from pathlib import Path
import sys

SCRIPTS = Path(__file__).resolve().parents[2] / ".agents/skills/video/scripts"
sys.path.insert(0, str(SCRIPTS))

import arte  # noqa: E402
import build_thumbnail  # noqa: E402


def _args(**extra) -> Namespace:
    values = dict(
        size="1280x720",
        text="TESTE|LINHA",
        image="bg.png",
        source=None,
        at=0.0,
        out="publicacao/thumb-A.png",
        outline_color=None,
        no_vignette=False,
    )
    values.update(extra)
    return Namespace(**values)


def test_drawtext_default_outline_keeps_current_color(tmp_path):
    textfile = tmp_path / "line.txt"
    filt = arte.drawtext(
        "OI", str(textfile), font="BeVietnamPro-Bold.ttf", color="#FFFFFF",
        size=48, x="0", y="0", border=4,
    )
    assert "bordercolor=black@0.85" in filt


def test_drawtext_accepts_custom_outline(tmp_path):
    textfile = tmp_path / "line.txt"
    filt = arte.drawtext(
        "OI", str(textfile), font="BeVietnamPro-Bold.ttf", color="#FFFFFF",
        size=48, x="0", y="0", border=4, border_color="#112233@1",
    )
    assert "bordercolor=#112233@1" in filt
    assert "bordercolor=black@0.85" not in filt


def test_thumbnail_default_keeps_vignette_and_default_outline(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = {}

    def fake_run(cmd, check):
        seen["cmd"] = cmd
        Path(cmd[-1]).parent.mkdir(parents=True, exist_ok=True)
        Path(cmd[-1]).write_bytes(b"out")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    out = build_thumbnail.build(str(tmp_path), _args())
    vf = seen["cmd"][seen["cmd"].index("-vf") + 1]
    assert "vignette=PI/4.5" in vf
    assert "bordercolor=black@0.85" in vf
    assert out.endswith("publicacao/thumb-A.png")


def test_thumbnail_no_vignette_and_custom_outline(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = {}

    def fake_run(cmd, check):
        seen["cmd"] = cmd
        Path(cmd[-1]).parent.mkdir(parents=True, exist_ok=True)
        Path(cmd[-1]).write_bytes(b"out")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    build_thumbnail.build(
        str(tmp_path),
        _args(outline_color="#ff00ff@0.9", no_vignette=True),
    )
    vf = seen["cmd"][seen["cmd"].index("-vf") + 1]
    assert "vignette=" not in vf
    assert "bordercolor=#ff00ff@0.9" in vf


def test_kabel_font_is_gone():
    fonts = Path(__file__).resolve().parents[2] / "resource/fonts"
    leftovers = list(fonts.glob("*Kabel*")) + list(
        (Path(__file__).resolve().parents[2] / "animations/public").glob("*Kabel*")
    )
    assert leftovers == []


def test_bevietnampro_black_extrabold_and_ofl_ship_with_the_fonts():
    root = Path(__file__).resolve().parents[2]
    required = (
        "BeVietnamPro-Black.ttf",
        "BeVietnamPro-ExtraBold.ttf",
        "OFL.txt",
    )
    for folder in (root / "resource/fonts", root / "animations/public"):
        for name in required:
            path = folder / name
            assert path.is_file(), path
            assert path.stat().st_size > 0
    ofl = (root / "resource/fonts/OFL.txt").read_text(encoding="utf-8")
    assert "SIL Open Font License, Version 1.1" in ofl
    assert "Be Vietnam Pro Project Authors" in ofl


def test_validate_color_accepts_named_hex_and_alpha():
    for value in (
        "black",
        "White",
        "black@0.85",
        "red@0",
        "blue@1",
        "green@1.0",
        "yellow@.5",
        "#112233",
        "#ff00ff@0.9",
        "0xAABBCC",
        "0x112233@1",
    ):
        assert arte.validate_color(value) == value


def test_validate_color_rejects_filter_injection_and_invalid_values():
    for value in (
        "black@0.85:enable=1",
        "red:foo",
        "#FFFFFF@1,drawbox=x=0",
        "0xFFFFFF:eval",
        "black@0.85;scale",
        "black@2",
        "black@-0.1",
        "black@1.01",
        "#FFF",
        "#GGGGGG",
        "0x12345",
        "",
        "white@1e1",
        "black@0.85]",
    ):
        try:
            arte.validate_color(value, field="contorno")
        except ValueError as exc:
            assert "contorno inválida" in str(exc)
            assert repr(value) in str(exc)
        else:
            raise AssertionError(f"deveria rejeitar {value!r}")


def test_drawtext_rejects_injected_outline(tmp_path):
    textfile = tmp_path / "line.txt"
    try:
        arte.drawtext(
            "OI", str(textfile), font="BeVietnamPro-Bold.ttf", color="#FFFFFF",
            size=48, x="0", y="0", border=4,
            border_color="black@0.85:enable=1",
        )
    except ValueError as exc:
        assert "contorno inválida" in str(exc)
    else:
        raise AssertionError("drawtext deveria rejeitar injeção no contorno")


def test_cli_rejects_injected_outline_with_clear_error(capsys, monkeypatch):
    monkeypatch.setattr(
        "sys.argv",
        [
            "build_thumbnail.py", "/tmp/proj", "--image", "bg.png",
            "--text", "X", "--outline-color", "black@0.85:enable=1",
        ],
    )
    try:
        build_thumbnail.main()
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("CLI deveria sair com código 2")
    err = capsys.readouterr().err
    assert "contorno inválida" in err
    assert "black@0.85:enable=1" in err


def test_thumbnail_rejects_injected_outline_from_arte_json(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    (tmp_path / "arte.json").write_text(
        '{"thumbnail": {"outline": "black@0.85:enable=1"}}', encoding="utf-8"
    )
    monkeypatch.setattr(build_thumbnail.subprocess, "run", lambda *a, **k: None)
    try:
        build_thumbnail.build(str(tmp_path), _args())
    except ValueError as exc:
        assert "contorno inválida" in str(exc)
        assert "enable=1" in str(exc)
    else:
        raise AssertionError("build deveria rejeitar thumbnail.outline injetado")
