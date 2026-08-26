-- Aggiunge la colonna per i dati di Salute (passi, calorie attive, peso...)
-- al log giornaliero. Costruita solo ora perché solo ora arrivano dati
-- veri da Apple Salute — vedi la nota della guida in Parte 5.6.
alter table log_giornalieri add column if not exists salute jsonb not null default '{}';
