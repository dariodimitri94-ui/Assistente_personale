"use client";

import { useEffect, useRef, useState } from "react";

export default function Finance() {
  const [dati, setDati] = useState(null);
  const [caricando, setCaricando] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);
  const [errore, setErrore] = useState("");
  const inputRef = useRef(null);

  function carica() {
    fetch("/api/finance")
      .then((r) => r.json())
      .then(setDati);
  }

  useEffect(carica, []);

  async function onFileSelezionato(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore("");
    setCaricando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/finance/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("caricamento fallito");
      carica();
    } catch {
      setErrore("Caricamento fallito, riprova.");
    } finally {
      setCaricando(false);
      e.target.value = "";
    }
  }

  async function aggiorna() {
    setErrore("");
    setAggiornando(true);
    try {
      const res = await fetch("/api/finance/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "estrazione fallita");
      carica();
    } catch (e) {
      setErrore(e.message);
    } finally {
      setAggiornando(false);
    }
  }

  const ultima = dati?.ultima;

  return (
    <section className="screen active" id="screen-finance">
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFileSelezionato} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={caricando}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
        >
          {caricando ? "Carico…" : "Carica foglio"}
        </button>
        <button
          onClick={aggiorna}
          disabled={aggiornando || !dati?.file}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0b0d12", fontWeight: 600, opacity: dati?.file ? 1 : 0.5 }}
        >
          {aggiornando ? "Estraggo…" : "Aggiorna"}
        </button>
        <span className="meta">
          {dati?.file ? `File: ${dati.file.filename}` : "Nessun file caricato"}
          {ultima ? ` · aggiornato ${new Date(ultima.estratto_il).toLocaleString("it-IT")}` : ""}
        </span>
        {errore && <span style={{ color: "var(--red)", fontSize: 12.5 }}>{errore}</span>}
      </div>

      {!ultima && <p className="meta">Carica il tuo foglio e premi "Aggiorna" per vedere i numeri qui.</p>}

      {ultima && (
        <>
          <div className="finance-hero">
            <div className="card big">
              <div className="amount num" style={{ color: "var(--green)" }}>+{ultima.entrate_totali.toFixed(2)} €</div>
              <div className="label">Entrate · {ultima.mese_riferimento}</div>
            </div>
            <div className="card big">
              <div className="amount num" style={{ color: "var(--red)" }}>−{ultima.uscite_totali.toFixed(2)} €</div>
              <div className="label">Uscite · {ultima.mese_riferimento}</div>
            </div>
            <div className="card big">
              <div className="amount num" style={{ color: ultima.saldo >= 0 ? "var(--green)" : "var(--red)" }}>
                {ultima.saldo >= 0 ? "+" : ""}{ultima.saldo.toFixed(2)} €
              </div>
              <div className="label">
                Saldo{dati.deltaSaldo !== null ? ` · ${dati.deltaSaldo >= 0 ? "▲" : "▼"} ${Math.abs(dati.deltaSaldo).toFixed(2)} € dall'ultimo aggiornamento` : ""}
              </div>
            </div>
          </div>
          {ultima.note && (
            <div className="card" style={{ marginBottom: 16, fontSize: 13, color: "var(--orange)" }}>
              Nota dall'estrazione: {ultima.note}
            </div>
          )}
          <div className="card">
            <h3>Categorie — {ultima.mese_riferimento}</h3>
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th className="num">Valore</th>
                </tr>
              </thead>
              <tbody>
                {ultima.categorie.map((c, i) => (
                  <tr key={i}>
                    <td>{c.nome}</td>
                    <td><span className="type-tag">{c.tipo}</span></td>
                    <td className="num">{c.totale.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
