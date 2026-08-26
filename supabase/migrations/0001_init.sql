-- PersonalOS — migrazione iniziale (Parte 3 / A6 della guida)
-- Applicare da SQL Editor del pannello Supabase (copia-incolla-esegui),
-- oppure: supabase login && supabase link && supabase db push

create extension if not exists vector;
create extension if not exists pgcrypto; -- per gen_random_uuid()

-- ============================================================
-- profilo — una riga sola, dati di configurazione
-- ============================================================
create table if not exists profilo (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  nome text,
  ruolo text,
  citta text,
  focus_del_giorno text,
  abitudini jsonb not null default '[]', -- [{ id, label, tipo: 'spunta'|'contatore', obiettivo }]
  obiettivo_calorico integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profilo_user_id_idx on profilo (user_id);

-- ============================================================
-- catture — ogni frase che entra nel sistema
-- ============================================================
create table if not exists catture (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  testo_grezzo text not null,
  provenienza text not null default 'dashboard', -- dashboard | telegram | scorciatoia
  destinazione text, -- task | persone | finanze | nutrizione | salute | obiettivi | memoria
  smistato_in text, -- id della riga creata nella tabella di destinazione, se applicabile
  via_classificazione text not null default 'modello', -- modello | riserva | regole
  urgenza text,
  created_at timestamptz not null default now()
);
create index if not exists catture_user_id_idx on catture (user_id, created_at desc);

-- ============================================================
-- persone
-- ============================================================
create table if not exists persone (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  nome text not null,
  organizzazione text,
  tipo text, -- cliente | fornitore | contatto | altro
  metadati jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists persone_user_id_idx on persone (user_id);

-- ============================================================
-- task — gli elementi del CRM (Parte 5.4)
-- Nota: niente colonna "scadenza". Il CRM lavora per fasce (in_ritardo,
-- oggi, settimana, piu_avanti), non per date puntuali — è la scelta
-- esplicita della Parte 5.4 ("le liste a scadenza marciscono").
-- "posizione" è l'ordine manuale dentro la fascia, usato dal Kanban
-- e da Session per scegliere i tre task del mattino.
-- ============================================================
create table if not exists task (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  titolo text not null,
  nota text,
  urgenza text not null default 'oggi', -- in_ritardo | oggi | settimana | piu_avanti
  temperatura text not null default 'tiepido', -- caldo | tiepido | freddo
  persona_id uuid references persone (id) on delete set null,
  tag text[] not null default '{}',
  posizione integer not null default 0,
  completato_il timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_user_id_idx on task (user_id, urgenza, posizione);

-- ============================================================
-- log_giornalieri — una riga per data, con abitudini/pasti/obiettivi/finanze
-- ============================================================
create table if not exists log_giornalieri (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  data date not null,
  abitudini jsonb not null default '{}',  -- { "<habit_id>": true | numero }
  pasti jsonb not null default '[]',      -- [{ orario, nome, calorie, proteine, carboidrati, grassi, stimato }]
  obiettivi jsonb not null default '{}',  -- { settimana: [...], mese: [...] } — solo sulla riga sentinella 2000-01-01
  finanze jsonb,                          -- istantanea del Polso finanziario del giorno, se estratta
  created_at timestamptz not null default now()
);
create unique index if not exists log_giornalieri_user_data_idx on log_giornalieri (user_id, data);

-- ============================================================
-- memoria — testo + embedding per la ricerca semantica
-- ============================================================
create table if not exists memoria (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  testo text not null,
  provenienza text, -- da dove arriva: cattura, task completato, riga di diario, ecc.
  embedding vector(1536), -- dimensione di text-embedding-3-small
  created_at timestamptz not null default now()
);
create index if not exists memoria_user_id_idx on memoria (user_id);
create index if not exists memoria_embedding_hnsw_idx on memoria
  using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- registro — audit log: chi ha fatto cosa e quando
-- ============================================================
create table if not exists registro (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  evento text not null, -- es. "task.completato", "cron.briefing_inviato"
  dettagli jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists registro_user_id_idx on registro (user_id, created_at desc);

-- ============================================================
-- match_memoria — ricerca per somiglianza (Parte 6 / A15)
-- L'operatore di distanza vettoriale non si esprime con le query
-- normali del client: va chiamata via rpc('match_memoria', ...).
-- ============================================================
create or replace function match_memoria(
  query_embedding vector(1536),
  match_count int,
  p_user_id text
)
returns table (
  id uuid,
  testo text,
  provenienza text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    memoria.id,
    memoria.testo,
    memoria.provenienza,
    memoria.created_at,
    1 - (memoria.embedding <=> query_embedding) as similarity
  from memoria
  where memoria.user_id = p_user_id
    and memoria.embedding is not null
  order by memoria.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- Row Level Security — negazione totale.
-- Nessuna policy viene creata: con RLS attivo e zero policy,
-- anon/authenticated non vedono né scrivono nulla. Solo la
-- chiave di servizio (che scavalca RLS) passa.
-- ============================================================
alter table profilo enable row level security;
alter table catture enable row level security;
alter table persone enable row level security;
alter table task enable row level security;
alter table log_giornalieri enable row level security;
alter table memoria enable row level security;
alter table registro enable row level security;
