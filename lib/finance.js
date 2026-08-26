import * as xlsx from "xlsx";
import { GoogleGenAI, Type } from "@google/genai";

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function leggiCartella(base64, mimeType) {
  const isCsv = mimeType.includes("csv");
  return isCsv
    ? xlsx.read(Buffer.from(base64, "base64").toString("utf-8"), { type: "string" })
    : xlsx.read(Buffer.from(base64, "base64"), { type: "buffer" });
}

// Cerca un foglio "a movimenti": righe Entrata/Uscita per categoria, con
// una colonna per ogni mese. È lo schema del modello "Budget personale"
// più diffuso — quando c'è, i totali si calcolano in JavaScript, non
// chiedendo al modello di sommare a mente 15 colonne per riga (Parte 5.5:
// "dove esiste una formula, la formula vince sul modello"). Verificato
// sulla build vera: il modello sbagliava la somma in due modi diversi su
// due esecuzioni consecutive, anche con numeri già puliti.
function trovaFoglioMovimenti(wb) {
  for (const nome of wb.SheetNames) {
    const righe = xlsx.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: "" });
    const headerIdx = righe.findIndex(
      (r) => r.includes("Tipo") && r.includes("Categoria") && MESI.some((m) => r.includes(m))
    );
    if (headerIdx === -1) continue;
    const header = righe[headerIdx];
    const dati = righe.slice(headerIdx + 1).filter((r) => r[header.indexOf("Tipo")] === "Entrata" || r[header.indexOf("Tipo")] === "Uscita");
    if (dati.length > 0) return { header, dati };
  }
  return null;
}

function estraiDaMovimenti({ header, dati }) {
  const idxTipo = header.indexOf("Tipo");
  const idxCategoria = header.indexOf("Categoria");
  const colonneMesi = MESI.map((mese) => ({ mese, idx: header.indexOf(mese) })).filter((m) => m.idx !== -1);

  // L'ultimo mese con almeno un valore numerico in qualunque riga.
  let colonnaAttiva = null;
  for (let i = colonneMesi.length - 1; i >= 0; i--) {
    const { idx } = colonneMesi[i];
    if (dati.some((r) => typeof r[idx] === "number")) {
      colonnaAttiva = colonneMesi[i];
      break;
    }
  }
  if (!colonnaAttiva) return null;

  const categorie = new Map(); // "tipo|categoria" -> totale
  let entrateTotali = 0;
  let usciteTotali = 0;

  for (const riga of dati) {
    const valore = riga[colonnaAttiva.idx];
    if (typeof valore !== "number") continue;
    const tipo = riga[idxTipo] === "Entrata" ? "entrata" : "uscita";
    const categoria = riga[idxCategoria] || "Senza categoria";
    if (tipo === "entrata") entrateTotali += valore;
    else usciteTotali += valore;

    const chiave = `${tipo}|${categoria}`;
    categorie.set(chiave, (categorie.get(chiave) || 0) + valore);
  }

  const arrotonda = (n) => Math.round(n * 100) / 100;

  return {
    mese_riferimento: colonnaAttiva.mese,
    valuta: "EUR",
    entrate_totali: arrotonda(entrateTotali),
    uscite_totali: arrotonda(usciteTotali),
    saldo: arrotonda(entrateTotali - usciteTotali),
    categorie: [...categorie.entries()].map(([chiave, totale]) => {
      const [tipo, nome] = chiave.split("|");
      return { nome, tipo, totale: arrotonda(totale) };
    }),
    note: "Totali calcolati direttamente dai numeri del foglio (nessuna somma a carico del modello).",
  };
}

// ============================================================
// Percorso di riserva: fogli che non hanno la forma "Movimenti"
// riconoscibile. Qui il modello resta necessario — il file può avere
// davvero qualunque struttura (Parte 5.8) — ma niente arithmetic pesante:
// gli si chiede la lettura, non la somma di decine di celle.
// ============================================================
function fileInGriglie(wb) {
  return wb.SheetNames.map((nome) => {
    const righe = xlsx.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: "" });
    const testo = righe
      .filter((riga) => riga.some((cella) => cella !== ""))
      .map((riga) => riga.map((cella) => (typeof cella === "number" ? String(cella) : cella)).join("\t"))
      .join("\n");
    return `--- Foglio: ${nome} ---\n${testo}`;
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

const SYSTEM_PROMPT = `Ricevi un foglio di calcolo personale di entrate e uscite, foglio per foglio, come griglie di testo. Estrai il quadro del mese più recente che ha dati compilati: entrate_totali, uscite_totali, saldo (entrate - uscite), e il totale per categoria.

Attenzione:
- Non contare due volte lo stesso importo se il file ha sia un foglio di riepilogo/dashboard sia un foglio di dettaglio movimenti: usa i totali del riepilogo SOLO se sono già calcolati (non vuoti); altrimenti calcola dal dettaglio.
- Un foglio con solo un elenco di categorie senza importi (una lista di opzioni) non è un totale: ignoralo.
- Controlla due volte ogni somma prima di rispondere: è la parte più facile da sbagliare.
- Se qualcosa è ambiguo, scrivilo nel campo note invece di inventare un numero.
- Rispondi solo con l'oggetto richiesto.`;

// Scarica il file direttamente da Google Drive/Sheets — l'indirizzo del
// file (condiviso come "chiunque abbia il link") funziona come una
// password, stesso principio dell'indirizzo iCal del calendario (Parte
// 5.2/5.8): niente account di servizio, solo un id da trattare con cura.
//
// Se il file caricato è stato convertito in un Google Sheet nativo (capita
// spesso quando si carica un .xlsx su Drive), l'indirizzo di download
// generico di Drive non basta: serve l'endpoint di esportazione dei
// fogli Google, che restituisce un vero .xlsx.
export async function scaricaDaGoogleDrive(fileId, tipo = "drive") {
  const url =
    tipo === "sheets"
      ? `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
      : `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Drive/Sheets non raggiungibile (${res.status})`);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("Google ha restituito una pagina invece del file — controlla che la condivisione sia \"chiunque abbia il link\"");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("base64");
}

export async function estraiFinanze(base64, mimeType) {
  const wb = leggiCartella(base64, mimeType);

  const movimenti = trovaFoglioMovimenti(wb);
  if (movimenti) {
    const risultato = estraiDaMovimenti(movimenti);
    if (risultato) return risultato;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY mancante");

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const response = await ai.models.generateContent({
    model,
    contents: fileInGriglie(wb),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      abortSignal: AbortSignal.timeout(50000),
    },
  });

  return JSON.parse(response.text);
}
