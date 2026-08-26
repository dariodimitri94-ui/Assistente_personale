import { classify } from "./classify";
import { embed } from "./embeddings";
import { addCattura, addMemoria, addTask, findOrCreatePersona } from "./store";

// La pipeline unica di cattura: usata dalla rotta della dashboard (Parte 4)
// e dal webhook Telegram (Parte 4 / A12), così un testo si comporta allo
// stesso identico modo da qualunque punto entri nel sistema.
export async function processCapture(testoGrezzo) {
  const testo = testoGrezzo.trim();
  const risultato = await classify(testo);
  const { destinazione, titolo, persona, urgenza, via } = risultato;

  let smistatoIn = null;

  if (destinazione === "task" || destinazione === "persone") {
    const personaRow = persona ? await findOrCreatePersona(persona) : null;
    const nuovoTask = await addTask({
      titolo: titolo || testo,
      nota: testo,
      urgenza: urgenza === "oggi" ? "oggi" : urgenza === "settimana" ? "settimana" : "piu_avanti",
      persona_id: personaRow?.id || null,
      posizione: 0,
    });
    smistatoIn = nuovoTask.id;
  }

  const cattura = await addCattura({
    testo_grezzo: testo,
    destinazione,
    smistato_in: smistatoIn,
    via_classificazione: via,
    urgenza,
  });

  const embedding = await embed(testo);
  await addMemoria({
    testo,
    provenienza: `cattura:${cattura.id}`,
    embedding,
  });

  return { destinazione, urgenza, via, catturaId: cattura.id, taskId: smistatoIn };
}
