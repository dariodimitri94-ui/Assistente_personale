import { NextResponse } from "next/server";
import { processCapture } from "../../../../lib/capture";
import { updateTask } from "../../../../lib/store";
import { downloadTelegramFile, sendMessage, answerCallbackQuery, editMessageReplyMarkup } from "../../../../lib/telegram";
import { transcribeAudio } from "../../../../lib/transcribe";
import { timingSafeEqualStr } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

const DESTINAZIONE_LABEL = {
  task: "Task",
  persone: "Persone",
  finanze: "Finanze",
  nutrizione: "Nutrizione",
  salute: "Salute",
  obiettivi: "Obiettivi",
  memoria: "Memoria",
};

const URGENZA_LABEL = { oggi: "Oggi", settimana: "Settimana", piu_avanti: "Più avanti" };

function correzioneUrgenzaKeyboard(taskId) {
  return {
    inline_keyboard: [
      Object.entries(URGENZA_LABEL).map(([valore, label]) => ({
        text: label,
        callback_data: `urg:${taskId}:${valore}`,
      })),
    ],
  };
}

async function gestisciTesto(chatId, testo) {
  const risultato = await processCapture(testo, "telegram");
  const destLabel = DESTINAZIONE_LABEL[risultato.destinazione] || risultato.destinazione;
  const conferma = `Archiviato in ${destLabel}${risultato.urgenza ? ` (${URGENZA_LABEL[risultato.urgenza] || risultato.urgenza})` : ""}`;

  const tastiera = risultato.taskId ? correzioneUrgenzaKeyboard(risultato.taskId) : undefined;
  await sendMessage(chatId, conferma, tastiera);
}

async function gestisciMessaggio(message) {
  const chatId = message.chat.id;

  // I comandi di Telegram (/start, /help, ecc.) non sono catture: il bot
  // non ha comandi propri, ma non deve archiviarli come se lo fossero.
  if (message.text?.startsWith("/")) {
    await sendMessage(chatId, "Scrivimi o mandami una nota vocale: archivio tutto da solo.");
    return;
  }

  if (message.voice) {
    const base64 = await downloadTelegramFile(message.voice.file_id);
    const testo = await transcribeAudio(base64, "audio/ogg");
    if (!testo) {
      await sendMessage(chatId, "Non sono riuscito a trascrivere la nota vocale.");
      return;
    }
    await gestisciTesto(chatId, testo);
    return;
  }

  if (message.text) {
    await gestisciTesto(chatId, message.text);
  }
}

async function gestisciCallback(callbackQuery) {
  // Il mittente di un callback_query sta in callback_query.from.id, non
  // in message.from.id — un dettaglio facile da sbagliare (Parte 4 / A12).
  const [, taskId, nuovaUrgenza] = (callbackQuery.data || "").split(":");
  if (taskId && nuovaUrgenza) {
    await updateTask(taskId, { urgenza: nuovaUrgenza });
    await editMessageReplyMarkup(callbackQuery.message.chat.id, callbackQuery.message.message_id, { inline_keyboard: [] });
  }
  // Si risponde sempre, altrimenti il pulsante resta a girare sul telefono.
  await answerCallbackQuery(callbackQuery.id, nuovaUrgenza ? `Impostato: ${URGENZA_LABEL[nuovaUrgenza]}` : "");
}

export async function POST(request) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secretHeader || !timingSafeEqualStr(secretHeader, process.env.TELEGRAM_WEBHOOK_SECRET || "")) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const update = await request.json().catch(() => ({}));
  const mittente = update.callback_query?.from?.id ?? update.message?.from?.id;

  // Il bot ignora chiunque non sia il proprietario — un bot Telegram è
  // pubblico, questo controllo è l'unica cosa che lo rende privato.
  if (String(mittente) !== String(process.env.TELEGRAM_USER_ID)) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) {
      await gestisciCallback(update.callback_query);
    } else if (update.message) {
      await gestisciMessaggio(update.message);
    }
  } catch (e) {
    // Rispondi sempre 200: un errore qui non deve far ritentare Telegram,
    // altrimenti la stessa nota si archivia più volte (Parte 8).
    console.error("errore webhook telegram:", e);
  }

  return NextResponse.json({ ok: true });
}
