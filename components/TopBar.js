"use client";

const SCREENS = [
  { id: "home", label: "Home" },
  { id: "crm", label: "CRM" },
  { id: "finance", label: "Finanze" },
  { id: "review", label: "Review" },
];

export default function TopBar({ active, onSelect }) {
  return (
    <header id="topbar">
      <div className="brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
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
      </nav>
    </header>
  );
}
