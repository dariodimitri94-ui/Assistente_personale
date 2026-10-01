-- Anagrafica clienti: la tabella "persone" diventa anche il database
-- clienti (email, telefono, tag per segmentare, consenso newsletter)
-- invece di aggiungerne una nuova — è già l'unico posto dove vive un
-- contatto.

alter table persone add column if not exists email text;
alter table persone add column if not exists telefono text;
alter table persone add column if not exists tag text[] not null default '{}';
alter table persone add column if not exists consenso_newsletter boolean not null default true;

create index if not exists persone_tag_idx on persone using gin (tag);
create index if not exists persone_email_idx on persone (user_id, email);
