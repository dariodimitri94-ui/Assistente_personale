-- Clienti + newsletter: la tabella "persone" diventa anche l'anagrafica
-- clienti (email, telefono, consenso, tag per segmentare gli invii) invece
-- di aggiungerne una nuova — è già l'unico posto dove vive un contatto.

alter table persone add column if not exists email text;
alter table persone add column if not exists telefono text;
alter table persone add column if not exists tag text[] not null default '{}';
alter table persone add column if not exists consenso_newsletter boolean not null default true;

create index if not exists persone_tag_idx on persone using gin (tag);
create index if not exists persone_email_idx on persone (user_id, email);

-- ============================================================
-- newsletter — una riga per campagna (bozza o inviata). "destinatari" e
-- "falliti" sono un'istantanea di chi ha ricevuto cosa: la lista dei
-- clienti cambia nel tempo, la storia di un invio no.
-- ============================================================
create table if not exists newsletter (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  oggetto text not null,
  corpo text not null,
  tag_filtro text[] not null default '{}',
  stato text not null default 'bozza', -- bozza | inviata
  destinatari integer not null default 0,
  falliti jsonb not null default '[]', -- [{ email, errore }]
  inviata_il timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsletter_user_id_idx on newsletter (user_id, created_at desc);
alter table newsletter enable row level security;
