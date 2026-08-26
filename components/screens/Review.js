"use client";

import { useEffect, useState } from "react";

export default function Review() {
  const [dati, setDati] = useState(null);

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then(setDati);
  }, []);

  if (!dati) {
    return (
      <section className="screen active" id="screen-review">
        <p className="meta">Caricamento…</p>
      </section>
    );
  }

  return (
    <section className="screen active" id="screen-review">
      <div className="grid">
        <div className="card col-6">
          <h3>Cosa è andato — ultimi 7 giorni</h3>
          {dati.completati.length === 0 && <p className="meta">Niente completato questa settimana.</p>}
          {dati.completati.map((d, i) => (
            <div className="review-item" key={i}>
              <span className="review-icon">✓</span>
              <span>{d.titolo}{d.persona ? ` — ${d.persona}` : ""}</span>
            </div>
          ))}
        </div>
        <div className="card col-6">
          <h3>Cosa resta aperto</h3>
          {dati.inRitardo.length === 0 && <p className="meta">Niente in ritardo.</p>}
          {dati.inRitardo.map((o, i) => (
            <div className="review-item" key={i}>
              <span className="review-icon" style={{ color: "var(--red)" }}>●</span>
              <span>{o.titolo}{o.persona ? ` — ${o.persona}` : ""}</span>
            </div>
          ))}
          <p className="meta" style={{ marginTop: 8 }}>
            + {dati.apertiCount} elementi ancora aperti (oggi/questa settimana)
          </p>
        </div>
        <div className="card col-12">
          <h3>Le priorità della settimana (dai tuoi Obiettivi)</h3>
          {dati.priorita.length === 0 && <p className="meta">Nessun obiettivo settimanale ancora aperto — aggiungine uno dalla Home.</p>}
          {dati.priorita.map((p, i) => (
            <div className="priority-row" key={p.id}>
              <span className="priority-num">{i + 1}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
