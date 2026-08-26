import { GoogleGenAI } from "@google/genai";

// Dimensione scelta per combaciare con la colonna vector(1536) della
// migrazione (Parte 6 / A15). gemini-embedding-001 supporta 128-3072 via
// Matryoshka Representation Learning: 1536 è uno dei tagli raccomandati.
const OUTPUT_DIMENSIONALITY = 1536;

export async function embed(testo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    const response = await ai.models.embedContent({
      model,
      contents: testo,
      config: { outputDimensionality: OUTPUT_DIMENSIONALITY, abortSignal: AbortSignal.timeout(8000) },
    });
    return response.embeddings?.[0]?.values || null;
  } catch {
    return null;
  }
}
