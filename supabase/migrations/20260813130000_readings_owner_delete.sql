-- Apagar histórico: o utilizador pode apagar as PRÓPRIAS leituras.
-- Nota de quota: a quota semanal/diária conta por reading_reservations
-- (reserve_reading_request), não pela tabela readings — apagar leituras
-- NÃO devolve leituras grátis.
-- Nota de cascata: journal_entries.reading_id tem ON DELETE CASCADE
-- (journal_entries_reading_owner_fkey) — apagar uma leitura apaga a nota
-- do diário ligada a ela; o frontend avisa antes.
create policy "apagar as proprias leituras"
  on public.readings for delete
  to authenticated
  using ((select auth.uid()) = user_id);
