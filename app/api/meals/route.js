import { NextResponse } from "next/server";
import { addPasto, getLogGiornaliero } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const oggi = today();
  const log = await getLogGiornaliero(oggi);
  return NextResponse.json({ oggi, pasti: log?.pasti || [] });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { nome, calorie, proteine, carboidrati, grassi, stimato } = body;
  if (!nome) {
    return NextResponse.json({ error: "nome mancante" }, { status: 400 });
  }
  const oggi = today();
  const orario = new Intl.DateTimeFormat("it-IT", {
    timeZone: process.env.USER_TIMEZONE || "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const pasto = await addPasto(oggi, {
    orario,
    nome,
    calorie: calorie || 0,
    proteine: proteine || 0,
    carboidrati: carboidrati || 0,
    grassi: grassi || 0,
    stimato: !!stimato,
  });
  return NextResponse.json({ pasto });
}
