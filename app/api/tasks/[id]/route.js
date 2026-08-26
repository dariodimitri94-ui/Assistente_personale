import { NextResponse } from "next/server";
import { addRegistro, findOrCreatePersona, updateTask } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (typeof body.titolo === "string") patch.titolo = body.titolo;
  if (typeof body.nota === "string" || body.nota === null) patch.nota = body.nota;
  if (typeof body.urgenza === "string") patch.urgenza = body.urgenza;
  if (typeof body.temperatura === "string") patch.temperatura = body.temperatura;
  if (typeof body.posizione === "number") patch.posizione = body.posizione;
  if (typeof body.tag !== "undefined") patch.tag = body.tag;

  if (typeof body.persona === "string") {
    const personaRow = await findOrCreatePersona(body.persona);
    patch.persona_id = personaRow?.id || null;
  } else if (body.persona === null) {
    patch.persona_id = null;
  }

  if (body.completare === true) {
    patch.completato_il = new Date().toISOString();
  } else if (body.completare === false) {
    patch.completato_il = null;
  }

  const task = await updateTask(id, patch);

  if (body.completare === true) {
    await addRegistro("task.completato", { id, titolo: task.titolo });
  }

  return NextResponse.json({ task });
}
