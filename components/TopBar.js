"use client";

const SCREENS = [
  { id: "home", label: "Home" },
  { id: "crm", label: "CRM" },
  { id: "clienti", label: "Clienti" },
  { id: "finance", label: "Finanze" },
  { id: "review", label: "Review" },
];

export default function TopBar({ active, onSelect }) {
  return (
    <header id="topbar">
      <div className="brand">
        <span className="brand-dot" />
        PersonalOS
      </div>
      <nav id="tabs">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            className={active === s.id ? "active" : ""}
            onClick={() => onSelect(s.id)}
          >
            {s.label}
          </button>
        ))}
        <a href="/api/admin/export">
          Backup
        </a>
      </nav>
    </header>
  );
}
