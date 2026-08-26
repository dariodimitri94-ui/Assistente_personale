import Anthropic from "@anthropic-ai/sdk";

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

Urgenza possibile, esattamente una tra: ${URGENZE.join(", ")}. Se non è chiaro, usa "oggi".

Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, con questa forma esatta:
{"destinazione": "...", "titolo": "riformulazione breve della frase", "persona": "nome della persona o null", "urgenza": "..."}`;

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

function estraiJson(testo) {
  const start = testo.indexOf("{");
  const end = testo.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(testo.slice(start, end + 1));
  } catch {
    return null;
  }
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return classificaConRegole(testo);
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

    const response = await client.messages.create({
      model,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      // Smistare una frase non migliora pensandoci su: niente ragionamento
      // esteso qui, l'attesa deve restare sotto il secondo (Parte 1.4 / 4).
      output_config: { effort: "low" },
      messages: [{ role: "user", content: testo }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const parsed = textBlock ? estraiJson(textBlock.text) : null;
    const validato = validaRisultato(parsed);

    if (!validato) {
      return classificaConRegole(testo);
    }
    return { ...validato, via: "modello" };
  } catch {
    return classificaConRegole(testo);
  }
}
