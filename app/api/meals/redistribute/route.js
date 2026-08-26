import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    proteine: { type: Type.NUMBER, description: "grammi" },
    carboidrati: { type: Type.NUMBER, description: "grammi" },
    grassi: { type: Type.NUMBER, description: "grammi" },
  },
  required: ["proteine", "carboidrati", "grassi"],
};

export async function POST(request) {
  const { nome, calorie } = await request.json().catch(() => ({}));
  if (!nome || typeof calorie !== "number") {
    return NextResponse.json({ error: "nome o calorie mancanti" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY mancante" }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Pasto: "${nome}". Calorie totali corrette dall'utente: ${calorie} kcal.`,
      config: {
        systemInstruction:
          "Ricevi il nome di un pasto e un nuovo totale calorico corretto a mano dall'utente (la porzione stimata in precedenza era sbagliata). Restituisci grammi di proteine, carboidrati e grassi con una composizione plausibile per quel pasto, tali che 4*proteine + 4*carboidrati + 9*grassi sia il più vicino possibile al totale calorico dato.",
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const macro = JSON.parse(response.text);
    return NextResponse.json({ ...macro, stimato: true });
  } catch {
    return NextResponse.json({ error: "ridistribuzione non riuscita" }, { status: 502 });
  }
}
