-- VLT-009: uma entrada de diário ligada a uma leitura tem de pertencer ao MESMO
-- dono. Antes, journal_entries.reading_id referenciava readings(id) sem provar
-- que a leitura era do próprio utilizador — um atacante que conhecesse o UUID de
-- uma leitura alheia podia ligar-lhe um diário (oráculo de existência via FK).

-- Alvo para a FK composta (id já é único pela PK; par trivialmente único).
alter table public.readings
  add constraint readings_id_user_key unique (id, user_id);

-- Troca a FK simples por uma composta (reading_id, user_id). reading_id é
-- nullable: entradas de diário livres (sem leitura) continuam válidas, porque
-- uma FK com coluna NULL é satisfeita por omissão (MATCH SIMPLE).
alter table public.journal_entries
  drop constraint journal_entries_reading_id_fkey;

alter table public.journal_entries
  add constraint journal_entries_reading_owner_fkey
  foreign key (reading_id, user_id)
  references public.readings(id, user_id)
  on delete cascade;
