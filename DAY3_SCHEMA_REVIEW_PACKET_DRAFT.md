# Day-3 Schema Review Packet (Draft for Billy)

## Objective
Review and approve foundational v1 contracts before implementation expansion.

## Included Artifacts
1. `POLYCAM_INTAKE_SPEC.md`
2. `floorplan.schema.json`
3. `EDIT_OPS_V1.md`
4. `EXPORT_SPEC_V1.md`

## Decisions Requested
- Confirm canonical entity model completeness for v1 (walls/openings/rooms)
- Confirm revision log shape and operation enum coverage
- Confirm hard-stop validation boundaries
- Confirm dual-output export split and required fields

## Review Checklist
- [ ] Imperial-only assumptions consistent everywhere
- [ ] Intake required metadata sufficient for downstream exports
- [ ] Operation grammar is deterministic and replayable
- [ ] Error taxonomy supports actionable UX
- [ ] Permit output gate is strict enough
- [ ] Client output remains readable/mobile-first

## Open Questions for Billy
1. Should room labels be required for permit track in v1 or optional?
2. Minimum interior-dimension coverage requirement: all edited rooms vs all rooms?
3. Opening default clearance rules: global constants vs jurisdiction profile?
4. Should fixtures remain optional in schema v1 or be omitted until v1.1?

## Proposed Acceptance Criteria (Day-3)
- Approved with no blocking schema ambiguity
- Any required enum/field additions identified
- Any validation rule adjustments documented
- Greenlight to start prep-5 UI placeholder integration and prep-6 fixture harness

## Suggested Message to Send Billy
"I drafted the v1 foundation docs for Makrly’s Polycam-first workflow:
- intake contract,
- canonical floorplan schema,
- deterministic AI edit ops,
- permit/client export specs.
Can you do a Day-3 pass focused on blocking issues only (field omissions, invalid assumptions, hard-stop boundaries)? Once approved, I’ll lock these as implementation contracts for UI + test harness work."
