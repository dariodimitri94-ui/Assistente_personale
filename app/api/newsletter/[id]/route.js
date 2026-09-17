import { NextResponse } from "next/server";
import { deleteNewsletter, getNewsletter, updateNewsletter } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const existing = await getNewsletter(id);
  if (existing.stato === "inviata") {
    return NextResponse.json({ error: "newsletter già inviata, non modificabile" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if (typeof body.oggetto === "string") patch.oggetto = body.oggetto;
  if (typeof body.corpo === "string") patch.corpo = body.corpo;
  if (Array.isArray(body.tag_filtro)) patch.tag_filtro = body.tag_filtro;

  const newsletter = await updateNewsletter(id, patch);
  return NextResponse.json({ newsletter });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await deleteNewsletter(id);
  return NextResponse.json({ ok: true });
}
