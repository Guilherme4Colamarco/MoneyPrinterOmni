"""Validate a ``licencas.json`` file against :class:`License`.

The helper is network-free and does not change project data files. It
accepts a list of objects with ``license`` / ``licenca``, a
``{id: license}`` mapping, or an object with an ``items`` / ``licencas``
/ ``licenses`` list. Invalid entries are reported with a location path.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.sources.base import License


@dataclass(frozen=True, slots=True)
class LicenseIssue:
    """One invalid license entry."""

    location: str
    value: Any
    message: str

    def __str__(self) -> str:
        return f"{self.location}: {self.message}"


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
                return [
                    LicenseIssue(
                        location,
                        value,
                        f"invalid license {value!r}; expected one of: {_allowed_licenses()}",
                    )
                ]
            return []
    return [
        LicenseIssue(
            location,
            value,
            f"license must be one of: {_allowed_licenses()}",
        )
    ]


def _license_key(item: dict[str, Any]) -> str | None:
    if "license" in item:
        return "license"
    if "licenca" in item:
        return "licenca"
    return None


def _validate_sequence(items: Any, prefix: str) -> list[LicenseIssue]:
    if not isinstance(items, list):
        return [
            LicenseIssue(
                prefix or "$",
                items,
                "licencas.json must be a list of entries or an id-to-license map",
            )
        ]
    issues: list[LicenseIssue] = []
    for index, item in enumerate(items):
        location = f"{prefix}[{index}]" if prefix else f"[{index}]"
        if isinstance(item, (str, License)):
            issues.extend(_check_license_value(location, item))
            continue
        if not isinstance(item, dict):
            issues.append(
                LicenseIssue(location, item, "entry must be an object or a license string")
            )
            continue
        key = _license_key(item)
        if key is None:
            issues.append(
                LicenseIssue(location, item, "missing license or licenca")
            )
            continue
        issues.extend(_check_license_value(f"{location}.{key}", item[key]))
    return issues


def validate_licencas(data: Any) -> list[LicenseIssue]:
    """Report entries whose license is not a :class:`License` value."""
    if isinstance(data, list):
        return _validate_sequence(data, "")
    if isinstance(data, dict):
        for key in ("items", "licencas", "licenses"):
            if key in data:
                return _validate_sequence(data[key], f"{key}")
        issues: list[LicenseIssue] = []
        for key, value in data.items():
            location = str(key)
            if isinstance(value, dict):
                nested = _license_key(value)
                if nested is None:
                    issues.append(
                        LicenseIssue(location, value, "missing license or licenca")
                    )
                else:
                    issues.extend(
                        _check_license_value(f"{location}.{nested}", value[nested])
                    )
                continue
            issues.extend(_check_license_value(location, value))
        return issues
    return [
        LicenseIssue(
            "$",
            data,
            "licencas.json must be a list of entries or an id-to-license map",
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
