# Export Spec v1: Permit Package + Client Package

## Purpose
Define dual downstream exports from one canonical floorplan model:
- **Permit Package** (authority-facing, strict)
- **Client Package** (homeowner-facing, presentation + quote context)

## Shared Source
- Input: `canonical_floorplan` JSON (v1 schema)
- Units: imperial only
- Revision source: `revisions[]` from canonical model

---

## A) Permit Package Spec (Strict)

### Output Formats (v1 priority)
1. DXF (primary technical drawing)
2. JSON manifest (machine-readable companion)
3. PDF (deferred; optional post-v1)

### Required Sheets / Views (v1 minimal)
- Cover / title sheet
- Dimensioned floor plan(s)
- Revision block summary
- General notes block

### Title Block Requirements
- Project ID
- Site/address label
- Floor label
- Date generated
- Scale statement (if applicable)
- Drawn by: `Makrly AI + Operator`
- Revision stamp: latest `rev_id`

### Dimensioning Conventions
- Feet-inches display (e.g., 12'-6")
- Exterior wall overall dimensions required
- Key interior dimensions for edited areas required
- Opening widths labeled for doors/windows in scope

### Line/Layer Conventions (DXF)
- `A-WALL-EXIST`
- `A-WALL-NEW`
- `A-OPEN-DOOR`
- `A-OPEN-WIND`
- `A-DIMS`
- `A-TEXT`
- `A-ANNO-REV`

### Revision Stamp Rules
Each exported package includes:
- Latest revision id
- Revision timestamp
- Revision message
- Actor/source (user/ai/system)

### Permit Validation Gate (hard-stop)
Export is blocked if any:
- `validation.status != valid`
- Any room has missing/blank room label
- Any wall has missing `height_in` (ceiling/wall height)
- Any window has missing `sill_in` (doors default to `sill_in=0`)
- Any edited room is missing required dimension annotations
- Geometry conflicts unresolved

Permit-ready condition (explicit):
- all rooms labeled
- all edited rooms dimensioned
- all walls have height_in
- all windows have sill_in

### Permit JSON Manifest (sidecar)
```json
{
  "package_type": "permit",
  "schema_version": "1.0.0",
  "project_id": "...",
  "generated_at": "...",
  "revision": {
    "rev_id": "...",
    "timestamp": "..."
  },
  "files": [
    {"kind": "dxf", "path": "..."}
  ],
  "checks": {
    "validation_status": "valid",
    "blocking_errors": 0
  }
}
```

---

## B) Client Package Spec (Presentation)

### Output Formats (v1)
1. JSON summary (for app consumption)
2. Styled PDF/HTML snapshot (deferred render path, but spec defined now)

### Required Sections
- Project summary
- Before/after revision highlights
- Room and opening summary
- Scope notes for quote context
- Optional disclaimers (not engineering stamp)

### Content Style Rules
- Plain language labels
- Reduced annotation density vs permit package
- Visual hierarchy optimized for mobile viewing
- Keep technical precision but improve readability

### Client Validation Gate
- Same geometry validity as permit package
- Additional check: summary fields populated

### Client JSON Summary Shape
```json
{
  "package_type": "client",
  "project_id": "...",
  "generated_at": "...",
  "revision": {"rev_id": "..."},
  "highlights": [
    "Moved kitchen wall 1'-0\" east",
    "Added 4'-0\" window on north wall"
  ],
  "rooms": [
    {"name": "Kitchen", "area_sqft": 180}
  ],
  "openings": {
    "doors": 4,
    "windows": 7
  },
  "notes": [
    "Preliminary plan for estimate and review"
  ]
}
```

---

## C) Export Service Contract

### Request
```json
{
  "project_id": "...",
  "target": "permit|client|both",
  "revision_ref": "latest|rev_id",
  "options": {
    "include_revision_history": true
  }
}
```

### Response
```json
{
  "status": "ok|rejected",
  "target": "permit|client|both",
  "artifacts": [
    {"kind": "dxf", "uri": "..."},
    {"kind": "json", "uri": "..."}
  ],
  "errors": []
}
```

## Deferred (post-v1)
- Jurisdiction-specific sheet templates
- Auto-generated permit notes library
- Branded client render themes
- Native PDF generation pipeline
