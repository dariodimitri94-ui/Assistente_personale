import { NextResponse } from "next/server";
import { getLogGiornaliero, getLogGiornalieriIntervallo } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

function addDays(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Andamento fisico (card Home): oggi da Apple Salute + storico peso 30gg.
export async function GET() {
  const oggi = today();
  const [logOggi, rows] = await Promise.all([
    getLogGiornaliero(oggi),
    getLogGiornalieriIntervallo(addDays(oggi, -29), oggi),
  ]);

  const trendPeso = rows
    .filter((r) => typeof r.salute?.peso === "number")
    .map((r) => ({ data: r.data, peso: r.salute.peso }))
    .sort((a, b) => (a.data < b.data ? -1 : 1));

  return NextResponse.json({
    oggi: logOggi?.salute || {},
    trendPeso,
  });
}
