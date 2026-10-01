"use client";

import { useEffect, useRef, useState } from "react";
import Brain from "../Brain";
import { isHabitDone } from "../../lib/habits";
import { calorieDaMacro } from "../../lib/nutrition";

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const HABIT_COLORS = ["#f472b6", "#8b9dff", "#38d6ff", "#4ade80", "#ffb547"];

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

const ora = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

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

// "Nelle prossime ore": regole fisse sui dati già caricati, nessun modello
// (Regola 2). Dice cosa arriva e cosa rischia di sfuggire.
function prossimeOre({ now, eventi, abitudini, log, striscia, brain, calorie, obiettivoCalorico }) {
  if (!now) return [];
  const voci = [];
  const fra6 = now.getTime() + 6 * 3600000;

  for (const e of eventi || []) {
    const t = new Date(e.inizio).getTime();
    if (t >= now.getTime() && t <= fra6) {
      const minuti = Math.round((t - now.getTime()) / 60000);
      voci.push({
        when: ora(e.inizio),
        what: e.titolo,
        why: `${e.fonte} · ${minuti < 60 ? `fra ${minuti} min` : `fra ${Math.round(minuti / 60)} h`}`,
      });
    }
  }

  const ritardo = (brain?.nodes || []).filter((n) => n.type === "task" && n.fascia === "in_ritardo");
  if (ritardo.length) {
    voci.push({
      when: "!",
      what: ritardo.length === 1 ? `"${ritardo[0].label}" è in ritardo` : `${ritardo.length} task in ritardo`,
      why: "dal CRM",
    });
  }

  const ore = now.getHours();
  if (ore >= 18) {
    const mancanti = (abitudini || []).filter((h) => !isHabitDone(h, log[h.id]));
    if (mancanti.length) {
      voci.push({
        when: "sera",
        what: `Mancano: ${mancanti.map((h) => h.label).join(", ")}`,
        why: striscia > 0 ? `striscia di ${striscia} giorni a rischio` : "abitudini di oggi",
      });
    }
  }

  if (ore >= 14 && calorie < obiettivoCalorico * 0.35) {
    voci.push({
      when: "pasti",
      what: `Solo ${Math.round(calorie)} kcal registrate`,
      why: `obiettivo ${obiettivoCalorico} kcal`,
    });
  }

  return voci.slice(0, 5);
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
            <input className="soft-input" type="text" defaultValue={form.calorie} onBlur={(e) => onCalorieBlur(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Prot.</div>
            <input className="soft-input" type="text" value={form.proteine} onChange={(e) => onMacroChange("proteine", e.target.value)} onBlur={onMacroBlur} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Carb.</div>
            <input className="soft-input" type="text" value={form.carboidrati} onChange={(e) => onMacroChange("carboidrati", e.target.value)} onBlur={onMacroBlur} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="field-label">Grassi</div>
            <input className="soft-input" type="text" value={form.grassi} onChange={(e) => onMacroChange("grassi", e.target.value)} onBlur={onMacroBlur} />
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

function Ring({ percent, color }) {
  const C = 2 * Math.PI * 26;
  return (
    <svg viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
      <circle
        cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(C * percent) / 100} ${C}`}
        transform="rotate(-90 32 32)"
        style={{ filter: percent > 0 ? `drop-shadow(0 0 4px ${color})` : "none", transition: "stroke-dasharray .4s" }}
      />
      <text x="32" y="36.5" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text)">{percent}%</text>
    </svg>
  );
}

function Sparkline({ valori, colore = "#2dd4bf" }) {
  if (valori.length < 2) return null;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const range = max - min || 1;
  const punti = valori.map((v, i) => [(i / (valori.length - 1)) * 200, 50 - ((v - min) / range) * 44]);
  const linea = punti.map((p) => p.join(",")).join(" ");
  return (
    <svg className="spark" viewBox="0 0 200 54" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${colore.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colore} stopOpacity="0.35" />
          <stop offset="1" stopColor={colore} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,54 ${linea} 200,54`} fill={`url(#g-${colore.slice(1)})`} />
      <polyline points={linea} fill="none" stroke={colore} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
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

  const [brain, setBrain] = useState(null);

  const [pasti, setPasti] = useState([]);
  const [descrizionePasto, setDescrizionePasto] = useState("");
  const [stimando, setStimando] = useState(false);
  const [mostraSalute, setMostraSalute] = useState(false);

  const [obiettivi, setObiettivi] = useState({ settimana: [], mese: [] });
  const [nuovoObiettivo, setNuovoObiettivo] = useState({ settimana: "", mese: "" });

  const [corpo, setCorpo] = useState(null);
  const [bloccati, setBloccati] = useState(null);
  const [finanze, setFinanze] = useState(null);

  const [eventiCalendario, setEventiCalendario] = useState(null);
  const [settimana] = useState(settimanaCorrente);

  useEffect(() => {
    const caricaVivi = () => {
      fetch("/api/brain")
        .then((r) => r.json())
        .then(setBrain)
        .catch(() => setBrain({ nodes: [], links: [], suggerimenti: [] }));
      fetch("/api/session-tasks")
        .then((r) => r.json())
        .then((d) => setSessionTasks(d.tasks || []));
    };
    caricaVivi();
    // Dopo ogni cattura dalla barra in basso il cervello si aggiorna da solo
    window.addEventListener("personalos:aggiorna", caricaVivi);

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfilo(d.profilo);
        setStriscia(d.striscia || 0);
      });
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
    fetch("/api/finance")
      .then((r) => r.json())
      .then(setFinanze);

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

    return () => window.removeEventListener("personalos:aggiorna", caricaVivi);
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

  const totaliOggi = sommaPasti(pasti);
  const obiettivoCalorico = profilo?.obiettivo_calorico || 2200;
  const percMacro = (grammi, kcalPerG) => Math.min(100, Math.round(((grammi * kcalPerG) / obiettivoCalorico) * 100));
  const abitudini = profilo?.abitudini || [];

  const oggiChiave = now ? chiaveGiorno(now) : null;
  const eventiOggi = (eventiCalendario || [])
    .filter((e) => oggiChiave && chiaveGiorno(new Date(e.inizio)) === oggiChiave)
    .sort((a, b) => new Date(a.inizio) - new Date(b.inizio));

  // Timeline di oggi con il segnaposto "Adesso" se nessun evento è in corso
  const timeline = [];
  if (now) {
    let adessoInserito = false;
    for (const e of eventiOggi) {
      const inizio = new Date(e.inizio);
      const fine = new Date(e.fine || e.inizio);
      const inCorso = inizio <= now && now < fine;
      if (!adessoInserito && (inCorso || inizio > now)) {
        if (!inCorso) timeline.push({ adesso: true });
        adessoInserito = true;
      }
      timeline.push({ ...e, stato: inCorso ? "now" : fine <= now ? "done" : "" });
    }
    if (!adessoInserito) timeline.push({ adesso: true });
  }

  const nudges = prossimeOre({
    now,
    eventi: eventiCalendario,
    abitudini,
    log: abitudiniLog,
    striscia,
    brain,
    calorie: totaliOggi.calorie,
    obiettivoCalorico,
  });

  const saluteAttiva = !!(corpo && (corpo.trendPeso?.length || Object.keys(corpo.oggi || {}).length));
  const fonti = [
    { label: "Calendario iCloud", on: !!eventiCalendario },
    { label: "Telegram", on: true },
    { label: "Siri", on: true },
    { label: "Google Sheets", on: !!finanze?.file?.drive },
    { label: "Apple Salute", on: saluteAttiva },
    { label: "Gmail", on: false },
    { label: "Siti web", on: false },
  ];

  const sottotitolo = [
    profilo?.ruolo,
    profilo?.citta,
    striscia > 0 ? `${striscia} ${striscia === 1 ? "giorno" : "giorni"} di striscia` : null,
    profilo?.focus_del_giorno ? `focus: ${profilo.focus_del_giorno}` : null,
  ].filter(Boolean);

  return (
    <section className="screen active" id="screen-home">
      <div className="greeting-row">
        <div>
          <h1>{saluto(now?.getHours() ?? null)}{profilo?.nome ? `, ${profilo.nome}` : ""}</h1>
          <div className="sub">
            {now
              ? `${now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · ${now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}`
              : "--:--"}
            {sottotitolo.length > 0 && ` · ${sottotitolo.join(" · ")}`}
          </div>
        </div>
        <div className="sources">
          {fonti.map((f) => (
            <span key={f.label} className={`source ${f.on ? "" : "off"}`} title={f.on ? "collegato" : "da collegare"}>
              <i />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid">
        <Brain data={brain} onOpenTask={apriTask} />

        <div className="card col-5" id="card-session">
          <h3>Le 3 cose di oggi</h3>
          {sessionTasks === null && <div className="meta">Caricamento…</div>}
          {sessionTasks?.length === 0 && <div className="meta">Niente in scadenza oggi.</div>}
          {sessionTasks?.map((t) => (
            <div className="task-row" key={t.id} onClick={() => apriTask(t.id)}>
              <span className={`dot ${TEMP_DOT[t.temperatura] || "cold"}`}></span>
              <span className="title">{t.titolo}</span>
              <span className="person">{t.urgenza === "in_ritardo" ? "in ritardo" : t.persona || ""}</span>
            </div>
          ))}
        </div>

        <div className="card col-4" id="card-today">
          <h3>La tua giornata</h3>
          {eventiCalendario === null && <p className="meta">Caricamento…</p>}
          {eventiCalendario !== null && (
            <div className="timeline">
              {timeline.map((v, i) =>
                v.adesso ? (
                  <div className="tl-item now" key="adesso">
                    <div className="tl-time">{now ? ora(now.toISOString()) : ""} · adesso</div>
                    <div className="tl-title meta">{eventiOggi.length ? "" : "Nessun impegno oggi"}</div>
                  </div>
                ) : (
                  <div className={`tl-item ${v.stato}`} key={i}>
                    <div className="tl-time">{ora(v.inizio)}{v.fine ? ` – ${ora(v.fine)}` : ""}</div>
                    <div className="tl-title">{v.titolo}</div>
                    <div className="tl-src">{v.fonte}</div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="card col-3" id="card-nudges">
          <h3>Nelle prossime ore</h3>
          {nudges.length === 0 && <p className="meta">Niente da segnalare. Tutto sotto controllo.</p>}
          {nudges.map((n, i) => (
            <div className="nudge" key={i}>
              <span className="when">{n.when}</span>
              <div>
                <div className="what">{n.what}</div>
                <div className="why">{n.why}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card col-4" id="card-habits">
          <h3>Abitudini <span className="h3-side meta">tocca per segnare</span></h3>
          <div className="rings">
            {abitudini.length === 0 && <p className="meta">Nessuna abitudine nel profilo.</p>}
            {abitudini.map((h, i) => {
              const value = abitudiniLog[h.id];
              const percent =
                h.tipo === "contatore"
                  ? Math.min(100, Math.round(((value || 0) / (h.obiettivo || 1)) * 100))
                  : isHabitDone(h, value) ? 100 : 0;
              return (
                <div className="ring-box" key={h.id} onClick={() => clickAbitudine(h)}>
                  <Ring percent={percent} color={HABIT_COLORS[i % HABIT_COLORS.length]} />
                  <div>{h.label}</div>
                  <div className="ring-val">
                    {h.tipo === "contatore" ? `${value || 0}/${h.obiettivo}` : isHabitDone(h, value) ? "fatto" : "da fare"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card col-4" id="card-finance-pulse">
          <h3>Polso finanziario {finanze?.file?.drive && <span className="h3-side meta">Google Sheets</span>}</h3>
          {!finanze?.ultima && <p className="meta">Nessun dato ancora — aggiorna dalla scheda Finanze.</p>}
          {finanze?.ultima && (
            <>
              <div className="big-num num" style={{ color: finanze.ultima.saldo >= 0 ? "var(--green)" : "var(--red)" }}>
                {finanze.ultima.saldo >= 0 ? "+" : ""}
                {finanze.ultima.saldo.toFixed(2)} €
              </div>
              <div className="kv">
                <span>Saldo · {finanze.ultima.mese_riferimento}</span>
                {finanze.deltaSaldo !== null && (
                  <span className={`delta num ${finanze.deltaSaldo >= 0 ? "up" : "down"}`}>
                    {finanze.deltaSaldo >= 0 ? "▲" : "▼"} {Math.abs(finanze.deltaSaldo).toFixed(2)} €
                  </span>
                )}
              </div>
              <div className="kv">
                <span>Entrate <b className="num" style={{ color: "var(--green)" }}>+{finanze.ultima.entrate_totali?.toFixed(0)} €</b></span>
                <span>Uscite <b className="num" style={{ color: "var(--red)" }}>−{finanze.ultima.uscite_totali?.toFixed(0)} €</b></span>
              </div>
              <Sparkline valori={finanze.storico.map((s) => s.saldo)} />
            </>
          )}
        </div>

        <div className="card col-4" id="card-body-trend">
          <h3>Andamento fisico — 30gg</h3>
          {!saluteAttiva && <p className="meta">Nessun dato ancora — collega Apple Salute.</p>}
          {saluteAttiva && (
            <>
              {corpo.trendPeso.length > 1 ? (
                <Sparkline valori={corpo.trendPeso.map((p) => p.peso)} colore="#8b9dff" />
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

        <div className="card col-6" id="card-nutrition">
          <h3>
            Nutrizione
            <span className="h3-side" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => setMostraSalute(true)}>
              Storico 30gg →
            </span>
          </h3>
          <div className="num" style={{ fontSize: 22, fontWeight: 650 }}>
            {Math.round(totaliOggi.calorie)} <span className="meta">/ {obiettivoCalorico} kcal</span>
          </div>
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Proteine</span><span>{Math.round(totaliOggi.proteine)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.proteine, 4)}%`, background: "#38d6ff" }}></div></div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Carboidrati</span><span>{Math.round(totaliOggi.carboidrati)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.carboidrati, 4)}%`, background: "#ffb547" }}></div></div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label"><span>Grassi</span><span>{Math.round(totaliOggi.grassi)}g</span></div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${percMacro(totaliOggi.grassi, 9)}%`, background: "#f472b6" }}></div></div>
            </div>
          </div>
          <input
            className="soft-input"
            type="text"
            placeholder={stimando ? "Sto stimando…" : "Descrivi un pasto e premi Invio…"}
            value={descrizionePasto}
            disabled={stimando}
            onChange={(e) => setDescrizionePasto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aggiungiPasto()}
            style={{ marginBottom: 8 }}
          />
          {pasti.map((p) => (
            <PastoRow key={p.id} pasto={p} onSaved={(updated) => setPasti((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
          ))}
        </div>

        <div className="card col-3" id="card-goals">
          <h3>Obiettivi</h3>
          {["settimana", "mese"].map((sezione) => (
            <div className="goal-section" key={sezione}>
              <div className="sec-label">{sezione === "settimana" ? "Questa settimana" : "Questo mese"}</div>
              {obiettivi[sezione]?.map((g) => (
                <div className={`goal-row ${g.fatto ? "done" : ""}`} key={g.id}>
                  <span onClick={() => toggleObiettivo(sezione, g)} style={{ color: g.fatto ? "var(--green)" : "#fde047" }}>{g.fatto ? "✓" : "○"}</span>
                  <span onClick={() => toggleObiettivo(sezione, g)} style={{ flex: 1 }}>{g.label}</span>
                  <span onClick={() => rimuoviObiettivo(sezione, g.id)} style={{ opacity: 0.5, fontSize: 11 }}>×</span>
                </div>
              ))}
              <input
                className="soft-input"
                type="text"
                placeholder="+ aggiungi…"
                value={nuovoObiettivo[sezione]}
                onChange={(e) => setNuovoObiettivo((prev) => ({ ...prev, [sezione]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && aggiungiObiettivo(sezione)}
                style={{ marginTop: 6, padding: "6px 10px", fontSize: 12.5 }}
              />
            </div>
          ))}
        </div>

        <div className="card col-3" id="card-blockers">
          <h3>Bloccato</h3>
          {bloccati === null && <p className="meta">Caricamento…</p>}
          {bloccati?.length === 0 && <p className="meta">Niente in ritardo.</p>}
          {bloccati?.map((b, i) => (
            <div className="blocker-row" key={i}>
              <span className="who">
                {b.titolo}
                {b.persona && b.persona !== "—" && <span className="meta"> · {b.persona}</span>}
              </span>
              <span className="days">{b.giorni}gg</span>
            </div>
          ))}
        </div>

        <div className="card col-12" id="card-calendar">
          <h3>La settimana</h3>
          {eventiCalendario === null && <p className="meta">Caricamento…</p>}
          {eventiCalendario !== null && (
            <div className="week-grid">
              {settimana.map((d) => {
                const chiave = chiaveGiorno(d);
                const delGiorno = eventiCalendario
                  .filter((e) => chiaveGiorno(new Date(e.inizio)) === chiave)
                  .sort((a, b) => new Date(a.inizio) - new Date(b.inizio));
                return (
                  <div key={chiave} className={`week-day ${chiave === oggiChiave ? "today" : ""}`}>
                    <div className="wd">{DOW_LABELS[d.getDay()]}</div>
                    <div className="wn">{d.getDate()}</div>
                    {delGiorno.map((e, i) => (
                      <div className="week-ev" key={i} title={`${e.titolo} · ${e.fonte}`}>
                        <span className="t">{ora(e.inizio)}</span>
                        {e.titolo}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {mostraSalute && <SalutePanel onClose={() => setMostraSalute(false)} />}
    </section>
  );
}
