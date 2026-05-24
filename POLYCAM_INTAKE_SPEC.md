# POLYCAM Intake Spec (v1)

## Purpose
Define a strict, mobile-first intake contract for Polycam-originated 2D floor plan data so Makrly can normalize inputs into the canonical floorplan schema reliably.

## v1 Scope
- Source: Polycam LiDAR workflow outputs
- Units: Imperial only
- Target workflow: field capture -> upload -> conversational edits (walls/openings) -> DXF/JSON export

## Accepted Input Types (v1)
1. **Image floor plans**: `.jpg`, `.jpeg`, `.png`, `.webp`
2. **PDF floor plans**: `.pdf` (single or multi-page; first plan page selected)
3. **Structured JSON** (if available from upstream tooling): `.json`

## Max Constraints (v1 defaults)
- File size: <= 30 MB
- Image max dimension: 8192 px (long edge)
- PDF max pages: 25
- Upload timeout: 60s

## Required Metadata
- `project_id` (string)
- `capture_source` = `polycam`
- `address_or_site_label` (string)
- `declared_units` = `imperial`
- `floor_label` (e.g., `main`, `basement`, `level_2`)

## Optional Metadata
- `captured_at` (ISO timestamp)
- `operator_name`
- `notes`
- `jurisdiction` (default: `South Jordan` if omitted in this project context)

## Intake Pipeline
1. File upload + basic validation
2. Media preprocessing
   - auto-rotate by EXIF when present
   - denoise/contrast normalize for image inputs
   - PDF page extraction and ranking for plan-likeness
3. Parsing stage
   - vision/rules extraction of walls/openings/room regions
4. Normalization stage
   - coordinate normalization
   - imperial unit resolution
   - topology checks
5. Canonical schema emission
6. Validation report returned to client

## Validation Taxonomy (Hard-stop model)

### A. Upload/Format Errors (E-UPL-*)
- `E-UPL-001`: Unsupported file type
- `E-UPL-002`: File too large
- `E-UPL-003`: Corrupt/unreadable file
- `E-UPL-004`: Upload timeout

### B. Metadata Errors (E-META-*)
- `E-META-001`: Missing required metadata field
- `E-META-002`: Invalid units (must be imperial)
- `E-META-003`: Invalid floor label

### C. Parse Errors (E-PARSE-*)
- `E-PARSE-001`: No wall network detected
- `E-PARSE-002`: Low confidence extraction
- `E-PARSE-003`: Multiple overlapping plan regions unresolved
- `E-PARSE-004`: Unable to infer openings

### D. Geometry/Topology Errors (E-GEO-*)
- `E-GEO-001`: Disconnected wall graph
- `E-GEO-002`: Self-intersecting wall segment
- `E-GEO-003`: Zero/negative room area
- `E-GEO-004`: Opening not anchored to wall
- `E-GEO-005`: Invalid wall thickness resolution

### E. Export-Readiness Errors (E-READY-*)
- `E-READY-001`: Missing required dimensions for output profile
- `E-READY-002`: Non-resolved geometry conflicts

## Hard-stop Policy
Any `E-*` error prevents progression to edit/export stages until resolved.
UI must show:
- clear human-readable reason
- blocking severity
- recommended next action

## Normalization Rules (v1)
- Coordinate system: Cartesian, origin top-left at ingest; converted to canonical project frame
- Unit storage: inches internally
- Display units: feet + inches in UI
- Wall representation: centerline + thickness
- Opening attachment: each door/window must reference a parent wall id and offset

## Output of Intake Stage
- `canonical_floorplan` JSON (schema-compliant)
- `validation_report` JSON:
  - errors[]
  - warnings[]
  - parser_confidence
  - source_metadata_echo

## Deferred (Post-v1)
- Metric unit support
- Multi-floor linked topology
- Automatic electrical fixture extraction
- Permit template auto-notes by jurisdiction
