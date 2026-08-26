"use client";

import { useState } from "react";

export default function CaptureBar() {
  const [text, setText] = useState("");

  return (
    <div id="capture-bar">
      <button className="mic-btn" aria-label="microfono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v4" />
        </svg>
      </button>
      <input
        type="text"
        placeholder="Scrivi o parla…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="send-btn" aria-label="invia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
