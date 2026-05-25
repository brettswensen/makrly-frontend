import { NextResponse } from "next/server";

import { applyDeterministicEdit } from "../../../../lib/polycam-edit-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const canonical = body?.canonical_floorplan;
    const operation = body?.operation;

    if (!canonical || !operation) {
      return NextResponse.json(
        {
          error: {
            code: "E-REQ-001",
            message: "Body must include canonical_floorplan and operation",
          },
        },
        { status: 400 }
      );
    }

    const result = applyDeterministicEdit(canonical, operation);
    return NextResponse.json(result, { status: result.status === "ok" ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected edit engine error";
    return NextResponse.json(
      {
        error: {
          code: "E-SERVER-EDIT-001",
          message,
        },
      },
      { status: 500 }
    );
  }
}
