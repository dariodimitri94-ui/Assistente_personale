import * as xlsx from "xlsx";
import { GoogleGenAI, Type } from "@google/genai";

// Trasforma ogni foglio del file in una griglia di testo — il file non ha
// uno schema, ha una storia, e il modello lo legge meglio come lo
// leggerebbe una persona (Parte 5.8).
function fileInGriglie(base64, mimeType) {
  const isCsv = mimeType.includes("csv");
  const wb = isCsv
    ? xlsx.read(Buffer.from(base64, "base64").toString("utf-8"), { type: "string" })
    : xlsx.read(Buffer.from(base64, "base64"), { type: "buffer" });

  return wb.SheetNames.map((nome) => {
    const sheet = wb.Sheets[nome];
    const csv = xlsx.utils.sheet_to_csv(sheet, { blankrows: false });
    return `--- Foglio: ${nome} ---\n${csv}`;
  }).join("\n\n");
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mese_riferimento: { type: Type.STRING, description: "es. \"Agosto 2026\", il mese più recente con dati" },
    valuta: { type: Type.STRING },
    entrate_totali: { type: Type.NUMBER },
    uscite_totali: { type: Type.NUMBER },
    saldo: { type: Type.NUMBER },
    categorie: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          totale: { type: Type.NUMBER },
          tipo: { type: Type.STRING, enum: ["entrata", "uscita"] },
        },
        required: ["nome", "totale", "tipo"],
      },
    },
    note: { type: Type.STRING, description: "ambiguità trovate, o stringa vuota" },
  },
  required: ["mese_riferimento", "valuta", "entrate_totali", "uscite_totali", "saldo", "categorie", "note"],
};

const SYSTEM_PROMPT = `Ricevi un foglio di calcolo personale di entrate e uscite, foglio per foglio, come griglie di testo. Il foglio è un tracciamento mensile: righe di entrata/uscita per categoria, con una colonna per ogni mese dell'anno.

Estrai il quadro del mese più recente che ha dati compilati:
- entrate_totali: somma di tutte le righe "Entrata" per quel mese
- uscite_totali: somma di tutte le righe "Uscita" per quel mese
- saldo: entrate_totali - uscite_totali
- categorie: per ogni categoria di spesa/entrata, il totale di quel mese (tipo "entrata" o "uscita")

Attenzione:
- Non contare due volte lo stesso importo se il file ha sia un foglio di riepilogo/dashboard sia un foglio di dettaglio movimenti: usa i totali del riepilogo SOLO se sono già calcolati (non vuoti); altrimenti calcola tu dal dettaglio.
- Un foglio con solo un elenco di categorie senza importi (una lista di opzioni) non è un totale: ignoralo.
- Se qualcosa è ambiguo (celle vuote, formule non calcolate, categorie duplicate), scrivilo nel campo note invece di inventare un numero.
- Rispondi solo con l'oggetto richiesto.`;

export async function estraiFinanze(base64, mimeType) {
  const griglie = fileInGriglie(base64, mimeType);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY mancante");

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
  const response = await ai.models.generateContent({
    model,
    contents: griglie,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      abortSignal: AbortSignal.timeout(25000),
    },
  });

  return JSON.parse(response.text);
}
