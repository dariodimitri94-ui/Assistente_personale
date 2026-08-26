-- File del budget caricato dalla dashboard (Parte 5.8, adattata: siamo
-- online su Vercel, quindi il file va conservato nel database invece che
-- letto da un percorso locale). Una riga sola per utente, sovrascritta a
-- ogni nuovo caricamento.
create table if not exists finance_file (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  filename text not null,
  mime_type text not null,
  content_base64 text not null,
  uploaded_at timestamptz not null default now()
);
create unique index if not exists finance_file_user_id_idx on finance_file (user_id);
alter table finance_file enable row level security;
