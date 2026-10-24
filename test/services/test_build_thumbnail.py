"""Contorno configurável, vinheta opcional e validação de cores do ffmpeg."""

from argparse import Namespace
import json
from pathlib import Path
import subprocess
import sys

import pytest

SCRIPTS = Path(__file__).resolve().parents[2] / ".agents/skills/video/scripts"
sys.path.insert(0, str(SCRIPTS))

import arte  # noqa: E402
import build_thumbnail  # noqa: E402

INJECT = "white:enable=0"


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


def _reject(fn, *args, field: str, value: str = INJECT, **kwargs):
    try:
        fn(*args, **kwargs)
    except ValueError as exc:
        text = str(exc)
        assert f"{field} inválida" in text
        assert repr(value) in text
    else:
        raise AssertionError(f"deveria rejeitar {value!r} em {field}")


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


def _capture_ffmpeg(monkeypatch):
    seen = {}

    def fake_run(cmd, check=True, **kwargs):
        seen["cmd"] = cmd
        seen["cwd"] = kwargs.get("cwd")
        if "-filter_script:v" in cmd:
            graph = Path(kwargs["cwd"], cmd[cmd.index("-filter_script:v") + 1])
            seen["graph"] = graph.read_text(encoding="utf-8")
        dest = Path(cmd[-1])
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(b"out")
        return subprocess.CompletedProcess(cmd, 0, b"", b"")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    return seen


def test_thumbnail_default_keeps_vignette_and_default_outline(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = _capture_ffmpeg(monkeypatch)
    out = build_thumbnail.build(str(tmp_path), _args())
    assert "vignette=PI/4.5" in seen["graph"]
    assert "bordercolor=black@0.85" in seen["graph"]
    assert out.endswith("publicacao/thumb-A.png")
    assert "fontfile=f0.ttf" in seen["graph"]
    assert "textfile=t1.txt" in seen["graph"]


def test_thumbnail_no_vignette_and_custom_outline(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = _capture_ffmpeg(monkeypatch)
    build_thumbnail.build(
        str(tmp_path),
        _args(outline_color="#ff00ff@0.9", no_vignette=True),
    )
    assert "vignette=" not in seen["graph"]
    assert "bordercolor=#ff00ff@0.9" in seen["graph"]


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
        "AliceBlue",
        "darkorange",
        "black@0.85",
        "red@0",
        "blue@1",
        "green@1.0",
        "yellow@.5",
        "#112233",
        "#ff00ff@0.9",
        "#11223344",
        "#AABBCCDD@0.5",
        "0xAABBCC",
        "0x112233@1",
        "0x11223344",
        "0xFF00FF80@0.25",
    ):
        assert arte.validate_color(value) == value


def test_validate_color_rejects_unknown_name_and_short_hex():
    for value in ("fooobar", "random", "enable", "#FFF", "#GGGGGG", "0x12345"):
        try:
            arte.validate_color(value)
        except ValueError as exc:
            assert "cor inválida" in str(exc)
            assert repr(value) in str(exc)
        else:
            raise AssertionError(f"deveria rejeitar {value!r}")


def test_validate_color_rejects_filter_injection_and_invalid_values():
    for value in (
        "white:enable=0",
        "black@0.85:enable=1",
        "red:foo",
        "#FFFFFF@1,drawbox=x=0",
        "0xFFFFFF:eval",
        "black@0.85;scale",
        "black@2",
        "black@-0.1",
        "black@1.01",
        "",
        "white@1e1",
        "black@0.85]",
    ):
        try:
            arte.validate_color(value, field="outline")
        except ValueError as exc:
            assert "outline inválida" in str(exc)
            assert repr(value) in str(exc)
        else:
            raise AssertionError(f"deveria rejeitar {value!r}")


def test_ffmpeg_color_list_is_the_documented_set():
    assert len(arte.FFMPEG_COLOR_NAMES) == 140
    assert "White" in arte.FFMPEG_COLOR_NAMES
    assert "YellowGreen" in arte.FFMPEG_COLOR_NAMES
    assert "random" not in {name.lower() for name in arte.FFMPEG_COLOR_NAMES}


def test_load_rejects_injected_thumbnail_color(tmp_path):
    (tmp_path / "arte.json").write_text(
        json.dumps({"thumbnail": {"color": INJECT}}), encoding="utf-8"
    )
    _reject(arte.load, str(tmp_path), field="thumbnail.color")


def test_load_rejects_injected_thumbnail_accent(tmp_path):
    (tmp_path / "arte.json").write_text(
        json.dumps({"thumbnail": {"accent": INJECT}}), encoding="utf-8"
    )
    _reject(arte.load, str(tmp_path), field="thumbnail.accent")


def test_load_rejects_injected_thumbnail_outline(tmp_path):
    (tmp_path / "arte.json").write_text(
        json.dumps({"thumbnail": {"outline": INJECT}}), encoding="utf-8"
    )
    _reject(arte.load, str(tmp_path), field="thumbnail.outline")


def test_load_rejects_injected_texto_na_tela_color(tmp_path):
    (tmp_path / "arte.json").write_text(
        json.dumps({"texto_na_tela": {"color": INJECT}}), encoding="utf-8"
    )
    _reject(arte.load, str(tmp_path), field="texto_na_tela.color")


def test_load_rejects_injected_texto_na_tela_box_color(tmp_path):
    (tmp_path / "arte.json").write_text(
        json.dumps({"texto_na_tela": {"box_color": INJECT}}), encoding="utf-8"
    )
    _reject(arte.load, str(tmp_path), field="texto_na_tela.box_color")


def test_drawtext_rejects_injected_color(tmp_path):
    _reject(
        arte.drawtext, "OI", str(tmp_path / "line.txt"),
        field="color", font="BeVietnamPro-Bold.ttf", color=INJECT,
        size=48, x="0", y="0",
    )


def test_drawtext_rejects_injected_box_color(tmp_path):
    _reject(
        arte.drawtext, "OI", str(tmp_path / "line.txt"),
        field="box_color", font="BeVietnamPro-Bold.ttf", color="#FFFFFF",
        size=48, x="0", y="0", box=True, box_color=INJECT,
    )


def test_drawtext_rejects_injected_border_color(tmp_path):
    _reject(
        arte.drawtext, "OI", str(tmp_path / "line.txt"),
        field="border_color", font="BeVietnamPro-Bold.ttf", color="#FFFFFF",
        size=48, x="0", y="0", border=4, border_color=INJECT,
    )


def test_cli_rejects_injected_outline_with_clear_error(capsys, monkeypatch):
    monkeypatch.setattr(
        "sys.argv",
        [
            "build_thumbnail.py", "/tmp/proj", "--image", "bg.png",
            "--text", "X", "--outline-color", INJECT,
        ],
    )
    try:
        build_thumbnail.main()
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("CLI deveria sair com código 2")
    err = capsys.readouterr().err
    assert "outline inválida" in err
    assert INJECT in err


def test_thumbnail_rejects_injected_outline_from_arte_json(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    (tmp_path / "arte.json").write_text(
        json.dumps({"thumbnail": {"outline": INJECT}}), encoding="utf-8"
    )
    monkeypatch.setattr(build_thumbnail.subprocess, "run", lambda *a, **k: None)
    _reject(build_thumbnail.build, str(tmp_path), _args(), field="thumbnail.outline")


def _write_bg(path: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x1e3a5f:s=320x180:d=1",
         "-frames:v", "1", str(path)],
        check=True,
    )


@pytest.mark.parametrize("name", ["a:b.png", "a'b.png", "x:fontcolor=red.png"])
def test_thumbnail_special_out_name_renders_without_filter_injection(tmp_path, name):
    _write_bg(tmp_path / "bg.png")
    dest = tmp_path / "publicacao" / name
    out = build_thumbnail.build(str(tmp_path), _args(out=str(Path("publicacao") / name)))
    assert Path(out) == dest
    assert dest.is_file()
    assert dest.name == name
    assert dest.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"


def test_thumbnail_percent_d_writes_the_exact_filename(tmp_path):
    _write_bg(tmp_path / "bg.png")
    dest = tmp_path / "publicacao" / "a%d.png"
    out = build_thumbnail.build(str(tmp_path), _args(out=str(Path("publicacao") / "a%d.png")))
    assert Path(out) == dest
    assert dest.is_file()
    assert dest.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
    assert not (tmp_path / "publicacao" / "a1.png").exists()


def test_thumbnail_missing_output_exits_nonzero(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")

    def fake_run(cmd, check=True, **kwargs):
        dest = Path(cmd[-1])
        dest.parent.mkdir(parents=True, exist_ok=True)
        sibling = dest.with_name("a1.png")
        sibling.write_bytes(b"out")
        return subprocess.CompletedProcess(cmd, 0, b"", b"")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    try:
        build_thumbnail.build(str(tmp_path), _args(out=str(Path("publicacao") / "a%d.png")))
    except SystemExit as exc:
        assert exc.code != 0
        assert "a%d.png" in str(exc)
    else:
        raise AssertionError("deveria falhar se o arquivo exato não existir")


@pytest.mark.parametrize("name", ["a:b.png", "a'b.png", "x:fontcolor=red.png"])
def test_thumbnail_special_out_name_stays_out_of_the_filtergraph(tmp_path, monkeypatch, name):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = _capture_ffmpeg(monkeypatch)
    build_thumbnail.build(str(tmp_path), _args(out=str(Path("publicacao") / name)))
    graph = seen["graph"]
    assert name not in graph
    assert "fontfile=f0.ttf" in graph
    assert "textfile=t1.txt" in graph
    assert "fontcolor=red" not in graph
    assert "'" not in graph.split("drawtext=", 1)[-1].split(":expansion=", 1)[0]


def _assert_system_exit(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except SystemExit as exc:
        assert exc.code != 0
        return str(exc)
    raise AssertionError("deveria sair com SystemExit != 0")


@pytest.mark.parametrize("name", ["script.py", "notes.txt"])
def test_thumbnail_rejects_non_image_out_and_leaves_file(tmp_path, monkeypatch, name):
    (tmp_path / "bg.png").write_bytes(b"png")
    victim = tmp_path / name
    original = b"do-not-touch"
    victim.write_bytes(original)
    called = []

    def fake_run(*args, **kwargs):
        called.append(args)
        return subprocess.CompletedProcess(args[0] if args else [], 0, b"", b"")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    text = _assert_system_exit(
        build_thumbnail.build, str(tmp_path), _args(out=name)
    )
    assert "--out recusado" in text
    assert ".png" in text
    assert victim.read_bytes() == original
    assert called == []


def test_thumbnail_rejects_out_directory_and_leaves_contents(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    dest = tmp_path / "publicacao" / "thumb-A.png"
    dest.mkdir(parents=True)
    inside = dest / "keep.txt"
    inside.write_bytes(b"folder-payload")
    called = []
    monkeypatch.setattr(
        build_thumbnail.subprocess, "run",
        lambda *a, **k: called.append(a) or subprocess.CompletedProcess(a[0], 0),
    )
    text = _assert_system_exit(
        build_thumbnail.build, str(tmp_path), _args()
    )
    assert "--out recusado" in text
    assert "pasta" in text
    assert dest.is_dir()
    assert inside.read_bytes() == b"folder-payload"
    assert called == []


def test_thumbnail_rejects_out_symlink_and_leaves_target(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    target = tmp_path / "real-notes.txt"
    target.write_bytes(b"symlink-target")
    dest = tmp_path / "publicacao" / "thumb-A.png"
    dest.parent.mkdir()
    dest.symlink_to(target)
    called = []
    monkeypatch.setattr(
        build_thumbnail.subprocess, "run",
        lambda *a, **k: called.append(a) or subprocess.CompletedProcess(a[0], 0),
    )
    text = _assert_system_exit(
        build_thumbnail.build, str(tmp_path), _args()
    )
    assert "--out recusado" in text
    assert "symlink" in text
    assert dest.is_symlink()
    assert dest.readlink() == target
    assert target.read_bytes() == b"symlink-target"
    assert called == []


@pytest.mark.parametrize("name", ["thumb.jpg", "thumb.jpeg", "thumb.webp"])
def test_thumbnail_accepts_allowed_image_suffixes(tmp_path, monkeypatch, name):
    (tmp_path / "bg.png").write_bytes(b"png")
    seen = _capture_ffmpeg(monkeypatch)
    out = build_thumbnail.build(str(tmp_path), _args(out=str(Path("publicacao") / name)))
    assert Path(out).name == name
    assert Path(out).is_file()
    assert Path(out).stat().st_size > 0
    assert seen["cmd"][-1].endswith(Path(name).suffix)


def test_thumbnail_failed_render_keeps_existing_good_png(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    dest = tmp_path / "publicacao" / "good.png"
    dest.parent.mkdir()
    original = b"GOOD-PNG-BYTES-LEAVE-ME"
    dest.write_bytes(original)

    def fake_run(cmd, check=True, **kwargs):
        return subprocess.CompletedProcess(cmd, 1, b"", b"render failed\n")

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    text = _assert_system_exit(
        build_thumbnail.build, str(tmp_path), _args(out=str(Path("publicacao") / "good.png"))
    )
    assert "ffmpeg saiu 1" in text
    assert dest.read_bytes() == original
    leftovers = list((tmp_path / "publicacao").glob(".thumb-*"))
    assert leftovers == []


def test_thumbnail_ffmpeg_failure_exits_without_traceback(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")

    def fake_run(cmd, check=True, **kwargs):
        return subprocess.CompletedProcess(
            cmd, 234, b"", b"ignored\nNo such filter: boom\n"
        )

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    text = _assert_system_exit(build_thumbnail.build, str(tmp_path), _args())
    assert "ffmpeg saiu 234" in text
    assert "No such filter: boom" in text


def test_thumbnail_ffmpeg_error_truncates_long_stderr_lines(tmp_path, monkeypatch):
    (tmp_path / "bg.png").write_bytes(b"png")
    long_line = "X" * (build_thumbnail._STDERR_LINE_MAX + 80)
    lines = [f"line{i}" for i in range(20)]
    lines[-3] = long_line
    stderr = ("\n".join(lines) + "\n").encode()

    def fake_run(cmd, check=True, **kwargs):
        return subprocess.CompletedProcess(cmd, 7, b"", stderr)

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    text = _assert_system_exit(build_thumbnail.build, str(tmp_path), _args())
    assert "ffmpeg saiu 7" in text
    assert "line11" not in text
    assert "line12" in text
    assert "X" * build_thumbnail._STDERR_LINE_MAX in text
    assert "X" * (build_thumbnail._STDERR_LINE_MAX + 1) not in text


def test_preview_ffmpeg_failure_exits_without_traceback(tmp_path, monkeypatch):
    pub = tmp_path / "publicacao"
    pub.mkdir()
    (pub / "thumb-A.png").write_bytes(b"png")

    def fake_run(cmd, check=True, **kwargs):
        return subprocess.CompletedProcess(
            cmd, 69, b"", b"Error opening filters\n"
        )

    monkeypatch.setattr(build_thumbnail.subprocess, "run", fake_run)
    text = _assert_system_exit(build_thumbnail.preview, str(tmp_path))
    assert "ffmpeg saiu 69" in text
    assert "Error opening filters" in text
