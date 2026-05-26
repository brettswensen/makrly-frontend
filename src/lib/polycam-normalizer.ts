type Dict = Record<string, unknown>;

const DEFAULT_WALL_HEIGHT_IN = 96;

function asDict(value: unknown): Dict {
  return value && typeof value === 'object' ? (value as Dict) : {};
}

function asArray(value: unknown): Dict[] {
  return Array.isArray(value) ? value.map(asDict) : [];
}

function blocking(code: string, message: string, path: string) {
  return { code, message, severity: 'blocking', path };
}

export function normalizePolycamToCanonical(metaInput: unknown, planInput: unknown): Dict {
  const meta = asDict(metaInput);
  const model = structuredClone(asDict(planInput));

  const project = asDict(model.project);
  project.project_id = project.project_id || meta.project_id || 'proj_unknown';
  project.capture_source = 'polycam';
  project.units = 'imperial';
  model.project = project;

  const errors: Dict[] = [];

  const entities = asDict(model.entities);
  const walls = asArray(entities.walls);
  const openings = asArray(entities.openings);
  const rooms = asArray(entities.rooms);

  walls.forEach((wall, i) => {
    if (wall.height_in === undefined || wall.height_in === null || wall.height_in === '') {
      wall.height_in = DEFAULT_WALL_HEIGHT_IN;
    }
    if (!(Number(wall.height_in) > 0)) {
      errors.push(blocking('E-GEO-006', 'Wall height must be > 0', `/entities/walls/${i}/height_in`));
    }
  });

  openings.forEach((opening, i) => {
    if (opening.type === 'door') {
      if (opening.sill_in === undefined || opening.sill_in === null) opening.sill_in = 0;
    } else if (opening.type === 'window') {
      if (opening.sill_in === undefined || opening.sill_in === null) {
        errors.push(
          blocking('E-GEO-005', 'Window opening requires sill_in for permit track', `/entities/openings/${i}/sill_in`)
        );
      }
    }
  });

  rooms.forEach((room, i) => {
    if (!String(room.name || '').trim()) {
      errors.push(blocking('E-META-003', 'Room name is required for permit', `/entities/rooms/${i}/name`));
    }
  });

  entities.walls = walls;
  entities.openings = openings;
  entities.rooms = rooms;
  model.entities = entities;

  model.schema_version = model.schema_version || '1.0.0';

  const revisions = Array.isArray(model.revisions) ? model.revisions : [];
  if (revisions.length === 0) {
    revisions.push({
      rev_id: 'rev_normalized',
      timestamp: new Date().toISOString(),
      actor: 'system',
      source: 'intake',
      operations: [],
      model_hash: 'normalized_seed',
    });
  }
  model.revisions = revisions;

  const validation = asDict(model.validation);
  const existingWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  const parserConfidence = Number.isFinite(validation.parser_confidence)
    ? Number(validation.parser_confidence)
    : 0.9;

  model.validation = {
    status: errors.length ? 'invalid' : 'valid',
    errors,
    warnings: existingWarnings,
    parser_confidence: parserConfidence,
  };

  return model;
}
