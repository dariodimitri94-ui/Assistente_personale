import { NextResponse } from "next/server";
import { updatePasto } from "../../../../lib/store";
import { today } from "../../../../lib/date";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json().catch(() => ({}));
  const pasto = await updatePasto(today(), id, patch);
  return NextResponse.json({ pasto });
}
