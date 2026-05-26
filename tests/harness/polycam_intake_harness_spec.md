# Polycam Intake Harness Spec (v1)

## Goal
Validate intake and normalization behavior against synthetic Polycam-like fixtures until real Allen samples are available.

## Inputs
- Fixtures under `tests/fixtures/polycam/`
- Contracts:
  - `POLYCAM_INTAKE_SPEC.md`
  - `floorplan.schema.json`
  - `EDIT_OPS_V1.md` (for downstream readiness checks)

## Harness Responsibilities
1. Metadata validation
2. File/format gate simulation
3. Canonical schema validation
4. Domain validation (`E-*` taxonomy)
5. Pass/fail result emission per case

## Expected Output Per Test
```json
{
  "case_id": "META_MISSING_UNITS",
  "status": "pass",
  "observed": {
    "blocking_errors": ["E-META-001"],
    "validation_status": "invalid"
  }
}
```

## Execution Contract
- Deterministic execution (no random behavior)
- Hard-stop semantics: any blocking error => case is invalid
- Cases can assert one or more expected error codes

## Suggested Runner Shape
- `tests/cases/polycam_intake_cases.json` as manifest
- Optional script: `scripts/run_polycam_harness.py`
- CI hook later: fail if expected/observed mismatch

## Minimal Pseudocode
```python
for case in cases:
    payload = load(case.fixture)
    observed = validate(payload)
    assert observed.codes == case.expected.codes
    assert observed.status == case.expected.status
```

## Pass Criteria for prep-6
- Fixture set covers at least:
  - valid baseline
  - missing metadata
  - invalid units
  - disconnected walls
  - unanchored opening
  - self-intersection
  - low-confidence parse
- Case manifest maps each fixture to expected E/W codes
- Harness spec is implementation-ready for immediate coding
