"use client";

import { useEffect, useMemo, useState } from "react";

const FASCE = [
  { id: "in_ritardo", label: "In ritardo" },
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
  { id: "piu_avanti", label: "Più avanti" },
];

const TEMP_COLOR = { caldo: "var(--red)", tiepido: "var(--orange)", freddo: "var(--text-faint)" };

async function fetchTasks() {
  const res = await fetch("/api/tasks", { cache: "no-store" });
  const data = await res.json();
  return data.tasks || [];
}

function TaskCard({ task, onClick, draggable, onDragStart }) {
  return (
    <div
      className="kanban-card"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="kc-title">{task.titolo}</div>
      <div className="kc-meta">
        <span className="kc-person">{task.persone?.nome || "—"}</span>
        <span className="temp-badge" style={{ background: TEMP_COLOR[task.temperatura] || TEMP_COLOR.freddo }}></span>
      </div>
    </div>
  );
}

function DetailPanel({ task, onClose, onSaved }) {
  const [form, setForm] = useState(task);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(task), [task]);

  async function save(patch) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      onSaved(data.task);
    } finally {
      setSaving(false);
    }
  }

  function handleField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleBlur(field, value) {
    save({ [field]: value });
  }

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>Dettaglio</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div>
          <div className="field-label">Titolo</div>
          <input
            type="text"
            value={form.titolo || ""}
            onChange={(e) => handleField("titolo", e.target.value)}
            onBlur={(e) => handleBlur("titolo", e.target.value)}
          />
        </div>

        <div>
          <div className="field-label">Nota</div>
          <textarea
            value={form.nota || ""}
            onChange={(e) => handleField("nota", e.target.value)}
            onBlur={(e) => handleBlur("nota", e.target.value)}
          />
        </div>

        <div className="panel-row">
          <div>
            <div className="field-label">Fascia</div>
            <select
              value={form.urgenza_effettiva || form.urgenza}
              onChange={(e) => {
                handleField("urgenza", e.target.value);
                save({ urgenza: e.target.value });
              }}
            >
              {FASCE.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="field-label">Temperatura</div>
            <select
              value={form.temperatura}
              onChange={(e) => {
                handleField("temperatura", e.target.value);
                save({ temperatura: e.target.value });
              }}
            >
              <option value="caldo">Caldo</option>
              <option value="tiepido">Tiepido</option>
              <option value="freddo">Freddo</option>
            </select>
          </div>
        </div>

        <div>
          <div className="field-label">Persona</div>
          <input
            type="text"
            value={form.persone?.nome || ""}
            onChange={(e) => handleField("persone", { nome: e.target.value })}
            onBlur={(e) => handleBlur("persona", e.target.value || null)}
          />
        </div>

        <div className="panel-actions">
          <button className="danger" onClick={() => save({ completare: true }).then(onClose)} disabled={saving}>
            Completa
          </button>
          <button className="primary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

export default function Crm({ openTaskId, onTaskOpened }) {
  const [view, setView] = useState("kanban");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [dragTaskId, setDragTaskId] = useState(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("personalos:crm-view");
    if (saved) setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("personalos:crm-view", view);
  }, [view]);

  function load() {
    setLoading(true);
    fetchTasks().then((t) => {
      setTasks(t);
      setLoading(false);
    });
  }

  useEffect(load, []);

  useEffect(() => {
    if (openTaskId) {
      setSelectedId(openTaskId);
      onTaskOpened?.();
    }
  }, [openTaskId]);

  // La selezione viaggia per identificativo, mai per posizione: ricalcolata
  // a ogni render cercando l'id nella lista corrente (Parte 5.4).
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedId) || null, [tasks, selectedId]);

  const byFascia = useMemo(() => {
    const map = { in_ritardo: [], oggi: [], settimana: [], piu_avanti: [] };
    for (const t of tasks) {
      const f = t.urgenza_effettiva || t.urgenza;
      if (map[f]) map[f].push(t);
    }
    return map;
  }, [tasks]);

  const byPersona = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = t.persone?.nome || "Senza persona";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const senzaPersona = map.get("Senza persona");
    map.delete("Senza persona");
    const entries = [...map.entries()];
    if (senzaPersona) entries.push(["Senza persona", senzaPersona]);
    return entries;
  }, [tasks]);

  const risultatiRicerca = useMemo(() => {
    if (!query.trim()) return tasks;
    const q = query.toLowerCase();
    return tasks.filter(
      (t) => t.titolo?.toLowerCase().includes(q) || t.persone?.nome?.toLowerCase().includes(q) || t.nota?.toLowerCase().includes(q)
    );
  }, [tasks, query]);

  function handleDrop(fasciaId) {
    if (!dragTaskId) return;
    const dragged = tasks.find((t) => t.id === dragTaskId);
    if (!dragged) return;
    const nuoveFasce = { ...byFascia };
    // rimuovi da dove stava, aggiungi in fondo alla fascia di destinazione
    for (const key of Object.keys(nuoveFasce)) {
      nuoveFasce[key] = nuoveFasce[key].filter((t) => t.id !== dragTaskId);
    }
    nuoveFasce[fasciaId] = [...nuoveFasce[fasciaId], { ...dragged, urgenza_effettiva: fasciaId }];

    setTasks((prev) => prev.map((t) => (t.id === dragTaskId ? { ...t, urgenza_effettiva: fasciaId, urgenza: fasciaId } : t)));
    setDragTaskId(null);

    fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urgenza: fasciaId, orderedIds: nuoveFasce[fasciaId].map((t) => t.id) }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(load); // la scrittura è fallita: rilegge lo stato vero dal server
  }

  return (
    <section className="screen active" id="screen-crm">
      <div id="view-switch">
        <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>Kanban</button>
        <button className={view === "persona" ? "active" : ""} onClick={() => setView("persona")}>Per persona</button>
        <button className={view === "ricerca" ? "active" : ""} onClick={() => setView("ricerca")}>Ricerca</button>
      </div>

      {loading && <p className="meta">Caricamento…</p>}

      {!loading && view === "kanban" && (
        <div className="kanban">
          {FASCE.map((f) => (
            <div
              className="kanban-col"
              key={f.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(f.id)}
            >
              <h4>{f.label} <span>{byFascia[f.id].length}</span></h4>
              {byFascia[f.id].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  draggable
                  onDragStart={() => setDragTaskId(t.id)}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && view === "persona" && (
        <div>
          {byPersona.map(([persona, items]) => (
            <div className="person-group" key={persona}>
              <h4>{persona}</h4>
              {items.map((t) => (
                <div key={t.id} className="task-row" style={{ marginBottom: 6 }} onClick={() => setSelectedId(t.id)}>
                  <span className="dot" style={{ background: TEMP_COLOR[t.temperatura] }}></span>
                  <span className="title">{t.titolo}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && view === "ricerca" && (
        <div>
          <input
            type="text"
            className="crm-search-input"
            placeholder="Cerca per titolo, persona o nota…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {risultatiRicerca.map((t) => (
            <div key={t.id} className="task-row" style={{ marginBottom: 6 }} onClick={() => setSelectedId(t.id)}>
              <span className="dot" style={{ background: TEMP_COLOR[t.temperatura] }}></span>
              <span className="title">{t.titolo}</span>
              <span className="person">{t.persone?.nome || ""}</span>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <DetailPanel task={selectedTask} onClose={() => setSelectedId(null)} onSaved={load} />
      )}
    </section>
  );
}
