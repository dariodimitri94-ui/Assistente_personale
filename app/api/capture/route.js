import { NextResponse } from "next/server";
import { processCapture } from "../../../lib/capture";

export const dynamic = "force-dynamic";

// Accetta sia JSON (dashboard, script) sia un modulo (la Scorciatoia iOS:
// l'editor JSON di Comandi Rapidi non inserisce bene le variabili nei
// campi annidati, mentre il modo "Modulo" sì).
async function leggiTesto(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return body.testo;
  }
  const form = await request.formData().catch(() => null);
  return form?.get("testo");
}

export async function POST(request) {
  const testo = await leggiTesto(request);
  if (!testo || typeof testo !== "string" || !testo.trim()) {
    return NextResponse.json({ error: "testo mancante" }, { status: 400 });
  }

  const { destinazione, urgenza, via, catturaId } = await processCapture(testo);
  return NextResponse.json({ destinazione, urgenza, via, id: catturaId });
}
