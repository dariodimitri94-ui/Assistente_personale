const API_BASE = "https://api.telegram.org";

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN mancante");
  return token;
}

export async function sendMessage(chatId, text, replyMarkup) {
  const res = await fetch(`${API_BASE}/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
  });
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId, text) {
  await fetch(`${API_BASE}/bot${botToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  await fetch(`${API_BASE}/bot${botToken()}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
  });
}

// Scarica un file vocale di Telegram (arriva come OGG/Opus) e restituisce
// i byte grezzi in base64, pronti per un content multimodale.
export async function downloadTelegramFile(fileId) {
  const infoRes = await fetch(`${API_BASE}/bot${botToken()}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  const filePath = info.result?.file_path;
  if (!filePath) throw new Error("file Telegram non trovato");

  const fileRes = await fetch(`${API_BASE}/file/bot${botToken()}/${filePath}`);
  const buffer = await fileRes.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
