import { NextResponse } from "next/server";
import { updateSaluteGiorno } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

// Riceve dati da Apple Salute via Comandi Rapidi (Parte 9 — integrazione
// gratuita, senza app di terze parti a pagamento). Accetta JSON o Modulo,
// stesso motivo di /api/capture: Comandi Rapidi va più d'accordo col Modulo.
async function leggiCampi(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  return Object.fromEntries(form.entries());
}

function numeroOppureNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request) {
  const campi = await leggiCampi(request);
  const data = campi.data || today();

  const patch = {};
  const passi = numeroOppureNull(campi.passi);
  const calorieAttive = numeroOppureNull(campi.calorie_attive);
  const peso = numeroOppureNull(campi.peso);

  if (passi !== null) patch.passi = passi;
  if (calorieAttive !== null) patch.calorie_attive = calorieAttive;
  if (peso !== null) patch.peso = peso;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nessun dato valido ricevuto" }, { status: 400 });
  }

  const log = await updateSaluteGiorno(data, patch);
  return NextResponse.json({ data, salute: log.salute });
}
