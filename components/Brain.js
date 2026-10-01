"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const NODE_COLORS = {
  io: "#ffffff",
  persona: "#38d6ff",
  task: "#ffb547",
  memoria: "#a78bfa",
  evento: "#4ade80",
  abitudine: "#f472b6",
  obiettivo: "#fde047",
  finanza: "#2dd4bf",
};

export const NODE_LABELS = {
  io: "Tu",
  persona: "Persona",
  task: "Task",
  memoria: "Ricordo",
  evento: "Evento",
  abitudine: "Abitudine",
  obiettivo: "Obiettivo",
  finanza: "Finanze",
};

const LEGENDA = ["persona", "task", "memoria", "evento", "abitudine", "obiettivo", "finanza"];

function dettaglio(n) {
  if (!n) return "";
  if (n.type === "memoria") return n.data ? `catturato il ${n.data.split("-").reverse().join("/")}` : "";
  if (n.type === "task") return n.fascia ? `fascia: ${n.fascia.replace("_", " ")}` : "";
  if (n.type === "evento" && n.inizio)
    return `${new Date(n.inizio).toLocaleString("it-IT", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${n.fonte}`;
  if (n.type === "persona") return n.meta || "";
  if (n.type === "obiettivo") return n.sezione === "mese" ? "questo mese" : "questa settimana";
  return "";
}

export default function Brain({ data, onOpenTask }) {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const selectedRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);

  const { nodes, links, adj, byId } = useMemo(() => {
    const nodes = (data?.nodes || []).map((n) => ({ ...n, r: n.size || 6 }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links = (data?.links || []).filter((l) => byId[l.source] && byId[l.target]);
    const adj = Object.fromEntries(nodes.map((n) => [n.id, new Set()]));
    links.forEach((l) => {
      adj[l.source].add(l.target);
      adj[l.target].add(l.source);
    });
    return { nodes, links, adj, byId };
  }, [data]);

  useEffect(() => {
    selectedRef.current = selectedId ? byId[selectedId] || null : null;
  }, [selectedId, byId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;
    let inizializzato = false;
    let hovered = null;
    let dragging = null;
    let raf = 0;
    const pulses = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (inizializzato) {
        const dx = (rect.width - W) / 2, dy = (rect.height - H) / 2;
        nodes.forEach((n) => { n.x += dx; n.y += dy; });
      }
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step() {
      // Su schermi stretti la repulsione cala, altrimenti i nodi escono dai bordi
      const k = 5200 * Math.min(1, Math.max(0.45, (W * H) / (760 * 540)));
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 12);
          const f = Math.min(k / (d * d), 3);
          dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f;
          b.vx -= dx * f; b.vy -= dy * f;
        }
      }
      links.forEach((l) => {
        const a = byId[l.source], b = byId[l.target];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = l.source === "io" || l.target === "io" ? 120 : 70;
        const f = (d - target) * 0.006;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      });
      const t = performance.now() / 1000;
      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.0005 + Math.cos(t * 0.6 + n.phase) * 0.03;
        n.vy += (H / 2 - n.y) * 0.0009 + Math.sin(t * 0.5 + n.phase) * 0.03;
        if (n === dragging) return;
        // margini morbidi: spazio per le etichette, il titolo in alto e la legenda in basso
        const m = 55;
        if (n.x < m) n.vx += (m - n.x) * 0.05;
        if (n.x > W - m) n.vx -= (n.x - (W - m)) * 0.05;
        if (n.y < m + 10) n.vy += (m + 10 - n.y) * 0.05;
        if (n.y > H - m - 25) n.vy -= (n.y - (H - m - 25)) * 0.05;
        n.vx *= 0.82; n.vy *= 0.82;
        const v = Math.hypot(n.vx, n.vy);
        if (v > 4) { n.vx *= 4 / v; n.vy *= 4 / v; }
        n.x += n.vx; n.y += n.vy;
      });
    }

    function inizializza() {
      if (inizializzato || W < 50 || H < 50) return;
      inizializzato = true;
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2;
        const raggio = Math.min(W, H) * 0.32;
        n.x = W / 2 + Math.cos(a) * raggio + (Math.random() - 0.5) * 30;
        n.y = H / 2 + Math.sin(a) * raggio * 0.75 + (Math.random() - 0.5) * 30;
        n.vx = 0; n.vy = 0;
        n.phase = Math.random() * Math.PI * 2;
      });
      if (byId.io) { byId.io.x = W / 2; byId.io.y = H / 2; }
      for (let i = 0; i < 400; i++) step();
    }

    function isDim(n) {
      const s = selectedRef.current;
      if (!s) return false;
      return n !== s && !adj[s.id].has(n.id);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const s = selectedRef.current;

      links.forEach((l) => {
        const a = byId[l.source], b = byId[l.target];
        const active = s && (l.source === s.id || l.target === s.id);
        const dim = s && !active;
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g.addColorStop(0, NODE_COLORS[a.type]);
        g.addColorStop(1, NODE_COLORS[b.type]);
        ctx.strokeStyle = g;
        ctx.globalAlpha = dim ? 0.06 : active ? 0.8 : l.kind === "simile" ? 0.35 : 0.22;
        ctx.lineWidth = active ? 1.6 : 1;
        // i legami di somiglianza sono tratteggiati: sono "intuizioni", non fatti
        ctx.setLineDash(l.kind === "simile" ? [4, 4] : []);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const a = byId[p.from], b = byId[p.to];
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        const color = NODE_COLORS[b.type];
        ctx.shadowColor = color; ctx.shadowBlur = 12;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.sin(p.t * Math.PI) * (isDim(a) && isDim(b) ? 0.15 : 0.95);
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      const t = performance.now() / 1000;
      nodes.forEach((n) => {
        const color = NODE_COLORS[n.type];
        const dim = isDim(n);
        const breathe = 1 + Math.sin(t * 2 + n.phase) * 0.08;
        const r = n.r * breathe * (n === hovered || n === s ? 1.25 : 1);

        ctx.globalAlpha = dim ? 0.18 : 1;
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.2);
        halo.addColorStop(0, color + "55");
        halo.addColorStop(1, color + "00");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2); ctx.fill();

        ctx.shadowColor = color; ctx.shadowBlur = dim ? 0 : 14;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(n.x - r * 0.3, n.y - r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();

        const showLabel = !dim && (n.r >= 8 || n === hovered || n === s || (s && adj[s.id].has(n.id)));
        if (showLabel) {
          ctx.font = `${n.type === "io" ? 600 : 500} 12px Inter, Segoe UI, sans-serif`;
          ctx.fillStyle = "rgba(238,240,246,0.9)";
          ctx.textAlign = "center";
          const label = n.label.length > 26 ? n.label.slice(0, 25) + "…" : n.label;
          ctx.fillText(label, n.x, n.y + r + 15);
        }
      });
      ctx.globalAlpha = 1;
    }

    function loop() {
      inizializza();
      if (inizializzato) { step(); draw(); }
      raf = requestAnimationFrame(loop);
    }

    const pulseTimer = setInterval(() => {
      if (!inizializzato || links.length === 0) return;
      const s = selectedRef.current;
      const pool = s ? links.filter((l) => l.source === s.id || l.target === s.id) : links;
      if (pool.length === 0) return;
      const l = pool[Math.floor(Math.random() * pool.length)];
      const fwd = Math.random() > 0.5;
      pulses.push({ from: fwd ? l.source : l.target, to: fwd ? l.target : l.source, t: 0, speed: 0.008 + Math.random() * 0.01 });
    }, 220);

    function nodeAt(x, y) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < (n.r + 6) ** 2) return n;
      }
      return null;
    }
    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onMove(e) {
      const { x, y } = pos(e);
      if (dragging) { dragging.x = x; dragging.y = y; dragging.vx = 0; dragging.vy = 0; return; }
      hovered = nodeAt(x, y);
      canvas.style.cursor = hovered ? "pointer" : "grab";
      const tip = tooltipRef.current;
      if (!tip) return;
      if (hovered) {
        tip.style.opacity = 1;
        tip.style.left = Math.min(x + 14, W - 250) + "px";
        tip.style.top = y + 14 + "px";
        tip.querySelector(".t-type").textContent = NODE_LABELS[hovered.type];
        tip.querySelector(".t-type").style.color = NODE_COLORS[hovered.type];
        tip.querySelector(".t-label").textContent = hovered.testo || hovered.label;
      } else {
        tip.style.opacity = 0;
      }
    }
    function onLeave() { hovered = null; if (tooltipRef.current) tooltipRef.current.style.opacity = 0; }
    function onDown(e) {
      const { x, y } = pos(e);
      dragging = nodeAt(x, y);
      if (dragging) canvas.style.cursor = "grabbing";
    }
    function onUp() { dragging = null; }
    function onClick(e) {
      const { x, y } = pos(e);
      const n = nodeAt(x, y);
      setSelectedId(n ? n.id : null);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("click", onClick);
    window.addEventListener("mouseup", onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(pulseTimer);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("mouseup", onUp);
    };
  }, [nodes, links, adj, byId]);

  const selected = selectedId ? byId[selectedId] : null;
  const vicini = selected ? [...adj[selected.id]].map((id) => byId[id]).filter(Boolean) : [];
  const suggerimenti = (data?.suggerimenti || []).filter((s) => byId[s.a] && byId[s.b]);

  return (
    <section className="card col-12" id="brain-card">
      <div id="brain-wrap">
        <div className="brain-label">
          Il tuo cervello · {nodes.length} nodi · {links.length} connessioni
        </div>
        {!data && <div className="brain-empty">Sto collegando i tuoi pensieri…</div>}
        <canvas ref={canvasRef} id="brain" />
        <div id="brain-tooltip" ref={tooltipRef}>
          <div className="t-type" />
          <div className="t-label" />
        </div>
        <div className="brain-legend">
          {LEGENDA.map((t) => (
            <span key={t}>
              <i style={{ background: NODE_COLORS[t] }} />
              {NODE_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      <aside id="brain-side">
        {!selected && (
          <div>
            <div className="side-title">Tutto il cervello</div>
            <div className="focus-meta">Clicca un nodo per vedere a cosa è collegato. Trascinalo per spostarlo.</div>
          </div>
        )}
        {selected && (
          <>
            <div>
              <div className="side-title" style={{ color: NODE_COLORS[selected.type] }}>{NODE_LABELS[selected.type]}</div>
              <div className="focus-node">{selected.testo || selected.label}</div>
              <div className="focus-meta">{dettaglio(selected)}</div>
              {selected.type === "task" && selected.taskId && (
                <button className="side-btn" onClick={() => onOpenTask?.(selected.taskId)}>Apri nel CRM →</button>
              )}
            </div>
            <div>
              <div className="side-title" style={{ marginBottom: 8 }}>Connesso a · {vicini.length}</div>
              <div className="conn-list">
                {vicini.map((n) => (
                  <div className="conn" key={n.id} onClick={() => setSelectedId(n.id)}>
                    <i style={{ background: NODE_COLORS[n.type], boxShadow: `0 0 6px ${NODE_COLORS[n.type]}` }} />
                    <span>{n.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {suggerimenti.length > 0 && (
          <div className="insight">
            <b>Pensieri vicini</b>
            <div className="focus-meta" style={{ marginBottom: 6 }}>ricordi che si somigliano per significato</div>
            {suggerimenti.map((s, i) => (
              <div key={i} className="insight-pair" onClick={() => setSelectedId(s.a)}>
                «{byId[s.a].label}» <span>↔</span> «{byId[s.b].label}»
              </div>
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}
