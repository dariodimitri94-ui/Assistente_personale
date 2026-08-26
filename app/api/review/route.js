import { NextResponse } from "next/server";
import { getObiettivi, getTask, getTaskCompletatiDa } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

function addDays(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// La Review chiude la settimana leggendo quello che le altre schede hanno
// già scritto: pura aggregazione, nessuna chiamata al modello (Parte 5).
export async function GET() {
  const oggi = today();
  const [completati, tasksAttivi, obiettivi] = await Promise.all([
    getTaskCompletatiDa(addDays(oggi, -6)),
    getTask({ oggiISO: oggi }),
    getObiettivi(),
  ]);

  const inRitardo = tasksAttivi.filter((t) => t.urgenza_effettiva === "in_ritardo");
  const apertiOggiSettimana = tasksAttivi.filter(
    (t) => t.urgenza_effettiva === "oggi" || t.urgenza_effettiva === "settimana"
  );

  return NextResponse.json({
    completati: completati.map((t) => ({ titolo: t.titolo, persona: t.persone?.nome || null })),
    inRitardo: inRitardo.map((t) => ({ titolo: t.titolo, giorni: t.created_at, persona: t.persone?.nome || null })),
    apertiCount: apertiOggiSettimana.length,
    priorita: (obiettivi.settimana || []).filter((o) => !o.fatto),
  });
}
