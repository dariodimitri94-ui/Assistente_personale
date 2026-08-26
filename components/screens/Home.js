"use client";

import { useEffect, useState } from "react";

const week = [
  { dow: "Lun", day: 24 },
  { dow: "Mar", day: 25, today: true },
  { dow: "Mer", day: 26 },
  { dow: "Gio", day: 27 },
  { dow: "Ven", day: 28 },
  { dow: "Sab", day: 29 },
  { dow: "Dom", day: 30 },
];

const todayEvents = [
  { time: "09:00", title: "Sopralluogo APE — Via Torino 12" },
  { time: "14:30", title: "Call commercialista" },
  { time: "18:00", title: "Palestra" },
];

const habitsDemo = [
  { label: "Allenamento", type: "check", done: true },
  { label: "Lettura", type: "check", done: true },
  { label: "Acqua", type: "counter", value: 4, target: 8 },
];

const blockers = [
  { who: "Studio Rossi", days: 7 },
  { who: "Comune di Sesto", days: 4 },
  { who: "Marco Bianchi", days: 2 },
];

const goals = {
  week: [
    { label: "Chiudere 3 pratiche APE", done: true },
    { label: "Preventivo cappotto", done: false },
  ],
  month: [{ label: "Fatturato +10%", done: false }],
};

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

export default function Home() {
  const [profilo, setProfilo] = useState(null);
  const [striscia, setStriscia] = useState(0);
  const [sessionTasks, setSessionTasks] = useState(null);
  const now = useClock();

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
  }, []);

  function apriTask(id) {
    window.location.hash = `#crm/${id}`;
    window.dispatchEvent(new CustomEvent("personalos:apri-schermata", { detail: "crm" }));
  }

  const iniziali = profilo?.nome ? profilo.nome.slice(0, 2).toUpperCase() : "--";

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
          <div className="week-strip">
            {week.map((d) => (
              <div className={`day-pill ${d.today ? "today" : ""}`} key={d.day}>
                <span className="dow">{d.dow}</span>
                {d.day}
              </div>
            ))}
          </div>
          {todayEvents.map((e) => (
            <div className="event-row" key={e.time}>
              <span className="time">{e.time}</span>
              <span>{e.title}</span>
            </div>
          ))}
        </div>

        <div className="card col-3" id="card-habits">
          <h3>Abitudini</h3>
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
                strokeDasharray="75 100"
                strokeLinecap="round"
              />
            </svg>
            <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
              75%
            </div>
          </div>
          {habitsDemo.map((h) => (
            <div className="habit-row" key={h.label}>
              <span className={`habit-check ${h.type === "check" && h.done ? "done" : ""}`}>
                {h.type === "check" ? (h.done ? "✓" : "") : `${h.value}/${h.target}`}
              </span>
              <span className="label">{h.label}</span>
              {h.type === "counter" && (
                <span className="count">
                  {h.value}/{h.target}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="card col-3" id="card-blockers">
          <h3>Bloccato</h3>
          {blockers.map((b) => (
            <div className="blocker-row" key={b.who}>
              <span className="who">{b.who}</span>
              <span className="days">{b.days}gg</span>
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

        <div className="card col-3" id="card-nutrition">
          <h3>Nutrizione</h3>
          <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
            1840 / {profilo?.obiettivo_calorico || 2200} kcal
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="macro-bar-row">
              <div className="macro-label">
                <span>Proteine</span>
                <span>96g</span>
              </div>
              <div className="macro-track">
                <div className="macro-fill" style={{ width: "70%" }}></div>
              </div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label">
                <span>Carboidrati</span>
                <span>180g</span>
              </div>
              <div className="macro-track">
                <div className="macro-fill" style={{ width: "60%" }}></div>
              </div>
            </div>
            <div className="macro-bar-row">
              <div className="macro-label">
                <span>Grassi</span>
                <span>55g</span>
              </div>
              <div className="macro-track">
                <div className="macro-fill" style={{ width: "50%" }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card col-3" id="card-body-trend">
          <h3>Andamento fisico — 30gg</h3>
          <svg viewBox="0 0 200 60" preserveAspectRatio="none">
            <polyline
              points="0,20 25,25 50,22 75,30 100,28 125,35 150,32 175,40 200,38"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            />
          </svg>
          <div className="meta">78,4 kg · -1,1 kg</div>
        </div>

        <div className="card col-3" id="card-goals">
          <h3>Obiettivi</h3>
          <div className="goal-section">
            <div className="sec-label">Questa settimana</div>
            {goals.week.map((g) => (
              <div className={`goal-row ${g.done ? "done" : ""}`} key={g.label}>
                <span>{g.done ? "✓" : "○"}</span>
                <span>{g.label}</span>
              </div>
            ))}
          </div>
          <div className="goal-section">
            <div className="sec-label">Questo mese</div>
            {goals.month.map((g) => (
              <div className={`goal-row ${g.done ? "done" : ""}`} key={g.label}>
                <span>{g.done ? "✓" : "○"}</span>
                <span>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
