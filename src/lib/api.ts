const API_BASE_URL = 'https://makrly-floorplan-backend--brettmakrly.replit.app';

export interface FloorPlan {
  id: string;
  name: string;
  rooms: Array<{
    id: string;
    name: string;
    points: Array<{ x: number; y: number }>;
    areaSqft: number;
  }>;
  walls: Array<{
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    thickness: number;
  }>;
  doors: Array<{
    id: string;
    wallId: string;
    position: number;
    width: number;
  }>;
  windows: Array<{
    id: string;
    wallId: string;
    position: number;
    width: number;
  }>;
  scale: number;
}

export interface ParseResponse {
  floorPlan: FloorPlan;
  source_filename: string;
  message: string;
}

// Backend now returns camelCase directly matching frontend types
interface BackendFloorPlan {
  id: string;
  name: string;
  rooms: Array<{
    id: string;
    name: string;
    points: Array<{ x: number; y: number }>;
    areaSqft: number;
  }>;
  walls: Array<{
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    thickness?: number;
  }>;
  doors: Array<{
    id: string;
    wallId: string;
    position: number;
    width: number;
  }>;
  windows: Array<{
    id: string;
    wallId: string;
    position: number;
    width: number;
  }>;
  scale: number;
}

function transformBackendToFrontend(backend: BackendFloorPlan): FloorPlan {
  // Defensive mapping for partial backend payloads
  const rooms = Array.isArray(backend?.rooms) ? backend.rooms : [];
  const walls = Array.isArray(backend?.walls) ? backend.walls : [];
  const doors = Array.isArray(backend?.doors) ? backend.doors : [];
  const windows = Array.isArray(backend?.windows) ? backend.windows : [];

  return {
    id: backend?.id || `fp-${Date.now()}`,
    name: backend?.name || 'Parsed Floor Plan',
    rooms: rooms
      .filter((r) => r && Array.isArray(r.points) && r.points.length >= 3)
      .map((r, index) => ({
        id: r.id || `room-${index + 1}`,
        name: r.name || `Room ${index + 1}`,
        points: r.points
          .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
          .map((p) => ({ x: Number(p.x), y: Number(p.y) })),
        areaSqft: Number.isFinite(r.areaSqft) ? Number(r.areaSqft) : 0,
      })),
    walls: walls
      .filter(
        (w) =>
          w &&
          w.start &&
          w.end &&
          Number.isFinite(w.start.x) &&
          Number.isFinite(w.start.y) &&
          Number.isFinite(w.end.x) &&
          Number.isFinite(w.end.y)
      )
      .map((w, index) => ({
        id: w.id || `wall-${index + 1}`,
        start: { x: Number(w.start.x), y: Number(w.start.y) },
        end: { x: Number(w.end.x), y: Number(w.end.y) },
        thickness: Number.isFinite(w.thickness) ? Number(w.thickness) : 0.5,
      })),
    doors: doors
      .filter((d) => d && d.wallId)
      .map((d, index) => ({
        id: d.id || `door-${index + 1}`,
        wallId: d.wallId,
        position: Number.isFinite(d.position) ? Number(d.position) : 0.5,
        width: Number.isFinite(d.width) ? Number(d.width) : 3,
      })),
    windows: windows
      .filter((w) => w && w.wallId)
      .map((w, index) => ({
        id: w.id || `window-${index + 1}`,
        wallId: w.wallId,
        position: Number.isFinite(w.position) ? Number(w.position) : 0.5,
        width: Number.isFinite(w.width) ? Number(w.width) : 4,
      })),
    scale: Number.isFinite(backend?.scale) ? Number(backend.scale) : 1,
  };
}

export async function parseFloorPlan(file: File): Promise<{ floorPlan: FloorPlan; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/parse-floorplan`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to parse floor plan');
  }

  const data = await response.json();
  return {
    floorPlan: transformBackendToFrontend(data.floorPlan),
    message: data.message,
  };
}

export async function modifyFloorPlan(
  floorPlan: FloorPlan,
  command: string
): Promise<{ floorPlan: FloorPlan; command: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/modify-floorplan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ floorPlan, command }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to modify floor plan');
  }

  return response.json();
}

export async function exportPDF(floorPlan: FloorPlan): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/export-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ floorPlan }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to export PDF');
  }

  return response.blob();
}
