import { config } from "dotenv";
config({ path: ".env.local" });
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const buffer = fs.readFileSync("C:/Users/dario/Desktop/documenti lavoro/Budget personale semplice1.xlsx");
const base64 = buffer.toString("base64");

const xlsx = await import("xlsx");
const wb = xlsx.read(buffer, { type: "buffer" });
const griglie = wb.SheetNames.map((nome) => {
  const csv = xlsx.utils.sheet_to_csv(wb.Sheets[nome], { blankrows: false });
  return `--- Foglio: ${nome} ---\n${csv}`;
}).join("\n\n");
console.log("dimensione prompt (caratteri):", griglie.length);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const t0 = Date.now();
try {
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
    contents: griglie,
    config: {
      systemInstruction: "Estrai in JSON: entrate_totali, uscite_totali, saldo del mese più recente con dati.",
      responseMimeType: "application/json",
    },
  });
  console.log("tempo:", (Date.now() - t0) / 1000, "s");
  console.log(response.text);
} catch (e) {
  console.log("ERRORE dopo", (Date.now() - t0) / 1000, "s:", e.message);
}
