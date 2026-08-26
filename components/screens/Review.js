const done = [
  "3 pratiche APE chiuse",
  "Sopralluogo Via Torino completato",
  "Abitudini al 78% in media",
];

const open = [
  { text: "Relazione Studio Rossi, in ritardo da 7 giorni", color: "var(--red)" },
  { text: "Preventivo cappotto termico", color: "var(--orange)" },
];

const priorities = [
  "Chiudere la pratica Studio Rossi",
  "Inviare 2 preventivi nuovi",
  "Aggiornare il listino",
];

export default function Review() {
  return (
    <section className="screen active" id="screen-review">
      <div className="grid">
        <div className="card col-6">
          <h3>Cosa è andato</h3>
          {done.map((d) => (
            <div className="review-item" key={d}>
              <span className="review-icon">✓</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
        <div className="card col-6">
          <h3>Cosa resta aperto</h3>
          {open.map((o) => (
            <div className="review-item" key={o.text}>
              <span className="review-icon" style={{ color: o.color }}>
                ●
              </span>
              <span>{o.text}</span>
            </div>
          ))}
        </div>
        <div className="card col-12">
          <h3>Le tre priorità della prossima settimana</h3>
          {priorities.map((p, i) => (
            <div className="priority-row" key={p}>
              <span className="priority-num">{i + 1}</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
