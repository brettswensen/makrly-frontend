"use client";

import { useMemo, useState } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import { normalizePolycamIntake, parseFloorPlan } from "@/lib/api";
import type { FloorPlan } from "@/types/floorplan";

type ValidationError = {
  code: string;
  message: string;
  severity: string;
  path: string;
};

type NormalizeResult = {
  status: "ok" | "rejected";
  canonical_floorplan: Record<string, unknown>;
  validation: {
    status: "valid" | "invalid";
    errors: ValidationError[];
    warnings: unknown[];
    parser_confidence: number;
  };
};

function toCanonicalFromFrontend(floorPlan: FloorPlan) {
  return {
    schema_version: "1.0.0",
    project: {
      project_id: floorPlan.id,
      capture_source: "polycam",
      units: "imperial",
    },
    entities: {
      walls: floorPlan.walls.map((w) => ({
        wall_id: w.id,
        floor_id: "F1",
        start: { x: w.start.x, y: w.start.y },
        end: { x: w.end.x, y: w.end.y },
        thickness_in: Math.max(1, w.thickness * 12),
      })),
      openings: [
        ...floorPlan.doors.map((d) => ({
          opening_id: d.id,
          type: "door",
          floor_id: "F1",
          wall_id: d.wallId,
          width_in: Math.max(24, d.width * 12),
          position_ratio: d.position,
        })),
        ...floorPlan.windows.map((w) => ({
          opening_id: w.id,
          type: "window",
          floor_id: "F1",
          wall_id: w.wallId,
          width_in: Math.max(24, w.width * 12),
          position_ratio: w.position,
        })),
      ],
      rooms: floorPlan.rooms.map((r) => ({
        room_id: r.id,
        floor_id: "F1",
        name: r.name,
        polygon: r.points,
        area_sqft: r.areaSqft,
      })),
    },
  };
}

function triggerJsonDownload(payload: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<NormalizeResult | null>(null);

  const validationErrors = useMemo(
    () => normalizeResult?.validation?.errors ?? [],
    [normalizeResult]
  );
  const warningCount = normalizeResult?.validation?.warnings?.length ?? 0;
  const permitReady = normalizeResult?.validation?.status === "valid" && validationErrors.length === 0;

  const checklist = useMemo(() => {
    const hasCode = (code: string) => validationErrors.some((e) => e.code === code);
    return [
      { label: "Room labels present", ok: !hasCode("E-META-003") },
      { label: "Wall heights present and > 0", ok: !hasCode("E-GEO-006") },
      { label: "Window sill heights present", ok: !hasCode("E-GEO-005") },
      { label: "No blocking validation errors", ok: validationErrors.length === 0 },
    ];
  }, [validationErrors]);

  async function handleParse() {
    if (!selectedFile) {
      setError("Please choose a floor plan file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");
    setNormalizeResult(null);

    try {
      const result = await parseFloorPlan(selectedFile);
      const meta = {
        project_id: result.floorPlan.id,
        source_filename: selectedFile.name,
        units: "imperial",
      };
      const canonicalCandidate = toCanonicalFromFrontend(result.floorPlan);
      const normalized = await normalizePolycamIntake(meta, canonicalCandidate);

      setFloorPlan(result.floorPlan);
      setNormalizeResult(normalized as NormalizeResult);

      if (normalized.status === "rejected" || normalized.validation?.status === "invalid") {
        setError("Parse completed but blocked by permit validation checks. Review E-* errors below.");
        return;
      }

      setMessage(`${result.message || "Floor plan parsed successfully."} Normalization + permit validation passed.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse floor plan.";
      setError(errorMessage);
      setFloorPlan(null);
      setNormalizeResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Floor Plan Parser</h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            Upload an image or PDF, then parse and run permit-track normalization checks.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                setError("");
                setNormalizeResult(null);
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black md:w-auto"
            />

            <button
              onClick={handleParse}
              disabled={isLoading || !selectedFile}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? "Parsing + validating..." : "Parse + Validate"}
            </button>

            {normalizeResult?.canonical_floorplan && (
              <button
                onClick={() => triggerJsonDownload(normalizeResult.canonical_floorplan, "canonical-floorplan.json")}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Download Canonical JSON
              </button>
            )}
          </div>

          {selectedFile && (
            <p className="mt-3 text-sm text-gray-600">
              Selected: <span className="font-medium text-gray-900">{selectedFile.name}</span>
            </p>
          )}

          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </div>

        {normalizeResult && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Permit Readiness Summary</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Status</p>
                  <p className={`font-semibold ${permitReady ? "text-green-700" : "text-red-700"}`}>
                    {permitReady ? "Permit-ready" : "Blocked"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Parser confidence</p>
                  <p className="font-semibold text-gray-900">{Math.round((normalizeResult.validation.parser_confidence || 0) * 100)}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Blocking errors</p>
                  <p className="font-semibold text-red-700">{validationErrors.length}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">Warnings</p>
                  <p className="font-semibold text-amber-700">{warningCount}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <span>{item.label}</span>
                    <span className={item.ok ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                      {item.ok ? "PASS" : "FAIL"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Validation Errors (E-*)</h2>
              {validationErrors.length === 0 ? (
                <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  No blocking E-* errors found.
                </p>
              ) : (
                <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1 text-sm">
                  {validationErrors.map((ve, idx) => (
                    <li key={`${ve.code}-${idx}`} className="rounded-lg border border-red-200 bg-red-50 p-2.5">
                      <p className="font-mono font-semibold text-red-900">{ve.code}</p>
                      <p className="text-red-900">{ve.message}</p>
                      <p className="text-xs text-red-700">Path: {ve.path}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <FloorPlanViewer floorPlan={floorPlan} />

        {normalizeResult?.canonical_floorplan && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Canonical JSON Preview</h2>
            <p className="mt-1 text-xs text-gray-600">First 1200 chars of normalized payload (download full JSON above).</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(normalizeResult.canonical_floorplan, null, 2).slice(0, 1200)}
              {JSON.stringify(normalizeResult.canonical_floorplan, null, 2).length > 1200 ? "\n..." : ""}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
