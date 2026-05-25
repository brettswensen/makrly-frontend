"use client";

import { useState } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import { normalizePolycamIntake, parseFloorPlan } from "@/lib/api";
import type { FloorPlan } from "@/types/floorplan";

type ValidationError = {
  code: string;
  message: string;
  severity: string;
  path: string;
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

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleParse() {
    if (!selectedFile) {
      setError("Please choose a floor plan file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");
    setValidationErrors([]);

    try {
      const result = await parseFloorPlan(selectedFile);
      const meta = {
        project_id: result.floorPlan.id,
        source_filename: selectedFile.name,
        units: "imperial",
      };
      const canonicalCandidate = toCanonicalFromFrontend(result.floorPlan);
      const normalizeResult = await normalizePolycamIntake(meta, canonicalCandidate);

      if (normalizeResult.status === "rejected" || normalizeResult.validation?.status === "invalid") {
        const errors = Array.isArray(normalizeResult.validation?.errors)
          ? (normalizeResult.validation.errors as ValidationError[])
          : [];
        setValidationErrors(errors);
        setError("Parse completed but blocked by permit validation checks. Fix the listed E-* errors.");
        setFloorPlan(result.floorPlan);
        return;
      }

      setFloorPlan(result.floorPlan);
      setMessage(`${result.message || "Floor plan parsed successfully."} Normalization + permit validation passed.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse floor plan.";
      setError(errorMessage);
      setFloorPlan(null);
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
            Upload an image or PDF, then parse it into room data and a visual floor plan.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                setError("");
                setValidationErrors([]);
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black md:w-auto"
            />

            <button
              onClick={handleParse}
              disabled={isLoading || !selectedFile}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? "Parsing..." : "Parse Floor Plan"}
            </button>
          </div>

          {selectedFile && (
            <p className="mt-3 text-sm text-gray-600">
              Selected: <span className="font-medium text-gray-900">{selectedFile.name}</span>
            </p>
          )}

          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          {validationErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-800">Blocking validation errors</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
                {validationErrors.map((ve, idx) => (
                  <li key={`${ve.code}-${idx}`}>
                    <span className="font-mono">{ve.code}</span>: {ve.message}{" "}
                    <span className="text-red-700">({ve.path})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FloorPlanViewer floorPlan={floorPlan} />
      </main>
    </div>
  );
}
