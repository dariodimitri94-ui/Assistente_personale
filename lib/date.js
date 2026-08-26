// Unica funzione per rispondere a "che giorno è oggi" — usa sempre
// USER_TIMEZONE, mai l'orologio nudo del server (che su Vercel è UTC).
// Chiamata da qui ovunque serva una data: abitudini, pasti, log, obiettivi.
// Vedi Parte 5.3 / Regola 5 della guida.
export function today() {
  const timeZone = process.env.USER_TIMEZONE || "Europe/Rome";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // "en-CA" produce direttamente YYYY-MM-DD
}

// Data fissa convenzionale su cui vivono gli Obiettivi (Parte 5.7): non
// scade mai, non si aggancia a nessun cambio di settimana o di mese.
export const OBIETTIVI_SENTINEL_DATE = "2000-01-01";
