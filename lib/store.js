import "server-only";
import { createClient } from "@supabase/supabase-js";

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
export async function getTask() {
  return orThrow(
    await db()
      .from("task")
      .select("*, persone(id, nome)")
      .eq("user_id", USER_ID())
      .order("urgenza", { ascending: true })
      .order("posizione", { ascending: true })
  );
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
export async function addRegistro(evento, dettagli = {}) {
  return orThrow(
    await db()
      .from("registro")
      .insert({ user_id: USER_ID(), evento, dettagli })
      .select()
      .single()
  );
}
