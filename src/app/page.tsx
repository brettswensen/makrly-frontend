"use client";

import { useState } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import { parseFloorPlan } from "@/lib/api";
import type { FloorPlan } from "@/types/floorplan";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleParse() {
    if (!selectedFile) {
      setError("Please choose a floor plan file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await parseFloorPlan(selectedFile);
      setFloorPlan(result.floorPlan);
      setMessage(result.message || "Floor plan parsed successfully.");
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
        </div>

        <FloorPlanViewer floorPlan={floorPlan} />
      </main>
    </div>
  );
}
