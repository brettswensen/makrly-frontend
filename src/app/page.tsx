"use client";

import { useMemo, useState } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import { applyPolycamEdit, normalizePolycamIntake, parseFloorPlan } from "@/lib/api";
import type { FloorPlan } from "@/types/floorplan";

type ValidationError = { code: string; message: string; severity: string; path: string };
type NormalizeResult = {
  status: "ok" | "rejected";
  canonical_floorplan: Record<string, unknown>;
  validation: { status: "valid" | "invalid"; errors: ValidationError[]; warnings: unknown[]; parser_confidence: number };
};

function asObj(v: unknown): Record<string, unknown> { return v && typeof v === "object" ? (v as Record<string, unknown>) : {}; }
function asArr(v: unknown): Record<string, unknown>[] { return Array.isArray(v) ? (v as Record<string, unknown>[]) : []; }

function toCanonicalFromFrontend(floorPlan: FloorPlan) {
  return {
    schema_version: "1.0.0",
    project: { project_id: floorPlan.id, capture_source: "polycam", units: "imperial" },
    entities: {
      walls: floorPlan.walls.map((w) => ({ wall_id: w.id, floor_id: "F1", start: w.start, end: w.end, thickness_in: Math.max(1, w.thickness * 12), height_in: 96 })),
      openings: [
        ...floorPlan.doors.map((d) => ({ opening_id: d.id, type: "door", floor_id: "F1", wall_id: d.wallId, width_in: Math.max(24, d.width * 12), position_ratio: d.position, sill_in: 0 })),
        ...floorPlan.windows.map((w) => ({ opening_id: w.id, type: "window", floor_id: "F1", wall_id: w.wallId, width_in: Math.max(24, w.width * 12), position_ratio: w.position, sill_in: 36 })),
      ],
      rooms: floorPlan.rooms.map((r) => ({ room_id: r.id, floor_id: "F1", name: r.name, polygon: r.points, area_sqft: r.areaSqft })),
    },
  };
}

function canonicalToViewer(canonical: Record<string, unknown>): FloorPlan {
  const c = asObj(canonical);
  const entities = asObj(c.entities);
  const walls = asArr(entities.walls).map((w, i) => ({ id: String(w.wall_id || `wall-${i + 1}`), start: { x: Number(asObj(w.start).x || 0), y: Number(asObj(w.start).y || 0) }, end: { x: Number(asObj(w.end).x || 0), y: Number(asObj(w.end).y || 0) }, thickness: Math.max(0.2, Number(w.thickness_in || 6) / 12) }));
  const rooms = asArr(entities.rooms).map((r, i) => ({ id: String(r.room_id || `room-${i + 1}`), name: String(r.name || `Room ${i + 1}`), points: asArr(r.polygon).map((p) => ({ x: Number(p.x || 0), y: Number(p.y || 0) })), areaSqft: Number(r.area_sqft || 0) }));
  const openings = asArr(entities.openings);
  return {
    id: String(asObj(c.project).project_id || `fp-${Date.now()}`),
    name: "Canonical Floor Plan",
    scale: 1,
    rooms,
    walls,
    doors: openings.filter((o) => o.type === "door").map((o, i) => ({ id: String(o.opening_id || `door-${i + 1}`), wallId: String(o.wall_id || ""), position: Number(o.position_ratio || 0.5), width: Number(o.width_in || 36) / 12 })),
    windows: openings.filter((o) => o.type === "window").map((o, i) => ({ id: String(o.opening_id || `window-${i + 1}`), wallId: String(o.wall_id || ""), position: Number(o.position_ratio || 0.5), width: Number(o.width_in || 36) / 12 })),
  };
}

function triggerJsonDownload(payload: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<NormalizeResult | null>(null);
  const [opJson, setOpJson] = useState('{"op":"SET_WALL_HEIGHT","wall_id":"wall-1","height_in":108}');
  const [editMessage, setEditMessage] = useState("");

  const validationErrors = useMemo(() => normalizeResult?.validation?.errors ?? [], [normalizeResult]);
  const warningCount = normalizeResult?.validation?.warnings?.length ?? 0;
  const permitReady = normalizeResult?.validation?.status === "valid" && validationErrors.length === 0;

  async function handleParse() {
    if (!selectedFile) return setError("Please choose a floor plan file first.");
    setIsLoading(true); setError(""); setMessage(""); setEditMessage(""); setNormalizeResult(null);
    try {
      const result = await parseFloorPlan(selectedFile);
      const meta = { project_id: result.floorPlan.id, source_filename: selectedFile.name, units: "imperial" };
      const normalized = await normalizePolycamIntake(meta, toCanonicalFromFrontend(result.floorPlan));
      setNormalizeResult(normalized as NormalizeResult);
      setFloorPlan(canonicalToViewer((normalized as NormalizeResult).canonical_floorplan));
      if (normalized.status === "rejected") return setError("Blocked by permit checks. Review E-* list.");
      setMessage("Parse + normalization complete. Ready for edit operations.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse");
      setFloorPlan(null); setNormalizeResult(null);
    } finally { setIsLoading(false); }
  }

  async function handleApplyEdit() {
    if (!normalizeResult?.canonical_floorplan) return;
    setError(""); setEditMessage("");
    try {
      const operation = JSON.parse(opJson) as Record<string, unknown>;
      const res = await applyPolycamEdit(normalizeResult.canonical_floorplan, operation);
      setNormalizeResult(res as NormalizeResult);
      setFloorPlan(canonicalToViewer(res.canonical_floorplan));
      setEditMessage(`${res.message}${res.rollback_applied ? " (rollback applied)" : ""}`);
      if (res.status === "rejected") setError("Edit rejected by hard-stop validation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply edit");
    }
  }

  const checklist = [
    { label: "Room labels present", ok: !validationErrors.some((e) => e.code === "E-META-003") },
    { label: "Wall heights present and > 0", ok: !validationErrors.some((e) => e.code === "E-GEO-006") },
    { label: "Window sill heights present", ok: !validationErrors.some((e) => e.code === "E-GEO-005") },
    { label: "No blocking validation errors", ok: validationErrors.length === 0 },
  ];

  const editPresets = [
    { label: "Raise wall-1 to 108in (valid)", json: '{"op":"SET_WALL_HEIGHT","wall_id":"wall-1","height_in":108}' },
    { label: "Move wall-1 +12,+0 (valid)", json: '{"op":"MOVE_WALL","wall_id":"wall-1","dx":12,"dy":0}' },
    { label: "Add door on wall-1 (valid)", json: '{"op":"ADD_OPENING","wall_id":"wall-1","opening_type":"door","width_in":36,"position_ratio":0.5}' },
    { label: "Add window missing sill (forces rollback)", json: '{"op":"ADD_OPENING","wall_id":"wall-1","opening_type":"window","width_in":36,"position_ratio":0.5}' },
    { label: "Set wall-1 height 0 (forces rollback)", json: '{"op":"SET_WALL_HEIGHT","wall_id":"wall-1","height_in":0}' },
  ];

  return (
    <div className="min-h-screen bg-gray-50"><main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Floor Plan Parser + Edit Engine</h1>
        <p className="mt-1 text-sm text-gray-600">Upload, validate for permit-readiness, then run deterministic edit operations.</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input type="file" accept="image/*,.pdf" onChange={(e)=>{setSelectedFile(e.target.files?.[0]||null); setError("");}} className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black md:w-auto" />
          <button onClick={handleParse} disabled={isLoading||!selectedFile} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300">{isLoading?"Parsing + validating...":"Parse + Validate"}</button>
          {normalizeResult?.canonical_floorplan && <button onClick={()=>triggerJsonDownload(normalizeResult.canonical_floorplan,"canonical-floorplan.json")} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">Download Canonical JSON</button>}
        </div>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {editMessage && <p className="mt-2 text-sm text-blue-700">{editMessage}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {normalizeResult && <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Permit Readiness Summary</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Status</p><p className={`font-semibold ${permitReady?"text-green-700":"text-red-700"}`}>{permitReady?"Permit-ready":"Blocked"}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Confidence</p><p className="font-semibold text-gray-900">{Math.round((normalizeResult.validation.parser_confidence||0)*100)}%</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Blocking errors</p><p className="font-semibold text-red-700">{validationErrors.length}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Warnings</p><p className="font-semibold text-amber-700">{warningCount}</p></div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">{checklist.map((item)=><li key={item.label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"><span>{item.label}</span><span className={item.ok?"text-green-700 font-semibold":"text-red-700 font-semibold"}>{item.ok?"PASS":"FAIL"}</span></li>)}</ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Edit Engine (Step 3)</h2>
          <p className="mt-1 text-xs text-gray-600">Paste deterministic operation JSON and apply. Invalid edits are hard-stopped and rolled back.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {editPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setOpJson(preset.json)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea value={opJson} onChange={(e)=>setOpJson(e.target.value)} className="mt-3 h-36 w-full rounded-lg border border-gray-300 p-2 font-mono text-xs" />
          <button onClick={handleApplyEdit} className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">Apply Edit Operation</button>
          <p className="mt-2 text-xs text-gray-500">Examples: MOVE_WALL, SET_WALL_HEIGHT, ADD_OPENING, DELETE_OPENING</p>
        </section>
      </div>}

      {validationErrors.length>0 && <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"><h2 className="text-base font-semibold text-red-900">Validation Errors (E-*)</h2><ul className="mt-2 space-y-1 text-sm text-red-900">{validationErrors.map((ve,idx)=><li key={`${ve.code}-${idx}`}><span className="font-mono">{ve.code}</span>: {ve.message} <span className="text-red-700">({ve.path})</span></li>)}</ul></section>}

      <FloorPlanViewer floorPlan={floorPlan} />
    </main></div>
  );
}
