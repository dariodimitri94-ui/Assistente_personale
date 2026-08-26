import { NextResponse } from "next/server";
import { addObiettivo, getObiettivi, removeObiettivo, updateObiettivo } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const obiettivi = await getObiettivi();
  return NextResponse.json({ obiettivi });
}

export async function POST(request) {
  const { sezione, label } = await request.json().catch(() => ({}));
  if (!sezione || !label) {
    return NextResponse.json({ error: "sezione o label mancanti" }, { status: 400 });
  }
  const voce = await addObiettivo(sezione, label);
  return NextResponse.json({ voce });
}

export async function PATCH(request) {
  const { sezione, id, ...patch } = await request.json().catch(() => ({}));
  if (!sezione || !id) {
    return NextResponse.json({ error: "sezione o id mancanti" }, { status: 400 });
  }
  const voce = await updateObiettivo(sezione, id, patch);
  return NextResponse.json({ voce });
}

export async function DELETE(request) {
  const { sezione, id } = await request.json().catch(() => ({}));
  if (!sezione || !id) {
    return NextResponse.json({ error: "sezione o id mancanti" }, { status: 400 });
  }
  await removeObiettivo(sezione, id);
  return NextResponse.json({ ok: true });
}
