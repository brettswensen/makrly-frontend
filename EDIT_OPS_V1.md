# AI Edit Command Grammar + Deterministic Transform Spec (v1)

## Purpose
Constrain AI edits into explicit operations that are replayable, validated, and reversible.

## v1 Edit Scope (Locked)
- Walls
- Openings (doors/windows)

No freeform geometry mutation outside approved op set.

## Execution Model
1. User utterance
2. AI parses to structured intent
3. Intent compiled to one or more deterministic ops
4. Preflight validation (hard-stop)
5. Apply ops transactionally
6. Post-apply validation (hard-stop)
7. Commit revision checkpoint if valid

If any validation fails: rollback entire transaction.

## DSL (Canonical Operation Envelope)
```json
{
  "transaction_id": "txn_...",
  "ops": [
    {
      "op": "wall.move",
      "target_id": "wal_123",
      "params": { "dx_in": 12, "dy_in": 0 }
    }
  ],
  "source": "ai",
  "user_prompt": "move the left kitchen wall 1 foot right"
}
```

## Allowed Operations (v1)

### Wall Ops
- `wall.add`
  - params: `floor_id`, `start{x_in,y_in}`, `end{x_in,y_in}`, `thickness_in`, `kind`
- `wall.move`
  - params: `dx_in`, `dy_in`
- `wall.resize`
  - params: `anchor` (`start|end`), `new_point{x_in,y_in}`
- `wall.delete`
  - params: none

### Opening Ops
- `opening.add`
  - params: `type` (`door|window`), `floor_id`, `wall_id`, `offset_in`, `width_in`, optional `swing`
- `opening.move`
  - params: `new_wall_id` (optional), `new_offset_in`
- `opening.resize`
  - params: `width_in`
- `opening.delete`
  - params: none

## NL Parsing Rules
AI parser should produce:
- operation verb
- target entity reference
- dimensional value(s)
- direction/context anchor

Example mappings:
- “move wall W3 left 6 inches” -> `wall.move{dx_in:-6,dy_in:0}`
- “make this door 36 inches” -> `opening.resize{width_in:36}`
- “add a 4-foot window on north wall” -> `opening.add{type:window,width_in:48,...}`

If target resolution is ambiguous (>1 candidate), parser must return `needs_disambiguation` and no ops.

## Deterministic Target Resolution
Priority order:
1. Explicit IDs in prompt (`W3`, `Door 2`) via alias map
2. Selected entity in UI context
3. Unique semantic match (e.g., “kitchen door” exactly one)
4. Otherwise fail with disambiguation

## Hard-stop Validation Checks

### Preflight
- Target exists
- Target type matches op
- Required params present and in imperial units
- Numeric bounds valid (`width_in > 0`, etc.)

### Geometry/Topology (blocking)
- No wall self-intersection
- No disconnected wall graph for affected region
- Openings remain anchored to parent wall
- Opening width <= wall length - minimum clearances
- Room areas stay positive where enclosed regions are recomputed

### Post-apply
- Schema validation passes
- Domain validation passes (`E-*` taxonomy)

## Error Handling Contract
On failure:
```json
{
  "status": "rejected",
  "error": {
    "code": "E-GEO-004",
    "message": "Opening not anchored to wall after move",
    "blocking": true,
    "suggested_fix": "Move opening to a valid offset on wal_123"
  }
}
```

## Revision + Checkpoint Policy
- Every successful transaction creates a revision entry:
  - `rev_id`, `timestamp`, `actor`, `source=ai|user`, `operations[]`, `message`, `model_hash`
- Milestone checkpoints (manual or automatic):
  - `checkpoint_type`: `intake_clean`, `layout_approved`, `permit_ready`
- Undo/redo uses revision stack replay.

## Determinism Rules
- Same input model hash + same op payload => same output model hash
- No randomness in geometry operations
- Floating-point rounding policy: round to nearest 1/16 inch at persistence boundaries

## Safety Rails
- Max ops per transaction: 25
- Reject cross-floor edits in one op unless explicitly supported later
- Reject edits that alter locked entities (future support)

## Telemetry (for quality tuning)
Log per command:
- parse_success boolean
- disambiguation_required boolean
- preflight_fail code
- apply_fail code
- latency_ms
- entities_touched count

## Deferred (post-v1)
- Outlet/electrical ops
- Batch semantic refactors (e.g., “widen all bedroom doors to 32in”)
- Natural-language constraints optimization (“maximize island clearance”)
