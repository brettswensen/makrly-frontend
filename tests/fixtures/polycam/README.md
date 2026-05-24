# Synthetic Polycam-like Fixtures (v1)

These fixtures emulate expected Polycam-to-Makrly intake artifacts until real Allen samples arrive.

## Files
- `polycam_meta_valid.json` — valid metadata envelope
- `polycam_meta_missing_units.json` — missing required metadata
- `polycam_meta_invalid_units.json` — invalid units (`metric`) for v1
- `polycam_plan_mock_valid.json` — canonical-like parsed structure (valid)
- `polycam_plan_mock_disconnected_wall.json` — disconnected wall graph
- `polycam_plan_mock_opening_unanchored.json` — opening not anchored to wall
- `polycam_plan_mock_self_intersection.json` — wall self-intersection scenario
- `polycam_plan_mock_low_confidence.json` — low parser confidence scenario

## Usage
Use these with `tests/harness/polycam_intake_harness_spec.md` and `tests/cases/polycam_intake_cases.json`.
