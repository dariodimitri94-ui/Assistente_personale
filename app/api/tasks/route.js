import { NextResponse } from "next/server";
import { addTask, findOrCreatePersona, getTask } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = await getTask({ oggiISO: today() });
  return NextResponse.json({ tasks });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { titolo, nota, urgenza, temperatura, persona, posizione } = body;
  if (!titolo || typeof titolo !== "string") {
    return NextResponse.json({ error: "titolo mancante" }, { status: 400 });
  }
  const personaRow = persona ? await findOrCreatePersona(persona) : null;
  const task = await addTask({
    titolo,
    nota: nota || null,
    urgenza: urgenza || "oggi",
    temperatura: temperatura || "tiepido",
    persona_id: personaRow?.id || null,
    posizione: posizione ?? 0,
  });
  return NextResponse.json({ task });
}
