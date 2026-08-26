import { GoogleGenAI, Type } from "@google/genai";

// Le sette destinazioni di riferimento (Parte 4). Cambiale pure, ma in
// questo unico posto: tutto il resto del sistema valida contro questo elenco.
export const DESTINAZIONI = ["task", "persone", "finanze", "nutrizione", "salute", "obiettivi", "memoria"];

// "in_ritardo" non è mai un valore in ingresso: in ritardo ci si finisce,
// non ci si nasce (lo assegna il tempo che passa, non il classificatore).
const URGENZE = ["oggi", "settimana", "piu_avanti"];

const SYSTEM_PROMPT = `Sei il classificatore di un sistema di note personali. Ricevi una frase e decidi dove va archiviata.

Destinazioni possibili, esattamente queste: ${DESTINAZIONI.join(", ")}.
- task: un "da fare" generico, senza una casa più precisa.
- persone: qualcosa legato a una persona specifica (richiamare, rispondere, ecc).
- finanze: spese, entrate, pagamenti.
- nutrizione: un pasto o un alimento consumato.
- salute: misurazioni fisiche, sintomi, allenamento.
- obiettivi: una promessa o un traguardo, non un'azione singola.
- memoria: un pensiero, una riflessione, un'informazione da ricordare che non rientra altrove.

Urgenza possibile, esattamente una tra: ${URGENZE.join(", ")}. Se non è chiaro, usa "oggi".`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    destinazione: { type: Type.STRING, enum: DESTINAZIONI },
    titolo: { type: Type.STRING, description: "riformulazione breve della frase" },
    persona: { type: Type.STRING, nullable: true, description: "nome della persona citata, o null" },
    urgenza: { type: Type.STRING, enum: URGENZE },
  },
  required: ["destinazione", "titolo", "urgenza"],
};

function classificaConRegole(testo) {
  const t = testo.toLowerCase();
  let destinazione = "task";
  if (/\beuro\b|\bfattura\b|\bpagat|\bspes[ae]\b|€/.test(t)) destinazione = "finanze";
  else if (/\bchiamare\b|\brispondere\b|\brichiamare\b/.test(t)) destinazione = "persone";
  else if (/\bmangiat|\bpranz|\bcolazione|\bcena\b/.test(t)) destinazione = "nutrizione";
  else if (/\bkg\b|\ballenament|\bpeso\b|\bdolore\b/.test(t)) destinazione = "salute";
  else if (/\bobiettiv|\bpromess/.test(t)) destinazione = "obiettivi";
  else if (/\bricorda|\bpensiero\b|\briflession/.test(t)) destinazione = "memoria";

  return {
    destinazione,
    titolo: testo.slice(0, 120),
    persona: null,
    urgenza: "oggi",
    via: "regole",
  };
}

function validaRisultato(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!DESTINAZIONI.includes(obj.destinazione)) return null;
  const urgenza = URGENZE.includes(obj.urgenza) ? obj.urgenza : "oggi";
  return {
    destinazione: obj.destinazione,
    titolo: typeof obj.titolo === "string" && obj.titolo.trim() ? obj.titolo.trim() : null,
    persona: typeof obj.persona === "string" && obj.persona.trim() ? obj.persona.trim() : null,
    urgenza,
  };
}

export async function classify(testo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return classificaConRegole(testo);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";

    const response = await ai.models.generateContent({
      model,
      contents: testo,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // Smistare una frase non migliora "pensandoci su": niente
        // ragionamento esteso qui, l'attesa deve restare sotto il secondo.
        thinkingConfig: { thinkingBudget: 0 },
        // Se Gemini è lento, arrenditi in fretta: meglio smistare con le
        // regole subito che restare appesi fino al limite del server.
        abortSignal: AbortSignal.timeout(8000),
      },
    });

    const parsed = JSON.parse(response.text);
    const validato = validaRisultato(parsed);

    if (!validato) {
      return classificaConRegole(testo);
    }
    return { ...validato, via: "modello" };
  } catch {
    return classificaConRegole(testo);
  }
}
