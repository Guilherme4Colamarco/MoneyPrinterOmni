"""Contorno configurável e vinheta opcional do build_thumbnail.py."""

from argparse import Namespace
from pathlib import Path
import sys

SCRIPTS = Path(__file__).resolve().parents[2] / ".agents/skills/video/scripts"
sys.path.insert(0, str(SCRIPTS))

import arte  # noqa: E402
import build_thumbnail  # noqa: E402


def _args(**extra) -> Namespace:
    return Namespace(
        size="1280x720",
        text="TESTE|LINHA",
        image="bg.png",
        source=None,
        at=0.0,
        out="publicacao/thumb-A.png",
        outline_color=None,
        no_vignette=False,
        **extra,
    )


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
