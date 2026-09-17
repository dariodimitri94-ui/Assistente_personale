"use client";

import { useEffect, useMemo, useState } from "react";

async function fetchClienti() {
  const res = await fetch("/api/clienti", { cache: "no-store" });
  const data = await res.json();
  return data.clienti || [];
}

async function fetchNewsletters() {
  const res = await fetch("/api/newsletter", { cache: "no-store" });
  const data = await res.json();
  return data.newsletters || [];
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

function AnagraficaView({ clienti, loading, onReload }) {
  const [query, setQuery] = useState("");
  const [panelCliente, setPanelCliente] = useState(null);

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
    <div>
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
            onReload();
          }}
          onDeleted={() => {
            setPanelCliente(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}

const NEWSLETTER_VUOTA = { oggetto: "", corpo: "", tag_filtro: [] };

function NewsletterView({ clienti, tuttiTag }) {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(NEWSLETTER_VUOTA);
  const [preview, setPreview] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState("");

  function load() {
    setLoading(true);
    fetchNewsletters().then((n) => {
      setNewsletters(n);
      setLoading(false);
    });
  }

  useEffect(load, []);

  useEffect(() => {
    const params = new URLSearchParams({ perNewsletter: "1" });
    form.tag_filtro.forEach((t) => params.append("tag", t));
    fetch(`/api/clienti?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setPreview(d.clienti || []));
  }, [form.tag_filtro, clienti]);

  function toggleTag(tag) {
    setForm((f) => ({
      ...f,
      tag_filtro: f.tag_filtro.includes(tag) ? f.tag_filtro.filter((t) => t !== tag) : [...f.tag_filtro, tag],
    }));
  }

  function nuovaBozza() {
    setEditingId(null);
    setForm(NEWSLETTER_VUOTA);
    setErrore("");
  }

  function modificaBozza(nl) {
    setEditingId(nl.id);
    setForm({ oggetto: nl.oggetto, corpo: nl.corpo, tag_filtro: nl.tag_filtro || [] });
    setErrore("");
  }

  async function salvaBozza() {
    if (!form.oggetto.trim() || !form.corpo.trim()) {
      setErrore("Oggetto e testo sono obbligatori.");
      return;
    }
    setErrore("");
    setSalvando(true);
    try {
      const res = await fetch(editingId ? `/api/newsletter/${editingId}` : "/api/newsletter", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "salvataggio fallito");
      setEditingId(data.newsletter.id);
      load();
    } catch (e) {
      setErrore(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function invia() {
    if (!editingId) {
      setErrore("Salva prima la bozza.");
      return;
    }
    if (!preview.length) {
      setErrore("Nessun destinatario con email e consenso per i tag scelti.");
      return;
    }
    if (!confirm(`Inviare questa newsletter a ${preview.length} client${preview.length === 1 ? "e" : "i"}? L'invio non si può annullare.`)) {
      return;
    }
    setErrore("");
    setInviando(true);
    try {
      const res = await fetch(`/api/newsletter/${editingId}/invia`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "invio fallito");
      nuovaBozza();
      load();
    } catch (e) {
      setErrore(e.message);
    } finally {
      setInviando(false);
    }
  }

  async function eliminaBozza(id) {
    if (!confirm("Eliminare questa bozza?")) return;
    await fetch(`/api/newsletter/${id}`, { method: "DELETE" });
    if (editingId === id) nuovaBozza();
    load();
  }

  const modificabile = !editingId || newsletters.find((n) => n.id === editingId)?.stato !== "inviata";

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>{editingId ? "Modifica bozza" : "Nuova newsletter"}</h3>

        <div style={{ marginBottom: 12 }}>
          <div className="field-label">Oggetto</div>
          <input
            type="text"
            disabled={!modificabile}
            value={form.oggetto}
            onChange={(e) => setForm((f) => ({ ...f, oggetto: e.target.value }))}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13.5 }}
            placeholder="Es. Ecobonus 65%: puoi ancora usufruirne"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="field-label">Testo</div>
          <textarea
            disabled={!modificabile}
            value={form.corpo}
            onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
            rows={8}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
            placeholder="Un paragrafo per riga vuota va a capo come paragrafo separato nell'email."
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="field-label">Destinatari per tag (nessun tag = tutti i clienti con consenso)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tuttiTag.length === 0 && <span className="meta">Nessun tag ancora assegnato ai clienti.</span>}
            {tuttiTag.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                disabled={!modificabile}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  border: "1px solid var(--border)",
                  background: form.tag_filtro.includes(t) ? "var(--accent-dim)" : "var(--surface-2)",
                  color: form.tag_filtro.includes(t) ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="meta" style={{ marginTop: 8 }}>
            {preview.length} destinatari{preview.length ? `: ${preview.map((c) => c.nome).join(", ")}` : ""}
          </p>
        </div>

        {errore && <div style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 10 }}>{errore}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          {modificabile && (
            <button
              onClick={salvaBozza}
              disabled={salvando}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
            >
              {salvando ? "Salvo…" : "Salva bozza"}
            </button>
          )}
          {modificabile && (
            <button
              onClick={invia}
              disabled={inviando}
              style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0b0d12", fontWeight: 600 }}
            >
              {inviando ? "Invio…" : `Invia a ${preview.length}`}
            </button>
          )}
          {editingId && (
            <button
              onClick={nuovaBozza}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)" }}
            >
              Nuova bozza
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Storico</h3>
        {loading && <p className="meta">Caricamento…</p>}
        {!loading && !newsletters.length && <p className="meta">Nessuna newsletter ancora.</p>}
        {!loading &&
          newsletters.map((n) => (
            <div key={n.id} className="review-item" style={{ alignItems: "flex-start", cursor: n.stato === "bozza" ? "pointer" : "default" }}>
              <div style={{ flex: 1 }} onClick={() => n.stato === "bozza" && modificaBozza(n)}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.oggetto}</div>
                <div className="meta">
                  <span className="type-tag" style={{ marginRight: 6 }}>{n.stato}</span>
                  {n.stato === "inviata"
                    ? `${n.destinatari} destinatari · ${new Date(n.inviata_il).toLocaleString("it-IT")}${n.falliti?.length ? ` · ${n.falliti.length} falliti` : ""}`
                    : "bozza · clicca per modificare"}
                </div>
              </div>
              {n.stato === "bozza" && (
                <button
                  onClick={() => eliminaBozza(n.id)}
                  style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12 }}
                >
                  Elimina
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

export default function Clienti() {
  const [view, setView] = useState("anagrafica");
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchClienti().then((c) => {
      setClienti(c);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const tuttiTag = useMemo(() => {
    const set = new Set();
    for (const c of clienti) for (const t of c.tag || []) set.add(t);
    return [...set].sort();
  }, [clienti]);

  return (
    <section className="screen active" id="screen-clienti">
      <div id="view-switch">
        <button className={view === "anagrafica" ? "active" : ""} onClick={() => setView("anagrafica")}>Anagrafica</button>
        <button className={view === "newsletter" ? "active" : ""} onClick={() => setView("newsletter")}>Newsletter</button>
      </div>

      {view === "anagrafica" && <AnagraficaView clienti={clienti} loading={loading} onReload={load} />}
      {view === "newsletter" && <NewsletterView clienti={clienti} tuttiTag={tuttiTag} />}
    </section>
  );
}
