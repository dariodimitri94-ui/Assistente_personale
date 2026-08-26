import { NextResponse } from "next/server";
import { getLogGiornalieriIntervallo } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

function addDays(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Pura aggregazione di dati già scritti da altre schede: nessuna chiamata
// al modello, nessuna scrittura (Parte 5.6).
export async function GET() {
  const oggi = today();
  const rows = await getLogGiornalieriIntervallo(addDays(oggi, -29), oggi);

  const giorni = rows
    .filter((r) => r.pasti?.length)
    .map((r) => {
      const totali = r.pasti.reduce(
        (acc, p) => ({
          calorie: acc.calorie + (p.calorie || 0),
          proteine: acc.proteine + (p.proteine || 0),
          carboidrati: acc.carboidrati + (p.carboidrati || 0),
          grassi: acc.grassi + (p.grassi || 0),
        }),
        { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 }
      );
      return { data: r.data, ...totali, numeroPasti: r.pasti.length, pasti: r.pasti };
    })
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  const n = giorni.length;
  const medie = n
    ? {
        calorie: Math.round(giorni.reduce((s, g) => s + g.calorie, 0) / n),
        proteine: Math.round(giorni.reduce((s, g) => s + g.proteine, 0) / n),
        carboidrati: Math.round(giorni.reduce((s, g) => s + g.carboidrati, 0) / n),
        grassi: Math.round(giorni.reduce((s, g) => s + g.grassi, 0) / n),
      }
    : { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };

  return NextResponse.json({ giorni, medie, giorniRegistrati: n });
}
