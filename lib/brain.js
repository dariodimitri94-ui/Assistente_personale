import {
  getCattureRecenti,
  getMemoriaRecente,
  getObiettivi,
  getPersone,
  getProfilo,
  getTask,
  getUltimeIstantaneeFinanze,
} from "./store";
import { getEventiCalendario } from "./calendar";
import { today } from "./date";

// Il "cervello": una mappa dei tuoi dati come nodi e connessioni. Nessuna
// chiamata al modello qui (Regola 2): le somiglianze tra ricordi usano gli
// embedding già salvati al momento della cattura, confrontati in JavaScript.

const MAX_RICORDI = 40;
const SOGLIA_SOMIGLIANZA = 0.78;
const VICINI_PER_RICORDO = 2;

function parseEmbedding(e) {
  if (!e) return null;
  if (Array.isArray(e)) return e;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}

function coseno(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function citaPersona(testo, persone) {
  const t = (testo || "").toLowerCase();
  return persone.filter((p) => {
    if (!p.nome || p.nome.length < 3) return false;
    const nome = p.nome.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${nome}\\b`).test(t);
  });
}

function breve(testo, max = 60) {
  const t = (testo || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export async function costruisciCervello() {
  const oggi = today();
  const [profilo, persone, tasks, memorie, catture, finanze, obiettivi, eventi] = await Promise.all([
    getProfilo(),
    getPersone(),
    getTask({ oggiISO: oggi }),
    getMemoriaRecente(MAX_RICORDI),
    getCattureRecenti(200),
    getUltimeIstantaneeFinanze(1),
    getObiettivi(),
    getEventiCalendario().catch(() => []),
  ]);

  const nodes = [];
  const links = [];
  const presenti = new Set();
  const collegati = new Set();

  function nodo(id, label, type, extra = {}) {
    if (presenti.has(id)) return;
    presenti.add(id);
    nodes.push({ id, label, type, ...extra });
  }
  function link(a, b, kind = "legame") {
    if (!presenti.has(a) || !presenti.has(b) || a === b) return;
    const chiave = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (collegati.has(chiave)) return;
    collegati.add(chiave);
    links.push({ source: a, target: b, kind });
  }

  nodo("io", profilo?.nome || "Tu", "io", { size: 13 });

  // Persone
  for (const p of persone) {
    nodo(`p:${p.id}`, p.nome, "persona", { size: 9, meta: p.organizzazione || p.email || null });
    link("io", `p:${p.id}`);
  }

  // Task aperti, legati alla persona se ce l'hanno
  for (const t of tasks) {
    nodo(`t:${t.id}`, breve(t.titolo), "task", { size: 6, taskId: t.id, fascia: t.urgenza_effettiva });
    if (t.persona_id) link(`p:${t.persona_id}`, `t:${t.id}`);
    else link("io", `t:${t.id}`);
  }

  // Ricordi: dalla cattura risaliamo al task che hanno generato
  const catturaATask = new Map(catture.filter((c) => c.smistato_in).map((c) => [c.id, c.smistato_in]));
  // Lo stesso testo catturato due volte è un solo ricordo (memorie arriva
  // già dal più recente, quindi si tiene quello).
  const testiVisti = new Set();
  const ricordi = memorie
    .filter((m) => {
      const chiave = (m.testo || "").trim().toLowerCase();
      if (!chiave || testiVisti.has(chiave)) return false;
      testiVisti.add(chiave);
      return true;
    })
    .map((m) => ({ ...m, vettore: parseEmbedding(m.embedding) }));

  for (const m of ricordi) {
    nodo(`m:${m.id}`, breve(m.testo), "memoria", { size: 5, data: m.created_at?.slice(0, 10), testo: m.testo });
    const catturaId = m.provenienza?.startsWith("cattura:") ? m.provenienza.slice(8) : null;
    const taskId = catturaId ? catturaATask.get(catturaId) : null;
    if (taskId && presenti.has(`t:${taskId}`)) link(`m:${m.id}`, `t:${taskId}`, "origine");
    for (const p of citaPersona(m.testo, persone)) link(`m:${m.id}`, `p:${p.id}`, "citazione");
  }

  // Ricordi simili per significato: i collegamenti che non avevi notato
  const coppie = [];
  const conVettore = ricordi.filter((m) => m.vettore);
  for (let i = 0; i < conVettore.length; i++) {
    const vicini = [];
    for (let j = 0; j < conVettore.length; j++) {
      if (i === j) continue;
      vicini.push({ j, sim: coseno(conVettore[i].vettore, conVettore[j].vettore) });
    }
    vicini.sort((a, b) => b.sim - a.sim);
    for (const v of vicini.slice(0, VICINI_PER_RICORDO)) {
      if (v.sim < SOGLIA_SOMIGLIANZA) break;
      const a = `m:${conVettore[i].id}`;
      const b = `m:${conVettore[v.j].id}`;
      link(a, b, "simile");
      if (i < v.j) coppie.push({ a, b, sim: Math.round(v.sim * 100) / 100 });
    }
  }

  // Eventi dei prossimi 7 giorni
  const fra7 = Date.now() + 7 * 86400000;
  eventi
    .filter((e) => new Date(e.inizio).getTime() <= fra7)
    .slice(0, 20)
    .forEach((e, i) => {
      const id = `e:${i}`;
      nodo(id, breve(e.titolo, 40), "evento", { size: 6, inizio: e.inizio, fonte: e.fonte });
      const citati = citaPersona(e.titolo, persone);
      if (citati.length) citati.forEach((p) => link(id, `p:${p.id}`));
      else link("io", id);
    });

  // Abitudini
  for (const h of profilo?.abitudini || []) {
    nodo(`h:${h.id}`, h.label, "abitudine", { size: 6 });
    link("io", `h:${h.id}`);
  }

  // Obiettivi aperti
  for (const sezione of ["settimana", "mese"]) {
    for (const o of (obiettivi?.[sezione] || []).filter((o) => !o.fatto)) {
      nodo(`o:${o.id}`, breve(o.label, 40), "obiettivo", { size: 7, sezione });
      link("io", `o:${o.id}`);
    }
  }

  // Finanze: il saldo dell'ultima estrazione e le voci più pesanti
  const f = finanze[0]?.finanze;
  if (f) {
    const segno = f.saldo >= 0 ? "+" : "";
    nodo("f:saldo", `Saldo ${f.mese_riferimento} ${segno}${Math.round(f.saldo)} €`, "finanza", { size: 8 });
    link("io", "f:saldo");
    [...(f.categorie || [])]
      .sort((a, b) => b.totale - a.totale)
      .slice(0, 4)
      .forEach((c) => {
        const id = `f:${c.tipo}:${c.nome}`;
        nodo(id, `${c.nome} ${c.tipo === "entrata" ? "+" : "−"}${Math.round(c.totale)} €`, "finanza", { size: 5 });
        link("f:saldo", id);
      });
  }

  // Nessun ricordo resta isolato: se non ha legami, si aggancia a te
  const conLegami = new Set(links.flatMap((l) => [l.source, l.target]));
  for (const n of nodes) if (n.id !== "io" && !conLegami.has(n.id)) link("io", n.id);

  coppie.sort((x, y) => y.sim - x.sim);
  return { nodes, links, suggerimenti: coppie.slice(0, 3) };
}
