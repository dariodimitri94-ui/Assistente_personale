import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    calorie: { type: Type.NUMBER },
    proteine: { type: Type.NUMBER, description: "grammi" },
    carboidrati: { type: Type.NUMBER, description: "grammi" },
    grassi: { type: Type.NUMBER, description: "grammi" },
  },
  required: ["calorie", "proteine", "carboidrati", "grassi"],
};

export async function POST(request) {
  const { descrizione } = await request.json().catch(() => ({}));
  if (!descrizione) {
    return NextResponse.json({ error: "descrizione mancante" }, { status: 400 });
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
      contents: descrizione,
      config: {
        systemInstruction:
          "Stimi calorie e macronutrienti (grammi) di un pasto descritto in italiano. Rispondi con una stima plausibile anche se la descrizione è vaga.",
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: AbortSignal.timeout(8000),
      },
    });
    const stima = JSON.parse(response.text);
    return NextResponse.json({ ...stima, stimato: true });
  } catch (e) {
    return NextResponse.json({ error: "stima non riuscita" }, { status: 502 });
  }
}
