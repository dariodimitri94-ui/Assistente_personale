import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { embed } from "../../../lib/embeddings";
import { cercaMemoriaPerSomiglianza, getProfilo } from "../../../lib/store";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Rispondi a domande su un sistema di note personali. Ricevi il profilo dell'utente e un elenco di voci di memoria (le più vicine alla domanda per significato), ognuna con la sua provenienza.

Regole ferree:
- Rispondi in italiano, in modo diretto e breve.
- Cita sempre da quale voce arriva ogni affermazione che fai (es. "da una cattura del 12/03: ...").
- Se l'informazione richiesta non è tra i dati che hai ricevuto, dillo chiaramente ("non ho informazioni su questo") invece di inventare o dedurre.`;

export async function POST(request) {
  const { domanda } = await request.json().catch(() => ({}));
  if (!domanda) {
    return NextResponse.json({ error: "domanda mancante" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ risposta: "Il modello non è configurato (manca GEMINI_API_KEY)." });
  }

  const [profilo, embedding] = await Promise.all([getProfilo(), embed(domanda)]);
  const voci = embedding ? await cercaMemoriaPerSomiglianza(embedding, 20) : [];

  const contesto = {
    profilo: profilo ? { nome: profilo.nome, ruolo: profilo.ruolo, citta: profilo.citta } : null,
    memoria: voci.map((v) => ({ testo: v.testo, provenienza: v.provenienza, data: v.created_at })),
  };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Domanda: ${domanda}\n\nDati disponibili:\n${JSON.stringify(contesto, null, 2)}`,
      config: { systemInstruction: SYSTEM_PROMPT },
    });
    return NextResponse.json({ risposta: response.text, fonti: voci.length });
  } catch {
    return NextResponse.json({ risposta: "Non sono riuscito a rispondere in questo momento. Riprova." });
  }
}
