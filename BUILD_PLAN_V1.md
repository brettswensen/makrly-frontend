# BUILD_PLAN_V1

## Goal
Build Makrly v1 as a mobile-first, Polycam-to-edit workflow for contractors that enables fast conversational plan revisions and produces practical downstream outputs for:
- City permit submission
- Homeowner-facing plan/quote deliverables

## Authority + Context
- Allen intent is interpreted by Brett + Billy; their clarified requirements are source of truth.
- Input source: Polycam LiDAR 2D exports.
- User behavior: conversational edits like "move this wall 2 feet" and "add a window here."
- Precision target: permit-practical, not CAD-grade.
- Jurisdiction baseline: South Jordan accepts primitive plans if layout, wall locations, dimensions, and notes are clear.
- Device constraint: phone/iPad only, field-first.

## Locked Decisions (Billy)
- Units: Imperial-only
- Edit scope v1: Walls/openings first
- Validation: Hard-stop invalid edits
- Versioning: Milestone checkpoints
- Export priority: DXF + JSON first, PDF later
- Timeline: +2 day buffer; schema review on Day 3

## Definition of Done (v1)
- Reliable Polycam-style import into canonical model
- Stable conversational edits for walls/openings with hard-stop validation
- Milestone checkpoint versioning visible in UI
- Working DXF + JSON export
- Mobile field usability acceptable
- Clear pathway to dual outputs:
  - Permit track (city submission package)
  - Homeowner track (plan + quote presentation)

## Execution Order
1. Polycam intake contract + validation/error taxonomy
2. Canonical floorplan schema (imperial-first, revision-aware)
3. Deterministic edit engine for walls/openings with hard-stop rules + rollback
4. NL-to-operations translation layer (no direct freeform geometry mutation)
5. Mobile-first workflow UI shell (Import → Parse → Edit → Review → Export) with milestone checkpoints
6. Synthetic Polycam-like fixture harness + regression checks

## Milestones
### Day 1
- Draft `POLYCAM_INTAKE_SPEC.md`
- Start `floorplan.schema.json`

### Day 2
- Complete schema v1 + examples
- Start validation taxonomy + parser normalization skeleton

### Day 3 (Review Gate)
- Freeze schema draft for Billy review
- Resolve review comments before downstream implementation

### Day 4
- Implement edit-op types and constraints (walls/openings)
- Implement hard-stop validation behavior

### Day 5
- Add rollback and milestone checkpointing
- Add NL-to-ops translation contract

### Day 6
- Mobile workflow shell + timeline UI scaffolding
- Integrate parser/edit state flow

### Day 7
- DXF + JSON export wiring
- Synthetic fixtures + regression harness

### Day 8-9 (Buffer)
- Bugfixes, stabilization, Allen-file readiness hardening

## Scope Guardrails (Non-Goals for v1)
- No CAD-grade precision workflows
- No desktop-first UX assumptions
- No broad fixture library/editing beyond locked v1 scope
- No PDF-first export work until DXF/JSON path is stable

## Acceptance Criteria
- A Polycam-like input can be normalized into canonical schema without manual intervention for common cases.
- Supported conversational commands deterministically map to validated edit operations.
- Invalid geometry edits are blocked with explicit, user-readable reasons.
- Users can create and restore milestone checkpoints in mobile UI.
- Exports produce valid JSON and usable DXF for downstream permit/client packaging workflows.

## Files to Produce
- `BUILD_PLAN_V1.md` (this file; update continuously)
- `POLYCAM_INTAKE_SPEC.md`
- `floorplan.schema.json`
- `docs/edit-ops-v1.md`
- `docs/nl-to-ops-contract.md`
- `docs/export-dxf-json-v1.md`
- `tests/fixtures/polycam-like/*`
- `tests/regression/floorplan-v1/*`
