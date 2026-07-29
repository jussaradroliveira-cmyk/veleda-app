-- VLT2-019:
-- (a) display_name ganha limite no BANCO. O cliente já limita a 60, mas um
--     pedido direto à Data API (o utilizador pode escrever a própria coluna)
--     contornava isso. CHECK torna o limite inescapável.
-- (b) o cap de 2000 entradas do diário passa a ser ATÓMICO por utilizador. Antes
--     era count(*)-depois-insert sem lock: duas inserções concorrentes da mesma
--     conta liam ambas <2000 e ultrapassavam o teto. Um advisory lock por
--     utilizador (na transação) serializa as inserções da mesma conta.

alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 60);

create or replace function public.enforce_journal_entry_cap()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Serializa as inserções da MESMA conta: uma concorrente espera aqui e só
  -- reconta depois de a outra terminar. Namespaced por 'journal_entry_cap'
  -- (classid) + hash do user_id, para não colidir com outros advisory locks.
  perform pg_advisory_xact_lock(hashtext('journal_entry_cap'), hashtext(new.user_id::text));
  if (
    select count(*) from public.journal_entries where user_id = new.user_id
  ) >= 2000 then
    raise exception using errcode = '23514', message = 'journal_entry_cap_reached';
  end if;
  return new;
end;
$$;
