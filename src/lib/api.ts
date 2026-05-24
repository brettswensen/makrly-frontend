import type { FloorPlan, Point, Wall } from '@/types/floorplan';

const API_BASE_URL = 'https://makrly-floorplan-backend--brettmakrly.replit.app';

interface BackendRoom {
  id?: string;
  name?: string;
  points?: Point[];
  polygon?: Point[];
  areaSqft?: number;
  area_sqft?: number;
}

interface BackendWall {
  id?: string;
  start?: Point;
  end?: Point;
  thickness?: number;
}

interface BackendDoorWindow {
  id?: string;
  wallId?: string;
  wall_id?: string;
  position?: number | Point;
  width?: number;
}

interface BackendFloorPlan {
  id?: string;
  name?: string;
  rooms?: BackendRoom[];
  walls?: BackendWall[];
  doors?: BackendDoorWindow[];
  windows?: BackendDoorWindow[];
  scale?: number;
}

function isPoint(p: unknown): p is Point {
  return !!p && typeof p === 'object' && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function normalizePosition(position: number | Point | undefined, wall: Wall | undefined): number {
  if (typeof position === 'number' && Number.isFinite(position)) {
    return clamp01(position);
  }

  if (!wall || !isPoint(position)) return 0.5;

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len2 = dx * dx + dy * dy;
  if (!Number.isFinite(len2) || len2 <= 0) return 0.5;

  const px = position.x - wall.start.x;
  const py = position.y - wall.start.y;
  return clamp01((px * dx + py * dy) / len2);
}

function transformBackendToFrontend(backend: BackendFloorPlan): FloorPlan {
  const rawWalls = Array.isArray(backend?.walls) ? backend.walls : [];
  const walls: Wall[] = rawWalls
    .filter((w) => w && isPoint(w.start) && isPoint(w.end))
    .map((w, index) => ({
      id: w.id || `wall-${index + 1}`,
      start: { x: Number(w.start!.x), y: Number(w.start!.y) },
      end: { x: Number(w.end!.x), y: Number(w.end!.y) },
      thickness: Number.isFinite(w.thickness) ? Number(w.thickness) : 0.5,
    }));

  const wallsById = new Map(walls.map((w) => [w.id, w]));

  const rawRooms = Array.isArray(backend?.rooms) ? backend.rooms : [];
  const rooms = rawRooms
    .map((r, index) => {
      const pts = Array.isArray(r.points) ? r.points : Array.isArray(r.polygon) ? r.polygon : [];
      const validPoints = pts.filter(isPoint).map((p) => ({ x: Number(p.x), y: Number(p.y) }));
      return {
        id: r.id || `room-${index + 1}`,
        name: r.name || `Room ${index + 1}`,
        points: validPoints,
        areaSqft: Number.isFinite(r.areaSqft) ? Number(r.areaSqft) : Number.isFinite(r.area_sqft) ? Number(r.area_sqft) : 0,
      };
    })
    .filter((r) => r.points.length >= 3);

  const rawDoors = Array.isArray(backend?.doors) ? backend.doors : [];
  const doors = rawDoors
    .map((d, index) => {
      const wallId = d.wallId || d.wall_id || '';
      const wall = wallsById.get(wallId);
      return {
        id: d.id || `door-${index + 1}`,
        wallId,
        position: normalizePosition(d.position, wall),
        width: Number.isFinite(d.width) ? Number(d.width) : 3,
      };
    })
    .filter((d) => !!d.wallId);

  const rawWindows = Array.isArray(backend?.windows) ? backend.windows : [];
  const windows = rawWindows
    .map((w, index) => {
      const wallId = w.wallId || w.wall_id || '';
      const wall = wallsById.get(wallId);
      return {
        id: w.id || `window-${index + 1}`,
        wallId,
        position: normalizePosition(w.position, wall),
        width: Number.isFinite(w.width) ? Number(w.width) : 4,
      };
    })
    .filter((w) => !!w.wallId);

  return {
    id: backend?.id || `fp-${Date.now()}`,
    name: backend?.name || 'Parsed Floor Plan',
    rooms,
    walls,
    doors,
    windows,
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
    floorPlan: transformBackendToFrontend(data.floorPlan || {}),
    message: data.message || 'Floor plan parsed successfully',
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
