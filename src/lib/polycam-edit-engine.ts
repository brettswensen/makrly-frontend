type Dict = Record<string, unknown>;

type EditOp =
  | { op: "MOVE_WALL"; wall_id: string; dx: number; dy: number }
  | { op: "SET_WALL_HEIGHT"; wall_id: string; height_in: number }
  | {
      op: "ADD_OPENING";
      wall_id: string;
      opening_type: "door" | "window";
      width_in: number;
      position_ratio: number;
      sill_in?: number;
    }
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

function finiteNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validate(canonical: Dict) {
  const entities = asDict(canonical.entities);
  const rooms = asArray(entities.rooms);
  const walls = asArray(entities.walls);
  const openings = asArray(entities.openings);

  const errors: Array<{
    code: string;
    message: string;
    severity: string;
    path: string;
  }> = [];

  rooms.forEach((r, i) => {
    const name = String(asDict(r).name || "").trim();
    if (!name)
      errors.push(
        blocking("E-META-003", "Room label required", `entities.rooms[${i}].name`)
      );
  });

  walls.forEach((w, i) => {
    const height = Number(asDict(w).height_in);
    if (!Number.isFinite(height) || height <= 0) {
      errors.push(
        blocking(
          "E-GEO-006",
          "wall.height_in must be > 0",
          `entities.walls[${i}].height_in`
        )
      );
    }
  });

  const wallIds = new Set(walls.map((w) => String(asDict(w).wall_id || "")));
  openings.forEach((o, i) => {
    const opening = asDict(o);
    const type = String(opening.type || "");
    const wallId = String(opening.wall_id || "");
    if (!wallIds.has(wallId)) {
      errors.push(
        blocking(
          "E-GEO-004",
          "Opening references unknown wall",
          `entities.openings[${i}].wall_id`
        )
      );
    }
    if (type === "window") {
      const sill = Number(opening.sill_in);
      if (!Number.isFinite(sill)) {
        errors.push(
          blocking(
            "E-GEO-005",
            "Window opening requires sill_in",
            `entities.openings[${i}].sill_in`
          )
        );
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
    const wall_id = String(d.wall_id || "").trim();
    const dx = finiteNumber(d.dx);
    const dy = finiteNumber(d.dy);
    if (!wall_id) throw new Error("MOVE_WALL requires wall_id");
    if (dx == null || dy == null) throw new Error("MOVE_WALL requires finite dx/dy");
    return { op, wall_id, dx, dy };
  }

  if (op === "SET_WALL_HEIGHT") {
    const wall_id = String(d.wall_id || "").trim();
    const height_in = finiteNumber(d.height_in);
    if (!wall_id) throw new Error("SET_WALL_HEIGHT requires wall_id");
    if (height_in == null || height_in <= 0 || height_in > 240) {
      throw new Error("SET_WALL_HEIGHT height_in must be > 0 and <= 240");
    }
    return { op, wall_id, height_in };
  }

  if (op === "ADD_OPENING") {
    const wall_id = String(d.wall_id || "").trim();
    const opening_type = String(d.opening_type || "").trim();
    const width_in = finiteNumber(d.width_in);
    const position_ratio = finiteNumber(d.position_ratio);
    const sill_in = d.sill_in == null ? undefined : finiteNumber(d.sill_in);

    if (!wall_id) throw new Error("ADD_OPENING requires wall_id");
    if (opening_type !== "door" && opening_type !== "window") {
      throw new Error("ADD_OPENING opening_type must be door|window");
    }
    if (width_in == null || width_in < 12 || width_in > 120) {
      throw new Error("ADD_OPENING width_in must be between 12 and 120");
    }
    if (position_ratio == null || position_ratio < 0 || position_ratio > 1) {
      throw new Error("ADD_OPENING position_ratio must be between 0 and 1");
    }
    if (opening_type === "window") {
      if (sill_in == null || sill_in < 0 || sill_in > 120) {
        throw new Error("ADD_OPENING window requires sill_in between 0 and 120");
      }
    }

    return {
      op,
      wall_id,
      opening_type,
      width_in,
      position_ratio,
      sill_in: sill_in ?? undefined,
    };
  }

  if (op === "DELETE_OPENING") {
    const opening_id = String(d.opening_id || "").trim();
    if (!opening_id) throw new Error("DELETE_OPENING requires opening_id");
    return { op, opening_id };
  }

  throw new Error("Unsupported operation");
}

function nextOpeningId(openings: Dict[]) {
  const existing = new Set(openings.map((o) => String(o.opening_id || "")));
  let i = openings.length + 1;
  while (existing.has(`opening-${i}`)) i += 1;
  return `opening-${i}`;
}

export function applyDeterministicEdit(canonicalInput: unknown, opInput: unknown) {
  const before = asDict(deepCopy(canonicalInput));
  const beforeValidation = validate(before);

  function rejected(message: string) {
    return {
      status: "rejected" as const,
      message: `${message} Rolled back.`,
      canonical_floorplan: before,
      validation: beforeValidation,
      rollback_applied: true,
    };
  }

  let op: EditOp;
  try {
    op = parseOp(opInput);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : "Invalid edit operation.");
  }

  const after = asDict(deepCopy(canonicalInput));
  const entities = asDict(after.entities);
  const walls = asArray(entities.walls).map(asDict);
  const openings = asArray(entities.openings).map(asDict);

  try {
    if (op.op === "MOVE_WALL") {
      const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
      if (!wall) throw new Error("Wall not found");
      const start = asDict(wall.start);
      const end = asDict(wall.end);
      const sx = finiteNumber(start.x);
      const sy = finiteNumber(start.y);
      const ex = finiteNumber(end.x);
      const ey = finiteNumber(end.y);
      if (sx == null || sy == null || ex == null || ey == null) {
        throw new Error("Wall geometry is invalid");
      }
      wall.start = { x: sx + op.dx, y: sy + op.dy };
      wall.end = { x: ex + op.dx, y: ey + op.dy };
    } else if (op.op === "SET_WALL_HEIGHT") {
      const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
      if (!wall) throw new Error("Wall not found");
      wall.height_in = op.height_in;
    } else if (op.op === "ADD_OPENING") {
      const wall = walls.find((w) => String(w.wall_id) === op.wall_id);
      if (!wall) throw new Error("Wall not found");
      const opening: Dict = {
        opening_id: nextOpeningId(openings),
        type: op.opening_type,
        floor_id: String(wall.floor_id || "F1"),
        wall_id: op.wall_id,
        width_in: op.width_in,
        position_ratio: op.position_ratio,
      };
      opening.sill_in = op.opening_type === "door" ? 0 : op.sill_in;
      openings.push(opening);
    } else if (op.op === "DELETE_OPENING") {
      const idx = openings.findIndex((o) => String(o.opening_id) === op.opening_id);
      if (idx < 0) throw new Error("Opening not found");
      openings.splice(idx, 1);
    }
  } catch (error) {
    return rejected(error instanceof Error ? error.message : "Edit operation failed.");
  }

  entities.walls = walls;
  entities.openings = openings;
  after.entities = entities;

  const validation = validate(after);
  after.validation = validation;

  if (validation.status === "invalid") {
    return {
      status: "rejected" as const,
      message: "Hard-stop validation failed. Rolled back.",
      canonical_floorplan: before,
      validation,
      rollback_applied: true,
    };
  }

  return {
    status: "ok" as const,
    message: "Edit applied.",
    canonical_floorplan: after,
    validation,
    rollback_applied: false,
  };
}
