-- VLT-011: limites defensivos no diário. Antes, journal_entries.content era
-- `text` sem limite e sem teto por conta — uma conta automatizada podia gravar
-- payloads gigantes ou entradas ilimitadas. Ambos os limites são aditivos e
-- generosos face ao uso real (hoje: máx. 33 caracteres, 1 entrada por conta).

-- Tamanho por entrada. char_length(null) é null → a CHECK não afeta linhas sem
-- conteúdo; content é NOT NULL, portanto vale sempre.
alter table public.journal_entries
  add constraint journal_entries_content_len
  check (char_length(content) <= 8000);

-- Teto por conta. SECURITY INVOKER: a contagem corre sob o RLS do próprio
-- utilizador (só vê as próprias entradas), que é exatamente o alvo da contagem.
create or replace function public.enforce_journal_entry_cap()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (
    select count(*) from public.journal_entries where user_id = new.user_id
  ) >= 2000 then
    raise exception using errcode = '23514', message = 'journal_entry_cap_reached';
  end if;
  return new;
end;
$$;

create trigger journal_entry_cap
  before insert on public.journal_entries
  for each row execute function public.enforce_journal_entry_cap();
