"use client";

import { useState } from "react";

const columns = [
  {
    id: "in_ritardo",
    label: "In ritardo",
    items: [
      { title: "Inviare relazione APE firmata", person: "Studio Rossi", temp: "hot" },
      { title: "Sollecitare pagamento fattura", person: "Comune di Sesto", temp: "warm" },
    ],
  },
  {
    id: "oggi",
    label: "Oggi",
    items: [
      { title: "Richiamare per preventivo cappotto", person: "Marco Bianchi", temp: "hot" },
      { title: "Confermare sopralluogo venerdì", person: "Laura Verdi", temp: "warm" },
    ],
  },
  {
    id: "settimana",
    label: "Questa settimana",
    items: [{ title: "Preparare relazione termica", person: "Studio Bianchi", temp: "cold" }],
  },
  {
    id: "avanti",
    label: "Più avanti",
    items: [{ title: "Aggiornare listino 2027", person: "—", temp: "cold" }],
  },
];

const tempColor = { hot: "var(--red)", warm: "var(--orange)", cold: "var(--text-faint)" };

export default function Crm() {
  const [view, setView] = useState("kanban");

  return (
    <section className="screen active" id="screen-crm">
      <div id="view-switch">
        <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
          Kanban
        </button>
        <button className={view === "persona" ? "active" : ""} onClick={() => setView("persona")}>
          Per persona
        </button>
        <button className={view === "ricerca" ? "active" : ""} onClick={() => setView("ricerca")}>
          Ricerca
        </button>
      </div>

      {view === "kanban" && (
        <div className="kanban">
          {columns.map((col) => (
            <div className="kanban-col" key={col.id}>
              <h4>
                {col.label} <span>{col.items.length}</span>
              </h4>
              {col.items.map((item) => (
                <div className="kanban-card" key={item.title}>
                  <div className="kc-title">{item.title}</div>
                  <div className="kc-meta">
                    <span className="kc-person">{item.person}</span>
                    <span className="temp-badge" style={{ background: tempColor[item.temp] }}></span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {view !== "kanban" && (
        <div className="card">
          <h3>{view === "persona" ? "Per persona" : "Ricerca"}</h3>
          <p className="meta">In arrivo con la scheda CRM completa (Parte 5.4).</p>
        </div>
      )}
    </section>
  );
}
