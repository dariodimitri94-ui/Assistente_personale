@AGENTS.md

# PersonalOS — regole di casa

Percorso: **Completo** (Supabase + Vercel + Telegram + Google Gemini).

Scelta deliberata, diversa dalla guida originale: **niente Anthropic API né OpenAI**, tutto il lato modello (smistamento, risposte, briefing, nutrizione, trascrizione vocale, embedding) passa da **Google Gemini**, piano gratuito. Un solo account, zero chiavi a pagamento. Vedi `lib/classify.js` per il pattern di chiamata (`@google/genai`, `responseMimeType: "application/json"` + `responseSchema`, `thinkingConfig: { thinkingBudget: 0 }` per la bassa latenza sullo smistamento).

- Linguaggio: JavaScript, non TypeScript. Niente file `.ts`/`.tsx`.
- Tutte le letture e scritture dati passano da `lib/store.js`, sopra Supabase. Nessun componente o rotta tocca il database direttamente.
- Nessuna scheda/rotta chiama un modello (Gemini) al caricamento di una pagina. Solo su: cattura, domanda, pulsante utente, cron.
- Il nome del modello sta in `GEMINI_MODEL` (env, default `gemini-3.7-flash`), mai scritto a mano nel codice. L'embedding in `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`, `outputDimensionality: 1536` per combaciare con la colonna `vector(1536)` della migrazione).
- La data "di oggi" si calcola sempre con un'unica funzione che usa `USER_TIMEZONE`, mai `new Date()` nudo lato server.
- Le destinazioni di cattura sono sette, validate contro un elenco unico: task, persone, finanze, nutrizione, salute, obiettivi, memoria.
- Gli **obiettivi** (scheda Obiettivi) si salvano nel log giornaliero su una riga con data fissa convenzionale `2000-01-01`, che non scade mai. È un trucco deliberato per riusare i log giornalieri senza una tabella dedicata — non "correggerlo".
- Il cancello a password (middleware) protegge tutto tranne `/login`, `/api/auth/*`, `/api/telegram/webhook`, `/api/cron/*`. Ogni rotta esclusa ha una sua serratura (segreto webhook, Bearer cron).
- Un commit a ogni pezzo funzionante (scheda, rotta) finito.
