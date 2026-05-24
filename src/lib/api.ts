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
  // Backend now returns data in frontend format directly
  return {
    id: backend.id,
    name: backend.name,
    rooms: backend.rooms,
    walls: backend.walls.map(w => ({
      ...w,
      thickness: w.thickness || 0.5,
    })),
    doors: backend.doors,
    windows: backend.windows,
    scale: backend.scale,
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
