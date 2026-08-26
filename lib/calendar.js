import ICAL from "ical.js";

// Cache in memoria: il feed va rigenerato con calma da Google/iCloud, non
// serve riscaricarlo a ogni occhiata (Parte 5.2). È per-istanza, non una
// garanzia — su Vercel le istanze nascono e muoiono tra una richiesta e
// l'altra, ma la finestra corta regge comunque.
let cache = null; // { scadenza, eventi }
const DURATA_CACHE_MS = 5 * 60 * 1000;
const GIORNI_ESPANSIONE = 14;

const FONTI = [
  { nome: "Lavoro", url: process.env.CALENDAR_ICAL_URL_LAVORO },
  { nome: "Personale", url: process.env.CALENDAR_ICAL_URL_PERSONALE },
].filter((f) => f.url);

async function scaricaEEspandi(fonte) {
  const res = await fetch(fonte.url);
  if (!res.ok) throw new Error(`feed ${fonte.nome} non raggiungibile`);
  const testo = await res.text();

  const jcal = ICAL.parse(testo);
  const comp = new ICAL.Component(jcal);
  const veventi = comp.getAllSubcomponents("vevent");

  const inizio = ICAL.Time.now();
  const fine = inizio.clone();
  fine.adjust(GIORNI_ESPANSIONE, 0, 0, 0);

  const eventi = [];
  for (const vevent of veventi) {
    const evento = new ICAL.Event(vevent);
    const titolo = evento.summary || "(senza titolo)";

    if (evento.isRecurring()) {
      const iterator = evento.iterator();
      let next;
      // eslint-disable-next-line no-cond-assign
      while ((next = iterator.next())) {
        if (next.compare(fine) > 0) break;
        if (next.compare(inizio) < 0) continue;
        const dettaglio = evento.getOccurrenceDetails(next);
        eventi.push({
          titolo,
          inizio: dettaglio.startDate.toJSDate().toISOString(),
          fine: dettaglio.endDate.toJSDate().toISOString(),
          fonte: fonte.nome,
        });
      }
    } else {
      const inizioEvento = evento.startDate.toJSDate();
      const fineEvento = evento.endDate.toJSDate();
      if (inizioEvento <= fine.toJSDate() && fineEvento >= inizio.toJSDate()) {
        eventi.push({
          titolo,
          inizio: inizioEvento.toISOString(),
          fine: fineEvento.toISOString(),
          fonte: fonte.nome,
        });
      }
    }
  }
  return eventi;
}

export async function getEventiCalendario() {
  if (cache && cache.scadenza > Date.now()) {
    return cache.eventi;
  }

  const risultati = await Promise.allSettled(FONTI.map(scaricaEEspandi));
  const eventi = risultati.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  eventi.sort((a, b) => new Date(a.inizio) - new Date(b.inizio));

  cache = { scadenza: Date.now() + DURATA_CACHE_MS, eventi };
  return eventi;
}
