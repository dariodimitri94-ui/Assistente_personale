"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Password errata.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0f1115)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--surface, #171a21)",
          border: "1px solid var(--border, #2a2f3a)",
          borderRadius: 12,
          padding: 32,
          width: "min(360px, 90vw)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text, #e8eaed)" }}>PersonalOS</h1>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #2a2f3a)",
            background: "var(--surface-2, #1e222b)",
            color: "var(--text, #e8eaed)",
            fontSize: 14,
          }}
        />
        {error && <div style={{ color: "var(--red, #e5636b)", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent, #6c8cff)",
            color: "#0b0d12",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {loading ? "Verifica…" : "Entra"}
        </button>
      </form>
    </div>
  );
}
