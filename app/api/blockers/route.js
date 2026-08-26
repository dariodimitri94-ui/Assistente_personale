import { NextResponse } from "next/server";
import { getTask } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

function giorniDa(dataISO, oggiISO) {
  const a = new Date(`${dataISO}T00:00:00Z`);
  const b = new Date(`${oggiISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// "Bloccato" (Home): filtro sul CRM per anzianità, nessun dato nuovo
// (Parte 5, "Le superfici che restano").
export async function GET() {
  const oggi = today();
  const tasks = await getTask({ oggiISO: oggi });

  const bloccati = tasks
    .filter((t) => t.urgenza_effettiva === "in_ritardo")
    .map((t) => ({
      persona: t.persone?.nome || "—",
      titolo: t.titolo,
      giorni: giorniDa(t.created_at.slice(0, 10), oggi),
    }))
    .sort((a, b) => b.giorni - a.giorni)
    .slice(0, 6);

  return NextResponse.json({ bloccati });
}
