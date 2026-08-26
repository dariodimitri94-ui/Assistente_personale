const categories = [
  { name: "Conto corrente", type: "liquidità", value: "€ 8.400" },
  { name: "ETF accumulo", type: "investito", value: "€ 31.900" },
  { name: "Fondo pensione", type: "investito", value: "€ 5.280" },
  { name: "Carta di credito", type: "debito", value: "€ 1.200" },
  { name: "Prestito auto", type: "debito", value: "€ 2.000" },
];

export default function Finance() {
  return (
    <section className="screen active" id="screen-finance">
      <div className="finance-hero">
        <div className="card big">
          <div className="amount num">€ 42.380</div>
          <div className="label">Patrimonio netto · aggiornato alle 09:12</div>
        </div>
        <div className="card big">
          <div className="amount num" style={{ color: "var(--green)" }}>
            +€ 610
          </div>
          <div className="label">Ultimi 30 giorni</div>
        </div>
        <div className="card big">
          <div className="amount num" style={{ color: "var(--red)" }}>
            € 3.200
          </div>
          <div className="label">Debiti in essere</div>
        </div>
      </div>
      <div className="card">
        <h3>Categorie</h3>
        <table className="finance-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th className="num">Valore</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>
                  <span className="type-tag">{c.type}</span>
                </td>
                <td className="num">{c.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
