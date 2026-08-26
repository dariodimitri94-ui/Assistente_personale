import "server-only";
import { createClient } from "@supabase/supabase-js";
import { anyHabitDone } from "./habits";
import { OBIETTIVI_SENTINEL_DATE } from "./date";

// Unico punto di accesso ai dati (Parte 3 / A7). Nessuna rotta o componente
// tocca Supabase direttamente: tutti chiedono a questo modulo. L'import
// "server-only" fa fallire la build se qualcosa lo importa da un componente
// client — la chiave di servizio non deve mai poter finire nel browser.

let client;
function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");
    }
    client = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return client;
}

const USER_ID = () => process.env.USER_ID || "dario";

function orThrow({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// Profilo
// ============================================================
export async function getProfilo() {
  const data = orThrow(
    await db().from("profilo").select("*").eq("user_id", USER_ID()).maybeSingle()
  );
  return data;
}

export async function updateProfilo(patch) {
  const existing = await getProfilo();
  if (!existing) {
    return orThrow(
      await db()
        .from("profilo")
        .insert({ user_id: USER_ID(), ...patch })
        .select()
        .single()
    );
  }
  return orThrow(
    await db()
      .from("profilo")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", USER_ID())
      .select()
      .single()
  );
}

// ============================================================
// Catture
// ============================================================
export async function addCattura(cattura) {
  return orThrow(
    await db()
      .from("catture")
      .insert({ user_id: USER_ID(), ...cattura })
      .select()
      .single()
  );
}

export async function getCattureRecenti(limit = 20) {
  return orThrow(
    await db()
      .from("catture")
      .select("*")
      .eq("user_id", USER_ID())
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

// ============================================================
// Persone
// ============================================================
export async function getPersone() {
  return orThrow(await db().from("persone").select("*").eq("user_id", USER_ID()));
}

export async function findOrCreatePersona(nome) {
  if (!nome) return null;
  const existing = orThrow(
    await db().from("persone").select("*").eq("user_id", USER_ID()).ilike("nome", nome).maybeSingle()
  );
  if (existing) return existing;
  return orThrow(
    await db()
      .from("persone")
      .insert({ user_id: USER_ID(), nome })
      .select()
      .single()
  );
}

// ============================================================
// Task (CRM)
// ============================================================
// "in_ritardo" non è mai scritto dal classificatore (Parte 4): ci si
// finisce quando un task lasciato "oggi" sopravvive al giorno in cui è
// nato, non quando viene creato. Calcolato qui, non salvato: così non
// serve un cron solo per invecchiare i task.
export function conFasciaEffettiva(task, oggiISO) {
  const creatoIl = task.created_at?.slice(0, 10);
  const effettiva =
    task.urgenza === "oggi" && creatoIl && creatoIl < oggiISO && !task.completato_il
      ? "in_ritardo"
      : task.urgenza;
  return { ...task, urgenza_effettiva: effettiva };
}

export async function getTask({ oggiISO, includeCompletati = false } = {}) {
  let query = db().from("task").select("*, persone(id, nome)").eq("user_id", USER_ID());
  if (!includeCompletati) query = query.is("completato_il", null);
  const rows = orThrow(await query.order("posizione", { ascending: true }));
  const data = oggiISO ? rows.map((t) => conFasciaEffettiva(t, oggiISO)) : rows;
  return data;
}

export async function addTask(task) {
  return orThrow(
    await db()
      .from("task")
      .insert({ user_id: USER_ID(), ...task })
      .select()
      .single()
  );
}

export async function getTaskCompletatiDa(dataInizioISO) {
  return orThrow(
    await db()
      .from("task")
      .select("*, persone(id, nome)")
      .eq("user_id", USER_ID())
      .not("completato_il", "is", null)
      .gte("completato_il", `${dataInizioISO}T00:00:00`)
      .order("completato_il", { ascending: false })
  );
}

export async function updateTask(id, patch) {
  return orThrow(
    await db()
      .from("task")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", USER_ID())
      .select()
      .single()
  );
}

// ============================================================
// Log giornalieri
// ============================================================
export async function getLogGiornaliero(data) {
  const row = orThrow(
    await db()
      .from("log_giornalieri")
      .select("*")
      .eq("user_id", USER_ID())
      .eq("data", data)
      .maybeSingle()
  );
  return row;
}

export async function updateLogGiornaliero(data, patch) {
  const existing = await getLogGiornaliero(data);
  if (!existing) {
    return orThrow(
      await db()
        .from("log_giornalieri")
        .insert({ user_id: USER_ID(), data, ...patch })
        .select()
        .single()
    );
  }
  return orThrow(
    await db()
      .from("log_giornalieri")
      .update(patch)
      .eq("user_id", USER_ID())
      .eq("data", data)
      .select()
      .single()
  );
}

// Striscia: giorni consecutivi, contando all'indietro da oggi, con almeno
// un'abitudine completata. Si ferma al primo giorno senza log o senza
// nessuna abitudine fatta (oggi escluso dal fermo: se oggi non hai ancora
// spuntato nulla, la striscia si calcola comunque a partire da ieri).
export async function getStriscia(habitList, oggiISO) {
  if (!habitList?.length) return 0;
  const rows = orThrow(
    await db()
      .from("log_giornalieri")
      .select("data, abitudini")
      .eq("user_id", USER_ID())
      .lte("data", oggiISO)
      .order("data", { ascending: false })
      .limit(400)
  );
  const byDate = new Map(rows.map((r) => [r.data, r.abitudini || {}]));

  let streak = 0;
  const cursor = new Date(`${oggiISO}T00:00:00Z`);
  // Se oggi non ha ancora nulla di fatto, non rompe la striscia: si parte da ieri.
  const oggiFatto = anyHabitDone(habitList, byDate.get(oggiISO) || {});
  if (!oggiFatto) cursor.setUTCDate(cursor.getUTCDate() - 1);

  for (let i = 0; i < 400; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const log = byDate.get(iso);
    if (!log || !anyHabitDone(habitList, log)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// Aggiorna una sola abitudine nel log del giorno, senza toccare il resto
// (pasti, obiettivi, finanze) che vive nella stessa riga JSON.
export async function updateAbitudineGiorno(data, habitId, value) {
  const log = await getLogGiornaliero(data);
  const abitudini = { ...(log?.abitudini || {}), [habitId]: value };
  return updateLogGiornaliero(data, { abitudini });
}

// ============================================================
// Salute (dentro il log giornaliero) — passi, calorie attive, peso da
// Apple Salute via Comandi Rapidi. Si fonde con quello che c'è già quel
// giorno, senza sovrascrivere campi non inviati in questa chiamata.
// ============================================================
export async function updateSaluteGiorno(data, patch) {
  const log = await getLogGiornaliero(data);
  const salute = { ...(log?.salute || {}), ...patch };
  return updateLogGiornaliero(data, { salute });
}

// ============================================================
// Pasti (dentro il log giornaliero, Parte 5.5)
// ============================================================
export async function addPasto(data, pasto) {
  const log = await getLogGiornaliero(data);
  const nuovoPasto = { id: crypto.randomUUID(), ...pasto };
  const pasti = [...(log?.pasti || []), nuovoPasto];
  await updateLogGiornaliero(data, { pasti });
  return nuovoPasto;
}

export async function updatePasto(data, pastoId, patch) {
  const log = await getLogGiornaliero(data);
  const pasti = (log?.pasti || []).map((p) => (p.id === pastoId ? { ...p, ...patch } : p));
  const updated = await updateLogGiornaliero(data, { pasti });
  return updated.pasti.find((p) => p.id === pastoId);
}

export async function getLogGiornalieriIntervallo(dataInizio, dataFine) {
  return orThrow(
    await db()
      .from("log_giornalieri")
      .select("*")
      .eq("user_id", USER_ID())
      .gte("data", dataInizio)
      .lte("data", dataFine)
      .order("data", { ascending: true })
  );
}

// ============================================================
// Obiettivi — vivono sulla riga sentinella 2000-01-01 del log
// giornaliero: non si azzerano mai da soli, nessun cambio di settimana o
// di mese li tocca (Parte 5.7). È un trucco deliberato, non un errore.
// ============================================================
export async function getObiettivi() {
  const log = await getLogGiornaliero(OBIETTIVI_SENTINEL_DATE);
  return log?.obiettivi || { settimana: [], mese: [] };
}

export async function addObiettivo(sezione, label) {
  const obiettivi = await getObiettivi();
  const voce = { id: crypto.randomUUID(), label, fatto: false, progresso: null };
  obiettivi[sezione] = [...(obiettivi[sezione] || []), voce];
  await updateLogGiornaliero(OBIETTIVI_SENTINEL_DATE, { obiettivi });
  return voce;
}

export async function updateObiettivo(sezione, id, patch) {
  const obiettivi = await getObiettivi();
  obiettivi[sezione] = (obiettivi[sezione] || []).map((v) => (v.id === id ? { ...v, ...patch } : v));
  await updateLogGiornaliero(OBIETTIVI_SENTINEL_DATE, { obiettivi });
  return obiettivi[sezione].find((v) => v.id === id);
}

export async function removeObiettivo(sezione, id) {
  const obiettivi = await getObiettivi();
  obiettivi[sezione] = (obiettivi[sezione] || []).filter((v) => v.id !== id);
  await updateLogGiornaliero(OBIETTIVI_SENTINEL_DATE, { obiettivi });
}

// ============================================================
// Memoria
// ============================================================
export async function addMemoria(voce) {
  return orThrow(
    await db()
      .from("memoria")
      .insert({ user_id: USER_ID(), ...voce })
      .select()
      .single()
  );
}

export async function getMemoriaRecente(limit = 100) {
  return orThrow(
    await db()
      .from("memoria")
      .select("*")
      .eq("user_id", USER_ID())
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function cercaMemoriaPerSomiglianza(embedding, matchCount = 20) {
  return orThrow(
    await db().rpc("match_memoria", {
      query_embedding: embedding,
      match_count: matchCount,
      p_user_id: USER_ID(),
    })
  );
}

// ============================================================
// Registro
// ============================================================
export async function getRegistroEvento(evento, dettagliMatch = {}) {
  let query = db().from("registro").select("*").eq("user_id", USER_ID()).eq("evento", evento);
  const rows = orThrow(await query.order("created_at", { ascending: false }).limit(50));
  return rows.find((r) => Object.entries(dettagliMatch).every(([k, v]) => r.dettagli?.[k] === v)) || null;
}

// ============================================================
// Export completo — la via d'uscita da qualsiasi servizio (Parte 7.6).
// ============================================================
export async function getAllData() {
  const uid = USER_ID();
  const tabelle = ["profilo", "catture", "persone", "task", "log_giornalieri", "memoria", "registro"];
  const risultato = {};
  for (const nome of tabelle) {
    risultato[nome] = orThrow(await db().from(nome).select("*").eq("user_id", uid));
  }
  return risultato;
}

export async function addRegistro(evento, dettagli = {}) {
  return orThrow(
    await db()
      .from("registro")
      .insert({ user_id: USER_ID(), evento, dettagli })
      .select()
      .single()
  );
}
