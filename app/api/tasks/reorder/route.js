import { NextResponse } from "next/server";
import { updateTask } from "../../../../lib/store";

export const dynamic = "force-dynamic";

// Al rilascio di una carta nel Kanban si riscrivono le posizioni di TUTTA
// la fascia toccata (Parte 5.4) — poche decine di righe, la versione
// semplice è quella che non si rompe.
export async function POST(request) {
  const { urgenza, orderedIds } = await request.json().catch(() => ({}));
  if (!urgenza || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "urgenza o orderedIds mancanti" }, { status: 400 });
  }

  await Promise.all(
    orderedIds.map((id, index) => updateTask(id, { urgenza, posizione: index }))
  );

  return NextResponse.json({ ok: true });
}
