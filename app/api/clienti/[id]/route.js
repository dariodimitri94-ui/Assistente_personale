import { NextResponse } from "next/server";
import { deletePersona, updatePersona } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (typeof body.nome === "string") patch.nome = body.nome;
  if (typeof body.email === "string" || body.email === null) patch.email = body.email || null;
  if (typeof body.telefono === "string" || body.telefono === null) patch.telefono = body.telefono || null;
  if (typeof body.organizzazione === "string" || body.organizzazione === null) patch.organizzazione = body.organizzazione || null;
  if (typeof body.tipo === "string") patch.tipo = body.tipo;
  if (Array.isArray(body.tag)) patch.tag = body.tag;
  if (typeof body.consenso_newsletter === "boolean") patch.consenso_newsletter = body.consenso_newsletter;

  const cliente = await updatePersona(id, patch);
  return NextResponse.json({ cliente });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await deletePersona(id);
  return NextResponse.json({ ok: true });
}
