import { NextResponse } from 'next/server';

import { normalizePolycamToCanonical } from '../../../../lib/polycam-normalizer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const meta = body?.meta;
    const plan = body?.plan;

    if (!meta || !plan || typeof meta !== 'object' || typeof plan !== 'object') {
      return NextResponse.json(
        {
          status: 'rejected',
          error: {
            code: 'E-META-004',
            message: 'Request must include object fields: meta and plan',
            blocking: true,
          },
        },
        { status: 400 }
      );
    }

    const canonical = normalizePolycamToCanonical(meta, plan) as Record<string, unknown>;
    const validation = (canonical.validation || {}) as {
      status?: 'valid' | 'invalid';
      errors?: unknown[];
      warnings?: unknown[];
      parser_confidence?: number;
    };

    return NextResponse.json({
      status: validation.status === 'valid' ? 'ok' : 'rejected',
      canonical_floorplan: canonical,
      validation,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'rejected',
        error: {
          code: 'E-META-005',
          message: 'Invalid JSON body',
          blocking: true,
        },
      },
      { status: 400 }
    );
  }
}
