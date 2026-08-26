@AGENTS.md

# PersonalOS — regole di casa

Percorso: **Completo** (Supabase + Vercel + Telegram + OpenAI).

- Linguaggio: JavaScript, non TypeScript. Niente file `.ts`/`.tsx`.
- Tutte le letture e scritture dati passano da `lib/store.js`, sopra Supabase. Nessun componente o rotta tocca il database direttamente.
- Nessuna scheda/rotta chiama un modello (Claude o OpenAI) al caricamento di una pagina. Solo su: cattura, domanda, pulsante utente, cron.
- Il nome del modello Claude sta in `ANTHROPIC_MODEL` (env), mai scritto a mano nel codice — solo un valore predefinito di fallback.
- La data "di oggi" si calcola sempre con un'unica funzione che usa `USER_TIMEZONE`, mai `new Date()` nudo lato server.
- Le destinazioni di cattura sono sette, validate contro un elenco unico: task, persone, finanze, nutrizione, salute, obiettivi, memoria.
- Gli **obiettivi** (scheda Obiettivi) si salvano nel log giornaliero su una riga con data fissa convenzionale `2000-01-01`, che non scade mai. È un trucco deliberato per riusare i log giornalieri senza una tabella dedicata — non "correggerlo".
- Il cancello a password (middleware) protegge tutto tranne `/login`, `/api/auth/*`, `/api/telegram/webhook`, `/api/cron/*`. Ogni rotta esclusa ha una sua serratura (segreto webhook, Bearer cron).
- Un commit a ogni pezzo funzionante (scheda, rotta) finito.
