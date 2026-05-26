from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

DEFAULT_WALL_HEIGHT_IN = 96


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _blocking(code: str, message: str, path: str) -> dict[str, Any]:
    return {"code": code, "message": message, "severity": "blocking", "path": path}


def normalize_polycam_to_canonical(meta: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    model = deepcopy(plan)

    project = model.setdefault("project", {})
    project["project_id"] = project.get("project_id") or meta.get("project_id", "proj_unknown")
    project["capture_source"] = "polycam"
    project["units"] = "imperial"

    errors: list[dict[str, Any]] = []

    entities = model.setdefault("entities", {})
    walls = entities.setdefault("walls", [])
    openings = entities.setdefault("openings", [])
    rooms = entities.setdefault("rooms", [])

    for i, wall in enumerate(walls):
        if wall.get("height_in") in (None, ""):
            wall["height_in"] = DEFAULT_WALL_HEIGHT_IN
        if wall.get("height_in", 0) <= 0:
            errors.append(_blocking("E-GEO-006", "Wall height must be > 0", f"/entities/walls/{i}/height_in"))

    for i, opening in enumerate(openings):
        kind = opening.get("type")
        if kind == "door":
            opening["sill_in"] = opening.get("sill_in", 0)
        elif kind == "window":
            if opening.get("sill_in") is None:
                errors.append(
                    _blocking(
                        "E-GEO-005",
                        "Window opening requires sill_in for permit track",
                        f"/entities/openings/{i}/sill_in",
                    )
                )

    for i, room in enumerate(rooms):
        if not str(room.get("name", "")).strip():
            errors.append(_blocking("E-META-003", "Room name is required for permit", f"/entities/rooms/{i}/name"))

    model.setdefault("schema_version", "1.0.0")
    model.setdefault("revisions", [])
    if not model["revisions"]:
        model["revisions"].append(
            {
                "rev_id": "rev_normalized",
                "timestamp": _now_iso(),
                "actor": "system",
                "source": "intake",
                "operations": [],
                "model_hash": "normalized_seed",
            }
        )

    model["validation"] = {
        "status": "invalid" if errors else "valid",
        "errors": errors,
        "warnings": model.get("validation", {}).get("warnings", []),
        "parser_confidence": model.get("validation", {}).get("parser_confidence", 0.9),
    }

    return model
