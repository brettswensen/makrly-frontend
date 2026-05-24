#!/usr/bin/env python3
"""
Minimal synthetic harness runner for Polycam intake fixtures.

Usage:
  python3 scripts/run_polycam_harness.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CASES_PATH = ROOT / "tests/cases/polycam_intake_cases.json"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def derive_observed(payload: dict):
    """
    For synthetic fixtures, observed status/codes are read from payload.validation when present.
    For metadata-only fixtures, infer expected metadata errors.
    """
    if "validation" in payload:
        v = payload["validation"]
        errors = [e.get("code") for e in v.get("errors", []) if e.get("code")]
        warnings = [w.get("code") for w in v.get("warnings", []) if w.get("code")]
        return {
            "status": v.get("status", "invalid"),
            "blocking_errors": sorted(errors),
            "warnings": sorted(warnings),
        }

    # metadata fixture path
    blocking = []
    if "declared_units" not in payload:
        blocking.append("E-META-001")
    elif payload.get("declared_units") != "imperial":
        blocking.append("E-META-002")

    required = ["project_id", "capture_source", "address_or_site_label", "declared_units", "floor_label"]
    if any(k not in payload for k in required):
        if "E-META-001" not in blocking:
            blocking.append("E-META-001")

    return {
        "status": "invalid" if blocking else "valid",
        "blocking_errors": sorted(blocking),
        "warnings": [],
    }


def main():
    cases = load_json(CASES_PATH)
    results = []
    failures = 0

    for case in cases:
        fixture_path = ROOT / case["fixture"]
        payload = load_json(fixture_path)
        observed = derive_observed(payload)

        exp = case["expected"]
        pass_status = (
            observed["status"] == exp["status"]
            and observed["blocking_errors"] == sorted(exp["blocking_errors"])
            and observed["warnings"] == sorted(exp["warnings"])
        )

        if not pass_status:
            failures += 1

        results.append(
            {
                "case_id": case["case_id"],
                "status": "pass" if pass_status else "fail",
                "observed": observed,
                "expected": {
                    "status": exp["status"],
                    "blocking_errors": sorted(exp["blocking_errors"]),
                    "warnings": sorted(exp["warnings"]),
                },
            }
        )

    summary = {
        "total": len(results),
        "passed": len(results) - failures,
        "failed": failures,
    }

    print(json.dumps({"summary": summary, "results": results}, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
