"use client";

import { useEffect, useRef, useState } from "react";

const DESTINAZIONE_LABEL = {
  task: "Task",
  persone: "Persone",
  finanze: "Finanze",
  nutrizione: "Nutrizione",
  salute: "Salute",
  obiettivi: "Obiettivi",
  memoria: "Memoria",
};

export default function CaptureBar() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("riposo"); // riposo | ascolto | elaborazione | fatto
  const [message, setMessage] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setStatus((s) => (s === "ascolto" ? "riposo" : s));
    recognition.onerror = () => setStatus("riposo");

    recognitionRef.current = recognition;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (status === "ascolto") {
      recognitionRef.current.stop();
      setStatus("riposo");
    } else {
      setStatus("ascolto");
      recognitionRef.current.start();
    }
  }

  async function invia() {
    const testo = text.trim();
    if (!testo) return;
    setStatus("elaborazione");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "errore");
      setMessage(`→ ${DESTINAZIONE_LABEL[data.destinazione] || data.destinazione}`);
      setText("");
      setStatus("fatto");
    } catch {
      setMessage("Errore, riprova");
      setStatus("fatto");
    } finally {
      setTimeout(() => {
        setStatus("riposo");
        setMessage("");
      }, 2000);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") invia();
  }

  return (
    <div id="capture-bar">
      {status === "fatto" && message && <span className="status">{message}</span>}
      <button
        className={`mic-btn ${status === "ascolto" ? "listening" : ""}`}
        aria-label="microfono"
        onClick={toggleMic}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v4" />
        </svg>
      </button>
      <input
        type="text"
        placeholder={status === "elaborazione" ? "Sto smistando…" : "Scrivi o parla…"}
        value={text}
        disabled={status === "elaborazione"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="send-btn" aria-label="invia" onClick={invia} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
