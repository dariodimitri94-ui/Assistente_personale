import { NextResponse } from "next/server";
import { getTask } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

const FASCIA_ORDINE = { in_ritardo: 0, oggi: 1, settimana: 2, piu_avanti: 3 };
const TEMPERATURA_ORDINE = { caldo: 0, tiepido: 1, freddo: 2 };

export async function GET() {
  const tasks = await getTask({ oggiISO: today() });

  const rilevanti = tasks
    .filter((t) => t.urgenza_effettiva === "in_ritardo" || t.urgenza_effettiva === "oggi")
    .sort((a, b) => {
      const fascia = FASCIA_ORDINE[a.urgenza_effettiva] - FASCIA_ORDINE[b.urgenza_effettiva];
      if (fascia !== 0) return fascia;
      const temp = TEMPERATURA_ORDINE[a.temperatura] - TEMPERATURA_ORDINE[b.temperatura];
      if (temp !== 0) return temp;
      return a.posizione - b.posizione;
    })
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      titolo: t.titolo,
      persona: t.persone?.nome || null,
      temperatura: t.temperatura,
      urgenza: t.urgenza_effettiva,
    }));

  return NextResponse.json({ tasks: rilevanti });
}
