import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getObiettivi, getRegistroEvento, getTask, addRegistro } from "../../../../lib/store";
import { sendMessage } from "../../../../lib/telegram";
import { timingSafeEqualStr } from "../../../../lib/auth";
import { today } from "../../../../lib/date";

export const dynamic = "force-dynamic";

// Chiamato da vercel.json con schedule "0 5 * * *" — l'orario è SEMPRE UTC:
// sono le 6 del mattino in Italia d'inverno, le 7 d'estate. Quando cambia
// l'ora legale, aggiorna quella cifra lì, non qui.

export async function GET(request) {
  return handle(request);
}
export async function POST(request) {
  return handle(request);
}

async function handle(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqualStr(token, process.env.CRON_SECRET || "")) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const oggi = today();

  // Idempotente: se il briefing di oggi è già stato inviato, esce subito
  // (Parte 7.5) — senza questo controllo un secondo trigger duplica il messaggio.
  const giaInviato = await getRegistroEvento("cron.briefing_inviato", { data: oggi });
  if (giaInviato) {
    return NextResponse.json({ ok: true, skip: "già inviato oggi" });
  }

  const [tasks, obiettivi] = await Promise.all([getTask({ oggiISO: oggi }), getObiettivi()]);

  const taskOggi = tasks.filter((t) => t.urgenza_effettiva === "oggi");
  const taskInRitardo = tasks.filter((t) => t.urgenza_effettiva === "in_ritardo");

  const dati = {
    task_di_oggi: taskOggi.map((t) => t.titolo),
    slittati_da_ieri: taskInRitardo.map((t) => t.titolo),
    obiettivi_settimana: (obiettivi.settimana || []).filter((o) => !o.fatto).map((o) => o.label),
  };

  let messaggio = `Buongiorno. Oggi: ${dati.task_di_oggi.length} task, ${dati.slittati_da_ieri.length} in ritardo.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
      const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify(dati),
        config: {
          systemInstruction:
            "Scrivi un briefing mattutino in italiano, massimo 10 righe, senza convenevoli. Ricevi task di oggi, task slittati da ieri, obiettivi della settimana ancora aperti. Se una lista è vuota, dillo in una parola invece di ometterla.",
        },
      });
      if (response.text?.trim()) messaggio = response.text.trim();
    } catch {
      // in silenzio: resta il messaggio minimo costruito sopra
    }
  }

  await sendMessage(process.env.TELEGRAM_USER_ID, messaggio);
  await addRegistro("cron.briefing_inviato", { data: oggi });

  return NextResponse.json({ ok: true, inviato: true, riepilogo: dati });
}
