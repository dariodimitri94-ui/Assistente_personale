import { GoogleGenAI } from "@google/genai";

// Trascrizione delle note vocali via Gemini (multimodale), al posto di
// Whisper di OpenAI — scelta deliberata di questo progetto (vedi CLAUDE.md).
export async function transcribeAudio(base64Audio, mimeType = "audio/ogg") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const response = await ai.models.generateContent({
      model,
      contents: [
        "Trascrivi esattamente questo audio in italiano. Rispondi solo con il testo trascritto, senza commenti.",
        { inlineData: { mimeType, data: base64Audio } },
      ],
      config: { thinkingConfig: { thinkingBudget: 0 }, abortSignal: AbortSignal.timeout(15000) },
    });
    return (response.text || "").trim();
  } catch {
    return "";
  }
}
