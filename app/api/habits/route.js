import { NextResponse } from "next/server";
import { getLogGiornaliero, getLogGiornalieriIntervallo, updateAbitudineGiorno } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

function addDays(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const oggi = today();
  const [logOggi, ultimiTrenta] = await Promise.all([
    getLogGiornaliero(oggi),
    getLogGiornalieriIntervallo(addDays(oggi, -29), oggi),
  ]);

  return NextResponse.json({
    oggi,
    abitudini: logOggi?.abitudini || {},
    ultimiTrenta: ultimiTrenta.map((r) => ({ data: r.data, abitudini: r.abitudini })),
  });
}

export async function PATCH(request) {
  const { habitId, value } = await request.json().catch(() => ({}));
  if (!habitId) {
    return NextResponse.json({ error: "habitId mancante" }, { status: 400 });
  }
  const oggi = today();
  const log = await updateAbitudineGiorno(oggi, habitId, value);
  return NextResponse.json({ oggi, abitudini: log.abitudini });
}
