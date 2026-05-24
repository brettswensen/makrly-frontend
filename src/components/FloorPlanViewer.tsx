'use client';

import { useMemo, useState } from 'react';
import { FloorPlan, Point, Wall } from '@/types/floorplan';

interface FloorPlanViewerProps {
  floorPlan: FloorPlan | null;
}

const VIEWBOX_PADDING = 24;

function centroid(points: Point[]) {
  if (!points.length) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function pointAlongWall(wall: Wall, t: number) {
  const tt = clamp01(t);
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * tt,
    y: wall.start.y + (wall.end.y - wall.start.y) * tt,
  };
}

function pointToString(p: Point) {
  return `${p.x},${p.y}`;
}

export default function FloorPlanViewer({ floorPlan }: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const wallsById = useMemo(() => {
    const map = new Map<string, Wall>();
    if (!floorPlan) return map;
    floorPlan.walls.forEach((w) => map.set(w.id, w));
    return map;
  }, [floorPlan]);

  const bounds = useMemo(() => {
    if (!floorPlan) return null;
    const pts: Point[] = [];
    floorPlan.rooms.forEach((r) => pts.push(...r.points));
    floorPlan.walls.forEach((w) => {
      pts.push(w.start, w.end);
    });

    if (!pts.length) return null;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [floorPlan]);

  if (!floorPlan) {
    return (
      <div className="bg-gray-100 rounded-lg p-12 text-center">
        <p className="text-gray-500">Upload a floor plan to see it here</p>
      </div>
    );
  }

  const hasGeometry = floorPlan.rooms.length > 0 || floorPlan.walls.length > 0;

  if (!hasGeometry || !bounds) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{floorPlan.name}</h3>
          <span className="text-sm text-gray-500">Scale: {floorPlan.scale || 'N/A'}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          <p className="font-medium">No drawable geometry was returned yet.</p>
          <p className="text-sm mt-1">Try a clearer floor plan image or re-upload to generate rooms/walls.</p>
        </div>
      </div>
    );
  }

  const viewBox = `${bounds.minX - VIEWBOX_PADDING} ${bounds.minY - VIEWBOX_PADDING} ${bounds.width + VIEWBOX_PADDING * 2} ${bounds.height + VIEWBOX_PADDING * 2}`;

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">{floorPlan.name}</h3>
          <p className="text-sm text-gray-500">
            Scale: {floorPlan.scale} • {floorPlan.rooms.length} rooms • {floorPlan.walls.length} walls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>
            − Zoom
          </button>
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>
            + Zoom
          </button>
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setPan((p) => ({ ...p, y: p.y - 20 }))}>
            ↑
          </button>
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setPan((p) => ({ ...p, y: p.y + 20 }))}>
            ↓
          </button>
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setPan((p) => ({ ...p, x: p.x - 20 }))}>
            ←
          </button>
          <button className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" onClick={() => setPan((p) => ({ ...p, x: p.x + 20 }))}>
            →
          </button>
          <button
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-gray-50 border rounded-lg overflow-hidden h-[520px]">
          <svg className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {floorPlan.rooms.map((room) => (
                <g key={room.id}>
                  <polygon
                    points={room.points.map(pointToString).join(' ')}
                    fill="rgba(37, 99, 235, 0.15)"
                    stroke="rgba(37, 99, 235, 0.9)"
                    strokeWidth={1.5 / zoom}
                  />
                  <text
                    x={centroid(room.points).x}
                    y={centroid(room.points).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12 / zoom}
                    fill="#1f2937"
                    style={{ fontWeight: 600 }}
                  >
                    {room.name}
                  </text>
                </g>
              ))}

              {floorPlan.walls.map((wall) => (
                <line
                  key={wall.id}
                  x1={wall.start.x}
                  y1={wall.start.y}
                  x2={wall.end.x}
                  y2={wall.end.y}
                  stroke="#111827"
                  strokeWidth={Math.max(1.5, wall.thickness * 2) / zoom}
                  strokeLinecap="round"
                />
              ))}

              {floorPlan.doors.map((door) => {
                const wall = wallsById.get(door.wallId);
                if (!wall) return null;
                const p = pointAlongWall(wall, door.position);
                return (
                  <g key={door.id}>
                    <circle cx={p.x} cy={p.y} r={3.5 / zoom} fill="#f97316" />
                    <text x={p.x + 5 / zoom} y={p.y - 5 / zoom} fontSize={9 / zoom} fill="#9a3412">
                      D {door.width}'
                    </text>
                  </g>
                );
              })}

              {floorPlan.windows.map((window) => {
                const wall = wallsById.get(window.wallId);
                if (!wall) return null;
                const p = pointAlongWall(wall, window.position);
                return (
                  <g key={window.id}>
                    <rect x={p.x - 3 / zoom} y={p.y - 3 / zoom} width={6 / zoom} height={6 / zoom} fill="#0ea5e9" />
                    <text x={p.x + 5 / zoom} y={p.y + 11 / zoom} fontSize={9 / zoom} fill="#075985">
                      W {window.width}'
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold">Room Data</h4>
          {floorPlan.rooms.length === 0 ? (
            <p className="text-sm text-gray-500">No rooms detected.</p>
          ) : (
            <ul className="space-y-2 max-h-[460px] overflow-auto pr-1">
              {floorPlan.rooms.map((room) => (
                <li key={room.id} className="bg-white border rounded p-2">
                  <p className="font-medium text-sm">{room.name}</p>
                  <p className="text-xs text-gray-600">Area: {room.areaSqft?.toFixed?.(1) ?? room.areaSqft} sqft</p>
                  <p className="text-xs text-gray-500">Vertices: {room.points.length}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="mt-2 text-xs text-gray-500">Legend: <span className="text-blue-700">Rooms</span> • <span className="text-gray-900">Walls</span> • <span className="text-orange-600">Doors</span> • <span className="text-sky-600">Windows</span></div>
    </div>
  );
}
