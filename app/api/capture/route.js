import { NextResponse } from "next/server";
import { processCapture } from "../../../lib/capture";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Accetta il testo da tre posti diversi, perché i client che chiamano
// questa rotta non sono tutti uguali: JSON (dashboard, script), un modulo
// (alcune versioni di Comandi Rapidi inseriscono le variabili meglio così),
// o direttamente come parametro nell'URL (?testo=...) — l'unico punto
// dove Comandi Rapidi inserisce la variabile in modo affidabile su alcuni
// telefoni, perché è lo stesso campo che l'app popola già di default.
async function leggiTesto(request) {
  const dallaQuery = request.nextUrl.searchParams.get("testo");
  if (dallaQuery) return dallaQuery;

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
