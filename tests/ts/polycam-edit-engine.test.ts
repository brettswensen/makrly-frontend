import { test } from "node:test";
import * as assert from "node:assert/strict";

import { applyDeterministicEdit } from "../../src/lib/polycam-edit-engine";

type CanonicalLike = {
  entities: {
    walls: Array<{ height_in?: number }>;
    openings: Array<{ type?: string; sill_in?: number }>;
  };
};

function asCanonical(v: unknown): CanonicalLike {
  return v as CanonicalLike;
}

function baseCanonical() {
  return {
    schema_version: "1.0.0",
    project: { project_id: "p1", units: "imperial" },
    entities: {
      walls: [
        {
          wall_id: "wall-1",
          floor_id: "F1",
          start: { x: 0, y: 0 },
          end: { x: 120, y: 0 },
          thickness_in: 6,
          height_in: 96,
        },
      ],
      openings: [],
      rooms: [
        {
          room_id: "room-1",
          floor_id: "F1",
          name: "Kitchen",
          polygon: [
            { x: 0, y: 0 },
            { x: 120, y: 0 },
            { x: 120, y: 120 },
            { x: 0, y: 120 },
          ],
          area_sqft: 100,
        },
      ],
    },
  };
}

test("applies valid wall height edit", () => {
  const result = applyDeterministicEdit(baseCanonical(), {
    op: "SET_WALL_HEIGHT",
    wall_id: "wall-1",
    height_in: 108,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.rollback_applied, false);
  const walls = asCanonical(result.canonical_floorplan).entities.walls;
  assert.equal(walls[0]?.height_in, 108);
});

test("rejects invalid wall height and rolls back", () => {
  const before = baseCanonical();
  const result = applyDeterministicEdit(before, {
    op: "SET_WALL_HEIGHT",
    wall_id: "wall-1",
    height_in: 0,
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rollback_applied, true);
  const walls = asCanonical(result.canonical_floorplan).entities.walls;
  assert.equal(walls[0]?.height_in, 96);
});

test("rejects invalid window opening without sill and rolls back", () => {
  const before = baseCanonical();
  const result = applyDeterministicEdit(before, {
    op: "ADD_OPENING",
    wall_id: "wall-1",
    opening_type: "window",
    width_in: 36,
    position_ratio: 0.5,
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rollback_applied, true);
  const openings = asCanonical(result.canonical_floorplan).entities.openings;
  assert.equal(openings.length, 0);
});

test("adds valid window opening with sill", () => {
  const result = applyDeterministicEdit(baseCanonical(), {
    op: "ADD_OPENING",
    wall_id: "wall-1",
    opening_type: "window",
    width_in: 40,
    position_ratio: 0.4,
    sill_in: 36,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.rollback_applied, false);
  const openings = asCanonical(result.canonical_floorplan).entities.openings;
  assert.equal(openings.length, 1);
  assert.equal(openings[0]?.type, "window");
  assert.equal(openings[0]?.sill_in, 36);
});

test("rejects delete of missing opening and rolls back", () => {
  const result = applyDeterministicEdit(baseCanonical(), {
    op: "DELETE_OPENING",
    opening_id: "does-not-exist",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rollback_applied, true);
});
