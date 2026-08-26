"use client";

import { useEffect, useRef, useState } from "react";
import { isHabitDone, completionPercent } from "../../lib/habits";
import { calorieDaMacro } from "../../lib/nutrition";

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function settimanaCorrente() {
  const oggi = new Date();
  const giornoSettimana = oggi.getDay(); // 0=domenica
  const lunedi = new Date(oggi);
  lunedi.setDate(oggi.getDate() - ((giornoSettimana + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi);
    d.setDate(lunedi.getDate() + i);
    return d;
  });
}

function chiaveGiorno(d) {
  // Componenti locali, non toISOString(): quella forza UTC e a ridosso
  // della mezzanotte sbaglierebbe giorno — la stessa trappola della Parte 5.3.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${g}`;
}

const TEMP_DOT = { caldo: "hot", tiepido: "warm", freddo: "cold" };

function useClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function saluto(ore) {
  if (ore === null) return "";
  if (ore < 6) return "Ancora sveglio";
  if (ore < 12) return "Buongiorno";
  if (ore < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function sommaPasti(pasti) {
  return pasti.reduce(
    (acc, p) => ({
      calorie: acc.calorie + (p.calorie || 0),
      proteine: acc.proteine + (p.proteine || 0),
      carboidrati: acc.carboidrati + (p.carboidrati || 0),
      grassi: acc.grassi + (p.grassi || 0),
    }),
    { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 }
  );
}

function PastoRow({ pasto, onSaved }) {
  const [aperto, setAperto] = useState(false);
  const [form, setForm] = useState(pasto);

  useEffect(() => setForm(pasto), [pasto]);

  async function patch(body) {
    const res = await fetch(`/api/meals/${pasto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    onSaved(data.pasto);
  }

  function onMacroChange(campo, valore) {
    const numero = Number(valore) || 0;
    const nuovoForm = { ...form, [campo]: numero };
    nuovoForm.calorie = calorieDaMacro(nuovoForm);
    nuovoForm.stimato = false;
    setForm(nuovoForm);
  }

  function onMacroBlur() {
    patch({ proteine: form.proteine, carboidrati: form.carboidrati, grassi: form.grassi, calorie: form.calorie, stimato: false });
  }

  async function onCalorieBlur(valore) {
    const calorie = Number(valore) || 0;
    setForm((f) => ({ ...f, calorie }));
    try {
      const res = await fetch("/api/meals/redistribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: pasto.nome, calorie }),
      });
      const macro = await res.json();
      if (res.ok) {
        setForm((f) => ({ ...f, ...macro, calorie }));
        patch({ ...macro, calorie });
      } else {
        patch({ calorie });
      }
    } catch {
      patch({ calorie });
    }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setAperto(!aperto)}>
        <span style={{ fontSize: 13 }}>
          {pasto.orario} · {pasto.nome} {pasto.stimato && <span className="type-tag">stima</span>}
        </span>
        <span className="num" style={{ fontSize: 13 }}>{Math.round(form.calorie)} kcal</span>
      </div>
      {aperto && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="field-label">Kcal</div>
            <input type="text" defaultValue={form.calorie} onBlur={(e) => onCalorieBlur(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Prot.</div>
            <input type="text" value={form.proteine} onChange={(e) => onMacroChange("proteine", e.target.value)} onBlur={onMacroBlur} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Carb.</div>
            <input type="text" value={form.carboidrati} onChange={(e) => onMacroChange("carboidrati", e.target.value)} onBlur={onMacroBlur} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Grassi</div>
            <input type="text" value={form.grassi} onChange={(e) => onMacroChange("grassi", e.target.value)} onBlur={onMacroBlur} />
          </div>
        </div>
      )}
    </div>
  );
}

function SalutePanel({ onClose }) {
  const [dati, setDati] = useState(null);
  const [espansa, setEspansa] = useState(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setDati);
  }, []);

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" style={{ width: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>Salute — ultimi 30 giorni</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        {!dati && <p className="meta">Caricamento…</p>}
        {dati && (
          <>
            <p className="meta">
              Medie su {dati.giorniRegistrati} giorni registrati: {dati.medie.calorie} kcal · P {dati.medie.proteine}g · C {dati.medie.carboidrati}g · G {dati.medie.grassi}g
            </p>
            {dati.giorni.map((g) => (
              <div key={g.data} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => setEspansa(espansa === g.data ? null : g.data)}
                >
                  <span style={{ fontSize: 13 }}>{g.data} · {g.numeroPasti} pasti</span>
                  <span className="num" style={{ fontSize: 13 }}>{g.calorie} kcal</span>
                </div>
                {espansa === g.data && (
                  <div style={{ marginTop: 6 }}>
                    {g.pasti.map((p) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-dim)", padding: "3px 0" }}>
                        <span>{p.orario} · {p.nome}</span>
                        <span className="num">{Math.round(p.calorie)} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [profilo, setProfilo] = useState(null);
  const [striscia, setStriscia] = useState(0);
  const [sessionTasks, setSessionTasks] = useState(null);
  const [oggi, setOggi] = useState(null);
  const [abitudiniLog, setAbitudiniLog] = useState({});
  const dirtyRef = useRef(false);
  const now = useClock();

  const [pasti, setPasti] = useState([]);
  const [descrizionePasto, setDescrizionePasto] = useState("");
  const [stimando, setStimando] = useState(false);
  const [mostraSalute, setMostraSalute] = useState(false);

  const [obiettivi, setObiettivi] = useState({ settimana: [], mese: [] });
  const [nuovoObiettivo, setNuovoObiettivo] = useState({ settimana: "", mese: "" });

  const [corpo, setCorpo] = useState(null);
  const [bloccati, setBloccati] = useState(null);

  const [eventiCalendario, setEventiCalendario] = useState(null);
  const [settimana] = useState(settimanaCorrente);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfilo(d.profilo);
        setStriscia(d.striscia || 0);
      });
    fetch("/api/session-tasks")
      .then((r) => r.json())
      .then((d) => setSessionTasks(d.tasks || []));
    fetch("/api/meals")
      .then((r) => r.json())
      .then((d) => setPasti(d.pasti || []));
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setObiettivi(d.obiettivi || { settimana: [], mese: [] }));
    fetch("/api/body")
      .then((r) => r.json())
      .then(setCorpo);
    fetch("/api/blockers")
      .then((r) => r.json())
      .then((d) => setBloccati(d.bloccati || []));
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => setEventiCalendario(d.eventi || []));

    // Cache locale per il rendering immediato, poi fusa con la lettura dal
    // server — se nel frattempo l'utente ha già cliccato, la risposta
    // vecchia del server viene ignorata (Parte 5.3-bis).
    const cacheKey = "personalos:habits";
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached) {
        setOggi(cached.oggi);
        setAbitudiniLog(cached.abitudini || {});
      }
    } catch {}

    fetch("/api/habits")
      .then((r) => r.json())
      .then((d) => {
        if (dirtyRef.current) return;
        setOggi(d.oggi);
        setAbitudiniLog(d.abitudini || {});
        localStorage.setItem(cacheKey, JSON.stringify({ oggi: d.oggi, abitudini: d.abitudini }));
      });
  }, []);

  function clickAbitudine(habit) {
    dirtyRef.current = true;
    const current = abitudiniLog[habit.id];
    let nuovoValore;
    if (habit.tipo === "contatore") {
      const target = habit.obiettivo || 1;
      const attuale = typeof current === "number" ? current : 0;
      nuovoValore = attuale >= target ? 0 : attuale + 1;
    } else {
      nuovoValore = current !== true;
    }

    const nuovoLog = { ...abitudiniLog, [habit.id]: nuovoValore };
    setAbitudiniLog(nuovoLog);
    localStorage.setItem("personalos:habits", JSON.stringify({ oggi, abitudini: nuovoLog }));

    fetch("/api/habits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId: habit.id, value: nuovoValore }),
    }).catch(() => {
      // scrittura fallita: rilegge lo stato vero dal server
      fetch("/api/habits")
        .then((r) => r.json())
        .then((d) => setAbitudiniLog(d.abitudini || {}));
    });
  }

  function apriTask(id) {
    window.location.hash = `#crm/${id}`;
    window.dispatchEvent(new CustomEvent("personalos:apri-schermata", { detail: "crm" }));
  }

  async function aggiungiPasto() {
    const descrizione = descrizionePasto.trim();
    if (!descrizione) return;
    setStimando(true);
    try {
      const res = await fetch("/api/meals/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descrizione }),
      });
      const stima = await res.json();
      const body = res.ok
        ? { nome: descrizione, ...stima }
        : { nome: descrizione, calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, stimato: false };
      const res2 = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res2.json();
      setPasti((prev) => [...prev, data.pasto]);
      setDescrizionePasto("");
    } finally {
      setStimando(false);
    }
  }

  async function aggiungiObiettivo(sezione) {
    const label = nuovoObiettivo[sezione].trim();
    if (!label) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sezione, label }),
    });
    const data = await res.json();
    setObiettivi((prev) => ({ ...prev, [sezione]: [...prev[sezione], data.voce] }));
    setNuovoObiettivo((prev) => ({ ...prev, [sezione]: "" }));
  }

  async function toggleObiettivo(sezione, voce) {
    const nuovoFatto = !voce.fatto;
    setObiettivi((prev) => ({
      ...prev,
      [sezione]: prev[sezione].map((v) => (v.id === voce.id ? { ...v, fatto: nuovoFatto } : v)),
    }));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sezione, id: voce.id, fatto: nuovoFatto }),
    });
  }

  async function rimuoviObiettivo(sezione, id) {
    setObiettivi((prev) => ({ ...prev, [sezione]: prev[sezione].filter((v) => v.id !== id) }));
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sezione, id }),
    });
  }

  const iniziali = profilo?.nome ? profilo.nome.slice(0, 2).toUpperCase() : "--";
  const totaliOggi = sommaPasti(pasti);
  const obiettivoCalorico = profilo?.obiettivo_calorico || 2200;
  const percMacro = (grammi, kcalPerG) => Math.min(100, Math.round(((grammi * kcalPerG) / obiettivoCalorico) * 100));

  return (
    <section className="screen active" id="screen-home">
      <div className="grid">
        <div className="card col-4" id="card-operator">
          <h3>Operator</h3>
          <div className="row">
            <div className="avatar">{iniziali}</div>
            <div>
              <div className="name">{profilo?.nome || "…"}</div>
              <div className="meta">
                {profilo ? `${profilo.ruolo || ""} · ${profilo.citta || ""}` : "Caricamento…"}
              </div>
            </div>
          </div>
          <div className="meta" style={{ marginTop: 12 }}>
            {profilo?.focus_del_giorno ? `Focus di oggi: ${profilo.focus_del_giorno}` : "Nessun focus impostato per oggi"}
          </div>
          <div className="streak">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 3 .3 5-2 6.5-3-1-4-4-4-7 0-3 2-4 4-6z" />
            </svg>
            {striscia} {striscia === 1 ? "giorno" : "giorni"} di striscia
          </div>
        </div>

        <div className="card col-8" id="card-session">
          <h3>Session</h3>
          <div className="greeting">{saluto(now?.getHours() ?? null)}{profilo?.nome ? `, ${profilo.nome}` : ""}</div>
          <div className="clock">
            {now
              ? `${now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · ${now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
              : "--:--"}
          </div>
          <div className="tasks">
            {sessionTasks === null && <div className="meta">Caricamento…</div>}
            {sessionTasks?.length === 0 && <div className="meta">Niente in scadenza oggi.</div>}
            {sessionTasks?.map((t) => (
              <div className="task-row" key={t.id} onClick={() => apriTask(t.id)}>
                <span className={`dot ${TEMP_DOT[t.temperatura] || "cold"}`}></span>
                <span className="title">{t.titolo}</span>
                <span className="person">{t.persona || ""}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-6" id="card-calendar">
          <h3>Calendario della settimana</h3>
          {eventiCalendario === null && <p className="meta">Caricamento…</p>}
          {eventiCalendario !== null &&
            settimana.map((d) => {
              const chiave = chiaveGiorno(d);
              const oggiChiave = chiaveGiorno(new Date());
              const eOggi = chiave === oggiChiave;
              const delGiorno = eventiCalendario
                .filter((e) => chiaveGiorno(new Date(e.inizio)) === chiave)
                .sort((a, b) => new Date(a.inizio) - new Date(b.inizio));

              return (
                <div
                  key={chiave}
                  className="calendar-day-block"
                  style={{
                    borderLeft: eOggi ? "3px solid var(--accent)" : "3px solid transparent",
                    background: eOggi ? "var(--surface-2)" : "transparent",
                    borderRadius: 8,
                    padding: "6px 10px",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: eOggi ? 13.5 : 12.5, fontWeight: eOggi ? 700 : 500, color: eOggi ? "var(--accent)" : "var(--text-dim)" }}>
                      {DOW_LABELS[d.getDay()]} {d.getDate()}
                    </span>
                    {delGiorno.length === 0 && <span className="meta" style={{ fontSize: 11.5 }}>—</span>}
                  </div>
                  {delGiorno.map((e, i) => (
                    <div className="event-row" key={i} style={{ paddingLeft: 4 }}>
                      <span className="time">
                        {new Date(e.inizio).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>{e.titolo} <span className="meta">· {e.fonte}</span></span>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>

        <div className="card col-3" id="card-habits">
          <h3>Abitudini</h3>
          {(() => {
            const lista = profilo?.abitudini || [];
            const percent = completionPercent(lista, abitudiniLog);
            return (
              <>
                <div className="ring-wrap">
                  <svg className="ring" viewBox="0 0 36 36">
                    <path
                      d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                      fill="none"
                      stroke="var(--surface-2)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                      fill="none"
                      stroke="var(--green)"
                      strokeWidth="3"
                      strokeDasharray={`${percent} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
                    {percent}%
                  </div>
                </div>
                {lista.map((h) => {
                  const value = abitudiniLog[h.id];
                  const done = isHabitDone(h, value);
                  return (
                    <div className="habit-row" key={h.id} onClick={() => clickAbitudine(h)}>
                      <span className={`habit-check ${done ? "done" : ""}`}>
                        {h.tipo === "contatore" ? `${value || 0}/${h.obiettivo}` : done ? "✓" : ""}
                      </span>
                      <span className="label">{h.label}</span>
                      {h.tipo === "contatore" && (
                        <span className="count">
                          {value || 0}/{h.obiettivo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        <div className="card col-3" id="card-blockers">
          <h3>Bloccato</h3>
          {bloccati === null && <p className="meta">Caricamento…</p>}
          {bloccati?.length === 0 && <p className="meta">Niente in ritardo.</p>}
          {bloccati?.map((b, i) => (
            <div className="blocker-row" key={i}>
              <span className="who">{b.persona}</span>
              <span className="days">{b.giorni}gg</span>
            </div>
          ))}
        </div>

        <div className="card col-6" id="card-finance-pulse">
          <h3>Polso finanziario</h3>
          <div className="amount num">€ 42.380</div>
          <div className="delta up num">▲ +€ 610 ultimi 30 giorni</div>
          <div className="mini-bars">
            {[40, 55, 48, 70, 60, 80, 75, 90].map((h, i) => (
              <div className="bar" style={{ height: `${h}%` }} key={i}></div>
            ))}
          </div>
        </div>

        <div className="card col-6" id="card-nutrition">
          <h3>
            Nutrizione
            <span style={{ fontSize: 11, cursor: "pointer", color: "var(--accent)", textTransform: "none" }} onClick={() => setMostraSalute(true)}>
              Storico 30gg →
            </span>
          </h3>
          <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
            {Math.round(totaliOggi.calorie)} / {obiettivoCalorico} kcal
          </div>
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Proteine</span><span>{Math.round(totaliOggi.proteine)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.proteine, 4)}%` }}></div></div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Carboidrati</span><span>{Math.round(totaliOggi.carboidrati)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.carboidrati, 4)}%` }}></div></div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Grassi</span><span>{Math.round(totaliOggi.grassi)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.grassi, 9)}%` }}></div></div>
            </div>
          </div>
          <input
            type="text"
            placeholder={stimando ? "Sto stimando…" : "Descrivi un pasto e premi Invio…"}
            value={descrizionePasto}
            disabled={stimando}
            onChange={(e) => setDescrizionePasto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aggiungiPasto()}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13, marginBottom: 8 }}
          />
          {pasti.map((p) => (
            <PastoRow key={p.id} pasto={p} onSaved={(updated) => setPasti((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
          ))}
        </div>

        <div className="card col-3" id="card-body-trend">
          <h3>Andamento fisico — 30gg</h3>
          {!corpo && <p className="meta">Nessun dato ancora — collega Apple Salute.</p>}
          {corpo && (
            <>
              {corpo.trendPeso.length > 1 ? (
                <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                  {(() => {
                    const pesi = corpo.trendPeso.map((p) => p.peso);
                    const min = Math.min(...pesi);
                    const max = Math.max(...pesi);
                    const range = max - min || 1;
                    const punti = corpo.trendPeso
                      .map((p, i) => {
                        const x = (i / (corpo.trendPeso.length - 1)) * 200;
                        const y = 55 - ((p.peso - min) / range) * 50;
                        return `${x},${y}`;
                      })
                      .join(" ");
                    return <polyline points={punti} fill="none" stroke="var(--accent)" strokeWidth="2" />;
                  })()}
                </svg>
              ) : (
                <p className="meta">Serve più di un giorno di dati per il grafico.</p>
              )}
              <div className="meta" style={{ marginTop: 8 }}>
                {corpo.oggi.peso ? `${corpo.oggi.peso} kg` : "peso: —"}
                {corpo.oggi.passi ? ` · ${corpo.oggi.passi} passi` : ""}
                {corpo.oggi.calorie_attive ? ` · ${corpo.oggi.calorie_attive} kcal attive` : ""}
              </div>
            </>
          )}
        </div>

        <div className="card col-3" id="card-goals">
          <h3>Obiettivi</h3>
          {["settimana", "mese"].map((sezione) => (
            <div className="goal-section" key={sezione}>
              <div className="sec-label">{sezione === "settimana" ? "Questa settimana" : "Questo mese"}</div>
              {obiettivi[sezione]?.map((g) => (
                <div className={`goal-row ${g.fatto ? "done" : ""}`} key={g.id} style={{ position: "relative" }}>
                  <span onClick={() => toggleObiettivo(sezione, g)}>{g.fatto ? "✓" : "○"}</span>
                  <span onClick={() => toggleObiettivo(sezione, g)} style={{ flex: 1 }}>{g.label}</span>
                  <span
                    onClick={() => rimuoviObiettivo(sezione, g.id)}
                    style={{ opacity: 0.5, fontSize: 11, cursor: "pointer" }}
                  >
                    ×
                  </span>
                </div>
              ))}
              <input
                type="text"
                placeholder="+ aggiungi…"
                value={nuovoObiettivo[sezione]}
                onChange={(e) => setNuovoObiettivo((prev) => ({ ...prev, [sezione]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && aggiungiObiettivo(sezione)}
                style={{ width: "100%", marginTop: 6, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 12.5 }}
              />
            </div>
          ))}
        </div>
      </div>

      {mostraSalute && <SalutePanel onClose={() => setMostraSalute(false)} />}
    </section>
  );
}
