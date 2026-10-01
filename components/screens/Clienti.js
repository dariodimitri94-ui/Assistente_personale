"use client";

import { useEffect, useMemo, useState } from "react";

async function fetchClienti() {
  const res = await fetch("/api/clienti", { cache: "no-store" });
  const data = await res.json();
  return data.clienti || [];
}

function tagsDaTesto(testo) {
  return testo
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function ClientePanel({ cliente, onClose, onSaved, onDeleted }) {
  const isNuovo = !cliente.id;
  const [form, setForm] = useState({
    nome: cliente.nome || "",
    email: cliente.email || "",
    telefono: cliente.telefono || "",
    organizzazione: cliente.organizzazione || "",
    tagTesto: (cliente.tag || []).join(", "),
    consenso_newsletter: cliente.consenso_newsletter !== false,
  });
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");

  function campo(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function salva() {
    if (!form.nome.trim()) {
      setErrore("Il nome è obbligatorio.");
      return;
    }
    setErrore("");
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        organizzazione: form.organizzazione.trim() || null,
        tag: tagsDaTesto(form.tagTesto),
        consenso_newsletter: form.consenso_newsletter,
      };
      const res = await fetch(isNuovo ? "/api/clienti" : `/api/clienti/${cliente.id}`, {
        method: isNuovo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "salvataggio fallito");
      onSaved(data.cliente);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function elimina() {
    if (!confirm(`Eliminare ${cliente.nome} dall'anagrafica?`)) return;
    setSaving(true);
    try {
      await fetch(`/api/clienti/${cliente.id}`, { method: "DELETE" });
      onDeleted(cliente.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>{isNuovo ? "Nuovo cliente" : "Dettaglio cliente"}</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div>
          <div className="field-label">Nome</div>
          <input type="text" value={form.nome} onChange={(e) => campo("nome", e.target.value)} />
        </div>

        <div className="panel-row">
          <div>
            <div className="field-label">Email</div>
            <input type="email" value={form.email} onChange={(e) => campo("email", e.target.value)} />
          </div>
          <div>
            <div className="field-label">Telefono</div>
            <input type="text" value={form.telefono} onChange={(e) => campo("telefono", e.target.value)} />
          </div>
        </div>

        <div>
          <div className="field-label">Organizzazione</div>
          <input type="text" value={form.organizzazione} onChange={(e) => campo("organizzazione", e.target.value)} />
        </div>

        <div>
          <div className="field-label">Tag (separati da virgola — es. ecobonus, natale-2026)</div>
          <input type="text" value={form.tagTesto} onChange={(e) => campo("tagTesto", e.target.value)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
          <input
            type="checkbox"
            checked={form.consenso_newsletter}
            onChange={(e) => campo("consenso_newsletter", e.target.checked)}
          />
          Consenso a ricevere newsletter
        </label>

        {errore && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{errore}</div>}

        <div className="panel-actions">
          {!isNuovo && (
            <button className="danger" onClick={elimina} disabled={saving}>
              Elimina
            </button>
          )}
          <button className="primary" onClick={salva} disabled={saving}>
            {saving ? "Salvo…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clienti() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [panelCliente, setPanelCliente] = useState(null);

  function load() {
    setLoading(true);
    fetchClienti().then((c) => {
      setClienti(c);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const filtrati = useMemo(() => {
    if (!query.trim()) return clienti;
    const q = query.toLowerCase();
    return clienti.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.organizzazione?.toLowerCase().includes(q) ||
        (c.tag || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [clienti, query]);

  return (
    <section className="screen active" id="screen-clienti">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          className="crm-search-input"
          style={{ marginBottom: 0, flex: 1 }}
          placeholder="Cerca per nome, email, organizzazione o tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#0b0d12", fontWeight: 600, flexShrink: 0 }}
          onClick={() => setPanelCliente({})}
        >
          + Nuovo cliente
        </button>
      </div>

      {loading && <p className="meta">Caricamento…</p>}
      {!loading && !filtrati.length && <p className="meta">Nessun cliente trovato.</p>}

      {!loading && !!filtrati.length && (
        <div className="card">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Tag</th>
                <th>Newsletter</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setPanelCliente(c)}>
                  <td>{c.nome}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.telefono || "—"}</td>
                  <td>
                    {(c.tag || []).map((t) => (
                      <span key={t} className="type-tag" style={{ marginRight: 4 }}>{t}</span>
                    ))}
                  </td>
                  <td>{c.consenso_newsletter ? "Sì" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelCliente && (
        <ClientePanel
          cliente={panelCliente}
          onClose={() => setPanelCliente(null)}
          onSaved={() => {
            setPanelCliente(null);
            load();
          }}
          onDeleted={() => {
            setPanelCliente(null);
            load();
          }}
        />
      )}
    </section>
  );
}
