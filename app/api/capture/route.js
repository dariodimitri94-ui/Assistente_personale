import { NextResponse } from "next/server";
import { classify } from "../../../lib/classify";
import { addCattura, addMemoria, addTask, findOrCreatePersona } from "../../../lib/store";

export const dynamic = "force-dynamic";

// Fasce di urgenza del CRM: il classificatore assegna solo oggi | settimana
// | piu_avanti — "in_ritardo" ci si finisce col tempo, non ci si nasce.
const URGENZA_TO_FASCIA = {
  oggi: "oggi",
  settimana: "settimana",
  piu_avanti: "piu_avanti",
};

export async function POST(request) {
  const { testo } = await request.json().catch(() => ({}));
  if (!testo || typeof testo !== "string" || !testo.trim()) {
    return NextResponse.json({ error: "testo mancante" }, { status: 400 });
  }

  const risultato = await classify(testo.trim());
  const { destinazione, titolo, persona, urgenza, via } = risultato;

  let smistatoIn = null;

  if (destinazione === "task" || destinazione === "persone") {
    const personaRow = persona ? await findOrCreatePersona(persona) : null;
    const nuovoTask = await addTask({
      titolo: titolo || testo.trim(),
      nota: testo.trim(),
      urgenza: URGENZA_TO_FASCIA[urgenza] || "oggi",
      persona_id: personaRow?.id || null,
      posizione: 0,
    });
    smistatoIn = nuovoTask.id;
  }
  // finanze, nutrizione, salute, obiettivi: le schede dedicate (Parte 5)
  // leggeranno dalle catture/memoria finché non avranno una loro rotta di
  // scrittura specifica — costruita scheda per scheda più avanti.

  const cattura = await addCattura({
    testo_grezzo: testo.trim(),
    destinazione,
    smistato_in: smistatoIn,
    via_classificazione: via,
    urgenza,
  });

  await addMemoria({
    testo: testo.trim(),
    provenienza: `cattura:${cattura.id}`,
  });

  return NextResponse.json({ destinazione, urgenza, via, id: cattura.id });
}
