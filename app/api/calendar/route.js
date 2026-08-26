import { NextResponse } from "next/server";
import { getEventiCalendario } from "../../../lib/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// La cache vive sul server (Parte 5.2): questa intestazione vieta al
// browser di conservare la sua, che scade in modo diverso e imprevedibile.
export async function GET() {
  const eventi = await getEventiCalendario();
  return NextResponse.json(
    { eventi },
    { headers: { "Cache-Control": "no-store" } }
  );
}
