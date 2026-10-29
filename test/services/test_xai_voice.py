import base64
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services import voice as vs


def _timestamp_payload(text="Hello world.", duration=0.92):
    chars = list(text)
    step = duration / max(len(chars), 1)
    times = [[round(i * step, 4), round((i + 1) * step, 4)] for i in range(len(chars))]
    return {
        "audio": base64.b64encode(b"fake-xai-mp3").decode("ascii"),
        "content_type": "audio/mpeg",
        "duration": duration,
        "audio_timestamps": {
            "graph_chars": chars,
            "graph_times": times,
        },
    }


def _json_response(payload, status=200):
    body = json.dumps(payload).encode("utf-8")
    return SimpleNamespace(
        status_code=status,
        content=body,
        text=body.decode("utf-8"),
        headers={"Content-Type": "application/json"},
        close=lambda: None,
    )


def _raw_response(audio=b"fake-xai-mp3", status=200):
    return SimpleNamespace(
        status_code=status,
        content=audio,
        text="",
        headers={"Content-Type": "audio/mpeg"},
        close=lambda: None,
    )


class TestXaiVoiceCatalog(unittest.TestCase):
    def test_get_xai_voices_matches_documented_catalog(self):
        voices = vs.get_xai_voices()
        self.assertEqual(
            voices,
            [
                "xai:eve-Energetic",
                "xai:ara-Friendly",
                "xai:rex-Clear",
                "xai:sal-Smooth",
                "xai:leo-Authoritative",
            ],
        )
        self.assertTrue(all(name.startswith("xai:") for name in voices))

    def test_parse_xai_voice_name_strips_style_and_keeps_custom_ids(self):
        self.assertEqual(vs.parse_xai_voice_name("xai:eve-Energetic"), "eve")
        self.assertEqual(vs.parse_xai_voice_name("xai:Ara-Friendly"), "ara")
        self.assertEqual(vs.parse_xai_voice_name("xai:eve"), "eve")
        self.assertEqual(
            vs.parse_xai_voice_name("xai:custom-voice-uuid-123"),
            "custom-voice-uuid-123",
        )
        self.assertEqual(vs.parse_xai_voice_name("gemini:eve-Energetic"), "")

    def test_is_xai_voice_and_azure_v1_exclusion(self):
        self.assertTrue(vs.is_xai_voice("xai:eve-Energetic"))
        self.assertFalse(vs.is_xai_voice("gemini:eve-Energetic"))
        self.assertFalse(vs.is_azure_v1_voice("xai:eve-Energetic"))


class TestXaiApiKey(unittest.TestCase):
    def test_prefers_xai_config_section(self):
        with (
            patch.object(vs.config, "xai", {"api_key": "xai-config-key"}),
            patch.object(vs.config, "app", {"grok_api_key": "grok-key"}),
            patch.dict(os.environ, {"XAI_API_KEY": "env-key"}),
        ):
            self.assertEqual(vs.get_xai_api_key(), "xai-config-key")

    def test_falls_back_to_xai_api_key_env(self):
        with (
            patch.object(vs.config, "xai", {"api_key": ""}),
            patch.object(vs.config, "app", {"grok_api_key": "grok-key"}),
            patch.dict(os.environ, {"XAI_API_KEY": " env-key "}),
        ):
            self.assertEqual(vs.get_xai_api_key(), "env-key")

    def test_falls_back_to_grok_api_key(self):
        with (
            patch.object(vs.config, "xai", {"api_key": ""}),
            patch.object(vs.config, "app", {"grok_api_key": "grok-key"}),
            patch.dict(os.environ, {}, clear=True),
        ):
            self.assertEqual(vs.get_xai_api_key(), "grok-key")

    def test_missing_key_is_empty(self):
        with (
            patch.object(vs.config, "xai", {}),
            patch.object(vs.config, "app", {}),
            patch.dict(os.environ, {}, clear=True),
        ):
            self.assertEqual(vs.get_xai_api_key(), "")


class TestXaiTimeout(unittest.TestCase):
    def test_default_timeout_is_600(self):
        with patch.object(vs.config, "xai", {}):
            self.assertEqual(vs.get_xai_tts_timeout(), 600)

    def test_reads_xai_timeout_from_config(self):
        with patch.object(vs.config, "xai", {"timeout": 120}):
            self.assertEqual(vs.get_xai_tts_timeout(), 120)

    def test_invalid_timeout_falls_back_to_default(self):
        with patch.object(vs.config, "xai", {"timeout": "fast"}):
            self.assertEqual(vs.get_xai_tts_timeout(), 600)
        with patch.object(vs.config, "xai", {"timeout": 0}):
            self.assertEqual(vs.get_xai_tts_timeout(), 600)
        with patch.object(vs.config, "xai", {"timeout": -5}):
            self.assertEqual(vs.get_xai_tts_timeout(), 600)


class TestXaiTimestamps(unittest.TestCase):
    def test_character_timestamps_group_into_words(self):
        words = vs._xai_character_timestamps_to_words(
            {
                "graph_chars": list("Hello world."),
                "graph_times": [
                    [0.00, 0.06],
                    [0.06, 0.12],
                    [0.12, 0.18],
                    [0.18, 0.24],
                    [0.24, 0.34],
                    [0.34, 0.40],
                    [0.40, 0.48],
                    [0.48, 0.54],
                    [0.54, 0.62],
                    [0.62, 0.68],
                    [0.68, 0.78],
                    [0.78, 0.92],
                ],
            }
        )
        self.assertEqual(
            words,
            [("Hello", 0.00, 0.34), ("world.", 0.40, 0.92)],
        )

    def test_speech_tags_are_skipped(self):
        words = vs._xai_character_timestamps_to_words(
            {
                "graph_chars": list("Hi [pause] there"),
                "graph_times": [
                    [0.0, 0.1],
                    [0.1, 0.2],
                    [0.2, 0.3],
                    [0.3, 0.4],
                    [0.4, 0.5],
                    [0.5, 0.6],
                    [0.6, 0.7],
                    [0.7, 0.8],
                    [0.8, 0.9],
                    [0.9, 1.0],
                    [1.0, 1.1],
                    [1.1, 1.2],
                    [1.2, 1.3],
                    [1.3, 1.4],
                    [1.4, 1.5],
                    [1.5, 1.6],
                ],
            }
        )
        self.assertEqual([word for word, _start, _end in words], ["Hi", "there"])

    def test_missing_timestamps_use_legacy_sentence_fallback(self):
        sub_maker = vs._populate_submaker_from_xai_timestamps(
            "First sentence. Second sentence.",
            None,
            4.0,
        )
        self.assertEqual(sub_maker.subs, ["First sentence", "Second sentence"])
        self.assertEqual(len(sub_maker.offset), 2)
        self.assertEqual(sub_maker.offset[-1][1], 40_000_000)


class TestXaiTtsHttp(unittest.TestCase):
    def test_tts_routes_to_xai_provider(self):
        sentinel = object()
        with patch.object(vs, "xai_tts", return_value=sentinel) as mock_tts:
            result = vs.tts(
                text="Hello from Grok Voice.",
                voice_name="xai:eve-Energetic",
                voice_rate=1.1,
                voice_file="/tmp/xai-route.mp3",
                voice_volume=1.0,
            )
        self.assertIs(result, sentinel)
        mock_tts.assert_called_once_with(
            "Hello from Grok Voice.",
            "eve",
            1.1,
            "/tmp/xai-route.mp3",
            1.0,
        )

    def test_xai_tts_empty_text(self):
        self.assertIsNone(vs.xai_tts("  ", "eve", 1.0, "/tmp/xai.mp3"))

    def test_xai_tts_no_api_key(self):
        with (
            patch.object(vs, "get_xai_api_key", return_value=""),
            patch.dict(os.environ, {}, clear=True),
        ):
            self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, "/tmp/xai.mp3"))

    @patch.object(vs, "_validate_remote_tts_audio", new=lambda _path: None)
    def test_xai_tts_success_uses_native_timestamps(self):
        payload = _timestamp_payload("Hello world.")
        response = _json_response(payload)
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs, "get_xai_tts_language", return_value="pt-BR"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs, "AudioFileClip") as clip,
            ):
                clip.return_value.duration = 0.92
                clip.return_value.close = lambda: None
                result = vs.xai_tts("Hello world.", "eve", 1.2, out_path)

            self.assertIsNotNone(result)
            self.assertEqual(result.subs, ["Hello", "world."])
            self.assertEqual(len(result.offset), 2)
            self.assertEqual(Path(out_path).read_bytes(), b"fake-xai-mp3")
            post.assert_called_once()
            self.assertEqual(post.call_args.args[0], vs.XAI_TTS_URL)
            self.assertEqual(post.call_args.kwargs["allow_redirects"], False)
            self.assertEqual(
                post.call_args.kwargs["headers"]["Authorization"],
                "Bearer test-key",
            )
            sent = post.call_args.kwargs["json"]
            self.assertEqual(sent["voice_id"], "eve")
            self.assertEqual(sent["language"], "pt-BR")
            self.assertEqual(sent["speed"], 1.2)
            self.assertTrue(sent["with_timestamps"])
            self.assertEqual(sent["text"], "Hello world.")
            self.assertEqual(
                post.call_args.kwargs["timeout"],
                (vs.XAI_TTS_CONNECT_TIMEOUT_SECONDS, 600),
            )

    @patch.object(vs, "_validate_remote_tts_audio", new=lambda _path: None)
    def test_xai_tts_raw_audio_uses_legacy_fallback(self):
        response = _raw_response()
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response),
                patch.object(vs, "AudioFileClip") as clip,
            ):
                clip.return_value.duration = 2.0
                clip.return_value.close = lambda: None
                result = vs.xai_tts("One sentence. Two sentences.", "orion", 1.0, out_path)

            self.assertIsNotNone(result)
            self.assertEqual(result.subs, ["One sentence", "Two sentences"])
            self.assertEqual(result.offset[-1][1], 20_000_000)

    @patch.object(vs, "_validate_remote_tts_audio", new=lambda _path: None)
    def test_xai_tts_clamps_speed_to_documented_range(self):
        response = _json_response(_timestamp_payload("Hi"))
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs, "AudioFileClip") as clip,
            ):
                clip.return_value.duration = 0.5
                clip.return_value.close = lambda: None
                self.assertIsNotNone(vs.xai_tts("Hi", "eve", 2.0, out_path))

            self.assertEqual(post.call_args.kwargs["json"]["speed"], 1.5)

    def test_xai_tts_does_not_follow_or_retry_redirect(self):
        response = SimpleNamespace(
            status_code=307,
            content=b"moved",
            text="moved",
            headers={},
            close=unittest.mock.Mock(),
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = Path(tmp_dir) / "voice.mp3"
            with (
                patch.object(vs, "get_xai_api_key", return_value="secret-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, str(out_path)))

            self.assertEqual(post.call_count, 1)
            self.assertEqual(post.call_args.kwargs["allow_redirects"], False)
            self.assertFalse(out_path.exists())
            response.close.assert_called_once()

    def test_xai_tts_non_retryable_auth_error(self):
        response = SimpleNamespace(
            status_code=401,
            content=b"unauthorized",
            text="unauthorized",
            headers={},
            close=lambda: None,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="bad-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, out_path))
            self.assertEqual(post.call_count, 1)

    @patch.object(vs, "_validate_remote_tts_audio", new=lambda _path: None)
    def test_xai_tts_rejects_oversize_audio_without_replacing_existing_file(self):
        payload = _timestamp_payload("Hello")
        payload["audio"] = base64.b64encode(b"oversize-audio").decode("ascii")
        response = _json_response(payload)
        with tempfile.TemporaryDirectory() as tmp_dir:
            output = Path(tmp_dir) / "voice.mp3"
            output.write_bytes(b"previous-valid-audio")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs, "XAI_TTS_MAX_AUDIO_BYTES", 5),
            ):
                result = vs.xai_tts("Hello", "eve", 1.0, str(output))

            self.assertIsNone(result)
            self.assertEqual(output.read_bytes(), b"previous-valid-audio")
            self.assertEqual(post.call_count, 1)

    @patch.object(vs, "_validate_remote_tts_audio", new=lambda _path: None)
    def test_xai_tts_decode_failure_preserves_existing_file(self):
        response = _json_response(_timestamp_payload("Hello"))
        with tempfile.TemporaryDirectory() as tmp_dir:
            output = Path(tmp_dir) / "voice.mp3"
            output.write_bytes(b"previous-valid-audio")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs, "AudioFileClip", side_effect=OSError("bad mp3")),
            ):
                result = vs.xai_tts("Hello", "eve", 1.0, str(output))

            self.assertIsNone(result)
            self.assertEqual(output.read_bytes(), b"previous-valid-audio")
            self.assertEqual(post.call_count, 1)

    def test_xai_tts_passes_configured_connect_and_read_timeout(self):
        response = SimpleNamespace(
            status_code=401,
            content=b"unauthorized",
            text="unauthorized",
            headers={},
            close=lambda: None,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs, "get_xai_tts_timeout", return_value=120),
                patch.object(vs.requests, "post", return_value=response) as post,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, out_path))

            self.assertEqual(
                post.call_args.kwargs["timeout"],
                (vs.XAI_TTS_CONNECT_TIMEOUT_SECONDS, 120),
            )

    def test_xai_tts_retries_on_read_timeout(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(
                    vs.requests,
                    "post",
                    side_effect=vs.requests.exceptions.ReadTimeout("read timed out"),
                ) as post,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, out_path))
            self.assertEqual(post.call_count, 3)

    def test_xai_tts_retries_429_with_exponential_backoff(self):
        response = SimpleNamespace(
            status_code=429,
            content=b"rate limited",
            text="rate limited",
            headers={},
            close=lambda: None,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs.time, "sleep") as sleep,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, out_path))

            self.assertEqual(post.call_count, 3)
            self.assertEqual(
                [call.args[0] for call in sleep.call_args_list],
                [1, 2, 4],
            )

    def test_xai_tts_429_honors_retry_after(self):
        response = SimpleNamespace(
            status_code=429,
            content=b"rate limited",
            text="rate limited",
            headers={"Retry-After": "3"},
            close=lambda: None,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = str(Path(tmp_dir) / "voice.mp3")
            with (
                patch.object(vs, "get_xai_api_key", return_value="test-key"),
                patch.object(vs.requests, "post", return_value=response) as post,
                patch.object(vs.time, "sleep") as sleep,
            ):
                self.assertIsNone(vs.xai_tts("Hello", "eve", 1.0, out_path))

            self.assertEqual(post.call_count, 3)
            self.assertEqual(
                [call.args[0] for call in sleep.call_args_list],
                [3.0, 3.0, 3.0],
            )


if __name__ == "__main__":
    unittest.main()
