# Frontend UX Placeholders Spec (v1)

## Purpose
Define implementation-ready placeholder UX for Makrly’s mobile-first pipeline before final rendering/export stack is complete.

## Scope
- Status pipeline UI
- Version timeline UI
- Legibility-safe rendering rules
- Works regardless of final file format (image/PDF/JSON-derived)

## Target Platforms
- Phone-first (primary)
- iPad/tablet (secondary)
- Desktop only as fallback/admin

---

## 1) Status Pipeline Placeholder

### 1.1 Pipeline Stages
Use fixed stage IDs (ordered):
1. `upload_received`
2. `preprocess`
3. `parse_extract`
4. `normalize_validate`
5. `editable_ready`
6. `export_ready`

### 1.2 Stage States
Each stage can be:
- `pending`
- `active`
- `completed`
- `blocked`

### 1.3 UI Component Contract
`<PipelineStatusCard />`

**Props**
```ts
type StageState = 'pending' | 'active' | 'completed' | 'blocked'

interface PipelineStage {
  id: 'upload_received' | 'preprocess' | 'parse_extract' | 'normalize_validate' | 'editable_ready' | 'export_ready'
  label: string
  state: StageState
  message?: string
  updatedAt?: string // ISO
  errorCode?: string // E-*
}

interface PipelineStatusCardProps {
  stages: PipelineStage[]
  currentStageId: PipelineStage['id']
  blockingError?: {
    code: string
    message: string
    suggestedFix?: string
  }
}
```

### 1.4 Behavior Rules
- Exactly one stage is `active` at a time.
- If any stage is `blocked`, all subsequent stages remain `pending`.
- `editable_ready` unlocks edit toolbar.
- `export_ready` enables export CTA group.

### 1.5 Mobile Layout
- Vertical stepper on phone.
- Sticky header showing current stage + concise message.
- Tap stage to expand details (timestamp, last message, error if any).

---

## 2) Version Timeline Placeholder

### 2.1 Objective
Represent deterministic revision history and checkpoints for undo/redo trust.

### 2.2 UI Component Contract
`<VersionTimeline />`

**Props**
```ts
interface RevisionOpSummary {
  op: string // wall.move, opening.add, etc.
  targetId: string
  summary: string
}

interface RevisionItem {
  revId: string
  timestamp: string // ISO
  actor: string
  source: 'intake' | 'ai' | 'user' | 'system'
  message?: string
  ops: RevisionOpSummary[]
  checkpointType?: 'intake_clean' | 'layout_approved' | 'permit_ready'
  modelHash: string
}

interface VersionTimelineProps {
  revisions: RevisionItem[]
  activeRevId: string
  canUndo: boolean
  canRedo: boolean
}
```

### 2.3 Behavior Rules
- Timeline sorted newest-first on mobile list.
- Selecting a revision opens diff summary drawer (ops + affected entities).
- Undo = move active pointer to previous rev.
- Redo = move active pointer forward.
- Checkpoints rendered with badge + pin icon.

### 2.4 Minimal Actions (v1)
- `View Revision`
- `Restore This Revision` (creates new revision with source=`system` and message `restore:<rev_id>`)
- `Mark Checkpoint` (allowed for `layout_approved`, `permit_ready`)

---

## 3) Legibility-Safe Rendering Rules

### 3.1 Core Principle
Rendering should remain readable under uncertain geometry quality and partial metadata.

### 3.2 Layer Priority
Top to bottom:
1. Selected entity highlight
2. Blocking error overlays
3. Openings
4. Walls
5. Dimension labels
6. Room labels
7. Background scan/image

### 3.3 Stroke/Label Defaults (mobile)
- Wall stroke: 2.5px
- Opening stroke: 2px
- Selected entity halo: 3px outer
- Dimension text min: 12px
- Room label min: 11px
- Hit target min: 36x36 px

### 3.4 Density Guardrails
- Max visible labels per viewport: 25 (then collapse less-important labels)
- Hide secondary annotations below 75% zoom.
- At <= 50% zoom show only:
  - wall graph,
  - key dimensions,
  - selected/errored entities.

### 3.5 Contrast Rules
- Maintain >= 4.5:1 contrast for text vs background.
- If background scan is noisy, auto-apply translucent white underlay behind labels.
- Error overlays use high-contrast red with icon + code.

### 3.6 Overlap Avoidance
- Labels use simple collision pass:
  - preferred anchor,
  - alternate quadrants,
  - fallback truncate + tooltip.
- Dimension labels should not obscure opening symbols.

### 3.7 Error Visualization (Hard-stop UX)
When blocked:
- Highlight affected entities in red.
- Show top-level blocking banner with:
  - error code,
  - plain-language message,
  - suggested fix action.
- Disable commit/export controls until resolved.

---

## 4) Placeholder Data Adapters

### 4.1 Pipeline Adapter
Map backend processing events into `PipelineStage[]`.

### 4.2 Revision Adapter
Map canonical `revisions[]` into `RevisionItem[]` with compact op summaries.

### 4.3 Rendering Adapter
Map canonical entities into view primitives independent of export format:
- WallPrimitive
- OpeningPrimitive
- LabelPrimitive
- ErrorPrimitive

---

## 5) Empty/Loading/Error States

### Empty Project
- Message: "Upload a Polycam plan to begin."
- CTA: `Upload Plan`

### Loading Parse
- Skeleton canvas + active pipeline stage.
- Disable edit controls.

### Blocked Validation
- Show blocking banner + focused entity list.
- CTA: `Fix Issues` jumps to first errored entity.

### No Revisions Yet
- Timeline shows intake seed revision placeholder.

---

## 6) Telemetry Hooks (v1)
Track:
- stage transition durations
- % sessions hitting blocked state
- revision restores per session
- label density collapse count
- zoom-level readability toggles

---

## 7) Definition of Done for prep-5
- Placeholder component contracts finalized.
- Mobile state behavior documented.
- Legibility-safe defaults and guardrails documented.
- Hard-stop UX behavior explicitly mapped to blocking errors.
- Ready for implementation even before final parser/export engines stabilize.
