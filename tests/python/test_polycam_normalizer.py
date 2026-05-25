import json
from pathlib import Path

from scripts.polycam_normalizer import normalize_polycam_to_canonical


FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "polycam"


def _load(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_normalizer_adds_required_wall_height_and_door_sill_defaults():
    meta = _load("polycam_meta_valid.json")
    plan = _load("polycam_plan_mock_valid.json")

    result = normalize_polycam_to_canonical(meta, plan)

    assert result["validation"]["status"] == "valid"
    assert all("height_in" in w and w["height_in"] > 0 for w in result["entities"]["walls"])

    doors = [o for o in result["entities"]["openings"] if o["type"] == "door"]
    assert doors
    assert all(o.get("sill_in") == 0 for o in doors)


def test_normalizer_rejects_window_without_sill():
    meta = _load("polycam_meta_valid.json")
    plan = _load("polycam_plan_mock_valid.json")
    plan["entities"]["openings"] = [
        {
            "opening_id": "opn_win_1",
            "type": "window",
            "floor_id": "flr_main",
            "wall_id": "wal_1",
            "offset_in": 12,
            "width_in": 48,
        }
    ]

    result = normalize_polycam_to_canonical(meta, plan)

    assert result["validation"]["status"] == "invalid"
    assert any(e["code"] == "E-GEO-005" for e in result["validation"]["errors"])


def test_normalizer_rejects_blank_room_labels():
    meta = _load("polycam_meta_valid.json")
    plan = _load("polycam_plan_mock_valid.json")
    plan["entities"]["rooms"][0]["name"] = ""

    result = normalize_polycam_to_canonical(meta, plan)

    assert result["validation"]["status"] == "invalid"
    assert any(e["code"] == "E-META-003" for e in result["validation"]["errors"])
