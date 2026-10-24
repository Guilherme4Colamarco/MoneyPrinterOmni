"""Validate a ``licencas.json`` file against :class:`License`.

The helper is network-free and does not change project data files.
List sections (``music``, ``images``, ``clips``, ``fonts``, …) are
checked item by item. Object sections (``voice``, ``render``) are
checked on their ``license`` / ``licenca`` field. The metadata key
``versao`` is skipped.

Errors report only the path (``section[index].license``) and the
license value. Whole sections and ``origin`` are never included.
Credentials in any URL (``user:pass@``) are masked as ``***@``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.sources.base import License

METADATA_KEYS = frozenset({"versao"})
_CREDENTIALS_IN_URL = re.compile(r"(?<=://)[^/\s:@]+:[^/\s@]+@")


@dataclass(frozen=True, slots=True)
class LicenseIssue:
    """One invalid license: path plus the license value only."""

    location: str
    value: Any
    message: str

    def __str__(self) -> str:
        shown = mask_secret_urls(self.value)
        return f"{self.location}: {self.message} (value={shown!r})"


def mask_secret_urls(value: Any) -> Any:
    """Replace ``user:pass@`` in URLs with ``***@``. Non-strings are unchanged."""
    if isinstance(value, str):
        return _CREDENTIALS_IN_URL.sub("***@", value)
    return value


def _allowed_licenses() -> str:
    return ", ".join(item.value for item in License)


def _check_license_value(location: str, value: Any) -> list[LicenseIssue]:
    if isinstance(value, License):
        return []
    if isinstance(value, str):
        text = value.strip()
        if text:
            try:
                License(text)
            except ValueError:
                shown = mask_secret_urls(value)
                return [
                    LicenseIssue(
                        location,
                        shown,
                        f"invalid license {shown!r}; expected one of: {_allowed_licenses()}",
                    )
                ]
            return []
    return [
        LicenseIssue(
            location,
            value if not isinstance(value, (dict, list)) else None,
            f"license must be one of: {_allowed_licenses()}",
        )
    ]


def _license_key(item: dict[str, Any]) -> str | None:
    if "license" in item:
        return "license"
    if "licenca" in item:
        return "licenca"
    return None


def _object_license_issues(location: str, item: dict[str, Any]) -> list[LicenseIssue]:
    key = _license_key(item)
    path = f"{location}.{key}" if key else f"{location}.license"
    if key is None:
        return [LicenseIssue(path, None, "missing license or licenca")]
    return _check_license_value(path, item[key])


def _validate_sequence(items: Any, prefix: str) -> list[LicenseIssue]:
    if not isinstance(items, list):
        return [
            LicenseIssue(
                prefix or "$",
                None,
                "section must be a list of entries",
            )
        ]
    issues: list[LicenseIssue] = []
    for index, item in enumerate(items):
        location = f"{prefix}[{index}]" if prefix else f"[{index}]"
        if isinstance(item, (str, License)):
            issues.extend(_check_license_value(f"{location}.license", item))
            continue
        if not isinstance(item, dict):
            issues.append(
                LicenseIssue(
                    f"{location}.license",
                    item if not isinstance(item, (dict, list)) else None,
                    "entry must be an object or a license string",
                )
            )
            continue
        issues.extend(_object_license_issues(location, item))
    return issues


def validate_licencas(data: Any) -> list[LicenseIssue]:
    """Report entries whose license is not a :class:`License` value."""
    if isinstance(data, list):
        return _validate_sequence(data, "")
    if isinstance(data, dict):
        issues: list[LicenseIssue] = []
        for key, value in data.items():
            if key in METADATA_KEYS:
                continue
            if isinstance(value, list):
                issues.extend(_validate_sequence(value, str(key)))
                continue
            if isinstance(value, dict):
                issues.extend(_object_license_issues(str(key), value))
                continue
            if isinstance(value, (str, License)):
                issues.extend(_check_license_value(str(key), value))
                continue
            issues.append(
                LicenseIssue(
                    str(key),
                    None,
                    "section must be a list of entries or an object with license",
                )
            )
        return issues
    return [
        LicenseIssue(
            "$",
            None,
            "licencas.json must be a list of entries or a section map",
        )
    ]


def validate_licencas_file(path: str | Path) -> list[LicenseIssue]:
    """Load ``path`` as JSON and validate licenses. Network-free."""
    payload = Path(path).read_text(encoding="utf-8")
    return validate_licencas(json.loads(payload))


def main(argv: list[str] | None = None) -> int:
    """CLI: ``python -m app.services.sources licencas.json``."""
    parser = argparse.ArgumentParser(
        prog="python -m app.services.sources",
        description="Validate licencas.json against the License enum.",
    )
    parser.add_argument("path", help="path to licencas.json")
    args = parser.parse_args(argv)
    try:
        issues = validate_licencas_file(args.path)
    except FileNotFoundError:
        print(f"file not found: {args.path}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(f"invalid JSON: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"cannot read {args.path}: {exc}", file=sys.stderr)
        return 2
    if not issues:
        print("OK")
        return 0
    for issue in issues:
        print(f"INVALID {issue}", file=sys.stderr)
    return 1
