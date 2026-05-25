type Dict = Record<string, unknown>;

type EditOp =
  | { op: "MOVE_WALL"; wall_id: string; dx: number; dy: number }
  | { op: "SET_WALL_HEIGHT"; wall_id: string; height_in: number }
  | { op: "ADD_OPENING"; wall_id: string; opening_type: "door" | "window"; width_in: number; position_ratio: number; sill_in?: number }
  | { op: "DELETE_OPENING"; opening_id: string };

function asDict(v: unknown): Dict {
  return v && typeof v === "object" ? (v as Dict) : {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function blocking(code: string, message: string, path: string) {
  return { code, message, severity: "blocking", path };
}

function validate(canonical: Dict) {
  const entities = asDict(canonical.entities);
  const rooms = asArray(entities.rooms);
  const walls = asArray(entities.walls);
  const openings = asArray(entities.openings);

  const errors: Array<{ code: string; message: string; severity: string; path: string }> = [];

  rooms.forEach((r, i) => {
    const name = String(asDict(r).name || "").trim();
    if (!name) errors.push(blocking("E-META-003", "Room label required", `entities.rooms[${i}].name`));
  });

  walls.forEach((w, i) => {
    const height = Number(asDict(w).height_in);
    if (!Number.isFinite(height) || height <= 0) {
      errors.push(blocking("E-GEO-006", "wall.height_in must be > 0", `entities.walls[${i}].height_in`));
    }
  });

  const wallIds = new Set(walls.map((w) => String(asDict(w).wall_id || "")));
  openings.forEach((o, i) => {
    const opening = asDict(o);
    const type = String(opening.type || "");
    const wallId = String(opening.wall_id || "");
    if (!wallIds.has(wallId)) {
      errors.push(blocking("E-GEO-004", "Opening references unknown wall", `entities.openings[${i}].wall_id`));
    }
    if (type === "window") {
      const sill = Number(opening.sill_in);
      if (!Number.isFinite(sill)) {
        errors.push(blocking("E-GEO-005", "Window opening requires sill_in", `entities.openings[${i}].sill_in`));
      }
    }
  });

  return {
    status: errors.length ? "invalid" : "valid",
    errors,
    warnings: [],
    parser_confidence: Number(asDict(canonical.validation).parser_confidence ?? 0.9),
  } as const;
}

function parseOp(input: unknown): EditOp {
  const d = asDict(input);
  const op = String(d.op || "");
  if (op === "MOVE_WALL") {
    return { op, wall_id: String(d.wall_id || ""), dx: Number(d.dx), dy: Number(d.dy) };
  }
  if (op === "SET_WALL_HEIGHT") {
    return { op, wall_id: String(d.wall_id || ""), height_in: Number(d.height_in) };
  }
  if (op === "ADD_OPENING") {
    const opening_type = String(d.opening_type || "") as "door" | "window";
    return {
      op,
      wall_id: String(d.wall_id || ""),
      opening_type,
      width_in: Number(d.width_in),
      position_ratio: Number(d.position_ratio),
      sill_in: d.sill_in == null ? undefined : Number(d.sill_in),
    };
  }
  if (op === "DELETE_OPENING") {
    return { op, opening_id: String(d.opening_id || "") };
  }
  throw new Error("Unsupported operation");
}

export function applyDeterministicEdit(canonicalInput: unknown, opInput: unknown) {
  const before = asDict(deepCopy(canonicalInput));
  const after = asDict(deepCopy(canonicalInput));
  const entities = asDict(after.entities);
  const walls = asArray(entities.walls).map(asDict);
  const openings = asArray(entities.openings).map(asDict);

  const op = parseOp(opInput);

  if (op.op === "MOVE_WALL") {
    const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
    if (!wall) throw new Error("Wall not found");
    const start = asDict(wall.start);
    const end = asDict(wall.end);
    wall.start = { x: Number(start.x) + op.dx, y: Number(start.y) + op.dy };
    wall.end = { x: Number(end.x) + op.dx, y: Number(end.y) + op.dy };
  } else if (op.op === "SET_WALL_HEIGHT") {
    const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
    if (!wall) throw new Error("Wall not found");
    wall.height_in = op.height_in;
  } else if (op.op === "ADD_OPENING") {
    const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
    if (!wall) throw new Error("Wall not found");
    const opening: Dict = {
      opening_id: `opening-${Date.now()}`,
      type: op.opening_type,
      floor_id: String(wall.floor_id || "F1"),
      wall_id: op.wall_id,
      width_in: op.width_in,
      position_ratio: Math.max(0, Math.min(1, op.position_ratio)),
    };
    if (op.opening_type === "door") opening.sill_in = 0;
    if (op.opening_type === "window") opening.sill_in = op.sill_in;
    openings.push(opening);
  } else if (op.op === "DELETE_OPENING") {
    const idx = openings.findIndex((o) => String(o.opening_id) === op.opening_id);
    if (idx < 0) throw new Error("Opening not found");
    openings.splice(idx, 1);
  }

  entities.walls = walls;
  entities.openings = openings;
  after.entities = entities;

  const validation = validate(after);
  after.validation = validation;

  if (validation.status === "invalid") {
    return {
      status: "rejected",
      message: "Hard-stop validation failed. Rolled back.",
      canonical_floorplan: before,
      validation,
      rollback_applied: true,
    };
  }

  return {
    status: "ok",
    message: "Edit applied.",
    canonical_floorplan: after,
    validation,
    rollback_applied: false,
  };
}
