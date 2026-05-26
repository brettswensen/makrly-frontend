# Makrly v1 Progress Update (for Billy)

## Purpose
This document is a single source-of-truth snapshot of what has been completed so far, what is validated, and what comes next for Makrly v1.

---

## Project Goal (v1)
Build a **mobile-first**, **Polycam-to-edit** contractor workflow that supports conversational revisions and produces practical downstream outputs for:
- City permit submission
- Homeowner-facing plan/quote delivery

---

## Locked Decisions (Confirmed)
- Units: **Imperial-only**
- Edit scope v1: **Walls + openings first**
- Validation behavior: **Hard-stop invalid edits**
- Versioning: **Milestone checkpoints**
- Export priority: **DXF + JSON first**, PDF later
- Timeline: **+2 day buffer**, schema review on Day 3

---

## Completed Work

### 1) Planning + Spec Artifacts
Created and populated:
- `BUILD_PLAN_V1.md`
- `POLYCAM_INTAKE_SPEC.md`
- `floorplan.schema.json`
- `EDIT_OPS_V1.md`
- `EXPORT_SPEC_V1.md`
- `DAY3_SCHEMA_REVIEW_PACKET_DRAFT.md`
- `UX_PLACEHOLDERS_V1_SPEC.md`

### 2) Synthetic Intake Harness + Fixtures
Created:
- `scripts/run_polycam_harness.py`
- `tests/fixtures/polycam/README.md`
- `tests/fixtures/polycam/polycam_meta_valid.json`
- `tests/fixtures/polycam/polycam_meta_missing_units.json`
- `tests/fixtures/polycam/polycam_meta_invalid_units.json`
- `tests/fixtures/polycam/polycam_plan_mock_valid.json`
- `tests/fixtures/polycam/polycam_plan_mock_disconnected_wall.json`
- `tests/fixtures/polycam/polycam_plan_mock_opening_unanchored.json`
- `tests/fixtures/polycam/polycam_plan_mock_self_intersection.json`
- `tests/fixtures/polycam/polycam_plan_mock_low_confidence.json`
- `tests/cases/polycam_intake_cases.json`
- `tests/harness/polycam_intake_harness_spec.md`
- `tests/python/test_polycam_harness.py`
- `pytest.ini`

### 3) CI Quality Gates (GitHub Actions)
Created workflow:
- `.github/workflows/polycam-harness.yml`

Jobs included:
- `polycam-harness`
  - Runs pytest regression for intake harness
- `frontend-checks`
  - `npm ci`
  - `npm run lint`
  - `npm run build`

---

## Validation Evidence

### Local validation
- `python3 -m pytest -q tests/python/test_polycam_harness.py` ✅ pass
- `npm run lint` ✅ pass
- `npm run build` ✅ pass

### Harness result details
- Total cases: **8**
- Passed: **8**
- Failed: **0**
- Includes expected blocking/error taxonomy checks:
  - `E-META-001` (missing units)
  - `E-META-002` (invalid units)
  - `E-GEO-001` (disconnected wall)
  - `E-GEO-002` (self-intersection)
  - `E-GEO-004` (opening unanchored)
  - `E-PARSE-002` + `W-PARSE-001` (low confidence)

### PR + CI status
- PR: https://github.com/brettswensen/makrly-frontend/pull/1
- Branch: `feat/floorplan-svg-visualization`
- CI checks observed passing:
  - `polycam-harness` ✅
  - `frontend-checks` ✅

---

## Current State Summary
- Spec-and-contract foundation is complete for the v1 shape.
- Regression harness exists and is wired into pytest + CI.
- Frontend lint/build gates are active in CI.
- Repo now has a clear baseline for implementation against canonical contracts.

---

## What This Does *Not* Yet Mean
The following are **not** fully implemented yet (this phase focused on spec + harness + gates):
- Full production parser/normalizer execution path for real Allen Polycam files
- Full deterministic runtime edit engine wired into app state
- NL-to-ops runtime translation connected to production UX
- Final DXF/JSON exporter implementation against real-world sample variance

---

## Recommended Next Execution Sequence
1. Implement parser/normalizer runtime from intake contract.
2. Implement deterministic wall/opening edit operations with hard-stop validation and rollback.
3. Implement NL-to-ops translation layer (strict op mapping; no freeform geometry mutation).
4. Wire milestone checkpoint timeline in mobile UX flow.
5. Complete DXF + JSON export runtime and test against expanded fixture matrix.
6. Run hardening pass using real Allen samples once available.

---

## Risks / Notes
- Previous push issue with workflow scope via HTTPS OAuth was resolved by switching git remote to SSH.
- Memory capacity in Hermes profile is near limit, so long historical notes are better persisted in repo markdown (like this file) and PR context.

---

## Quick Links
- Plan anchor: `BUILD_PLAN_V1.md`
- Progress snapshot (this doc): `BILLY_PROGRESS_UPDATE.md`
- PR thread: https://github.com/brettswensen/makrly-frontend/pull/1

---

## Suggested Message to Billy
"I put together a complete progress snapshot in `BILLY_PROGRESS_UPDATE.md` (repo root). It covers what’s done, validation evidence, CI status, and exact next steps. Please review that file plus PR #1 for the implementation handoff."
