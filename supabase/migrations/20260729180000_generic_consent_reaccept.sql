-- VLT2-010: mecanismo GENÉRICO de reaceite de documentos legais.
--
-- Antes: o trigger de cadastro tinha a versão (2.1) e os hashes cravados no
-- corpo. Não havia forma de exigir reaceite quando os documentos mudassem.
--
-- Agora: uma tabela `legal_documents` é a ÚNICA fonte de verdade da versão
-- vigente de cada documento consentível (Termos e Privacidade). O cadastro e o
-- reaceite leem daqui — nada de hardcode. Quando a versão vigente for MAIOR do
-- que a última que a pessoa aceitou, o próximo login exige reaceite; grava-se
-- versão + hash (do servidor) + data-hora + idioma + mercado, igual ao cadastro.
-- Vale para qualquer versão futura (2.2, 3.0, …), não é remendo de v2.1.

-- 1) Fonte de verdade da versão vigente ------------------------------------
create table if not exists public.legal_documents (
  document_type text not null check (document_type in (
    'terms_acceptance',
    'privacy_acknowledgement'
  )),
  version text not null,
  document_fingerprint text not null,           -- 'sha256:...' do texto verbatim
  effective_at timestamptz not null default now(),
  is_current boolean not null default true,
  primary key (document_type, version)
);

alter table public.legal_documents enable row level security;
-- Fechado por completo: a versão vigente é servida via RPC (pending_consents).
-- O texto em si já é público em /termos e /privacidade (ficheiros ?raw).
revoke all on public.legal_documents from public, anon, authenticated;

-- No máximo UMA versão vigente por tipo. Publicar uma nova versão = numa única
-- transação, is_current=false na antiga e inserir a nova com is_current=true.
create unique index if not exists legal_documents_one_current
  on public.legal_documents(document_type) where is_current;

-- Semente = documentos vigentes hoje (v2.1). Hashes idênticos aos que o trigger
-- de cadastro já gravava (src/pages/legal/{termos,privacidade}.md verbatim), por
-- isso as contas que aceitaram 2.1 continuam em dia — nada de reaceite espúrio.
insert into public.legal_documents (document_type, version, document_fingerprint, effective_at, is_current)
values
  ('terms_acceptance', '2.1',
    'sha256:14c2385becd8806c3b4f24c4e3087b2462165febfa3b9873d7efb6252174f6f0',
    '2026-07-29T00:00:00Z', true),
  ('privacy_acknowledgement', '2.1',
    'sha256:a5167b43f210ae91890911eb1a96ef7da0411dbe01170072ee5ca046b1367f03',
    '2026-07-29T00:00:00Z', true)
on conflict (document_type, version) do nothing;

-- 2) Nova origem de consentimento: reaceite ---------------------------------
alter table public.user_consents drop constraint if exists user_consents_origin_check;
alter table public.user_consents add constraint user_consents_origin_check
  check (origin in ('signup_web', 'reauth_web', 'account_web', 'reaccept_web'));

-- 3) O que falta a esta pessoa aceitar --------------------------------------
-- Devolve os documentos cuja versão VIGENTE é maior do que a maior versão que a
-- pessoa já aceitou. A comparação é numérica por segmento (2.10 > 2.9), não
-- lexicográfica. Sem linhas => nada pendente => login normal não pede nada.
create or replace function public.pending_consents()
returns table (document_type text, version text, document_fingerprint text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select d.document_type, d.version, d.document_fingerprint
  from public.legal_documents d
  where d.is_current
    and string_to_array(d.version, '.')::int[] >
        coalesce((
          select max(string_to_array(c.document_version, '.')::int[])
          from public.user_consents c
          where c.user_id = auth.uid()
            and c.document_type = d.document_type
            and c.accepted
        ), array[0]);
$$;

-- 4) Registar o reaceite (versão + hash do servidor) ------------------------
-- Grava exatamente os documentos que pending_consents() devolveria, com a versão
-- e o hash tirados de legal_documents (nunca do cliente). Idempotente: repetir o
-- clique não duplica (unique (user_id, document_type, document_version)).
-- Devolve quantas linhas foram efetivamente gravadas.
create or replace function public.accept_current_consents(
  p_locale text default 'pt-BR',
  p_market text default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_locale text := case when p_locale = 'pt-PT' then 'pt-PT' else 'pt-BR' end;
  v_market text := case when p_market in ('BR', 'PT_EU') then p_market else null end;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  insert into public.user_consents (
    user_id, document_type, document_version, document_fingerprint,
    accepted, origin, locale, market
  )
  select v_uid, d.document_type, d.version, d.document_fingerprint,
         true, 'reaccept_web', v_locale, v_market
  from public.legal_documents d
  where d.is_current
    and string_to_array(d.version, '.')::int[] >
        coalesce((
          select max(string_to_array(c.document_version, '.')::int[])
          from public.user_consents c
          where c.user_id = v_uid
            and c.document_type = d.document_type
            and c.accepted
        ), array[0])
  on conflict (user_id, document_type, document_version) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.pending_consents() from public;
revoke all on function public.accept_current_consents(text, text) from public;
grant execute on function public.pending_consents() to authenticated;
grant execute on function public.accept_current_consents(text, text) to authenticated;

-- 5) Cadastro passa a ler a versão vigente de legal_documents ---------------
-- Mesmo gesto de validação; a diferença é que a versão/hash de Termos e
-- Privacidade vêm da tabela (não cravados). age_18 continua literal — é uma
-- declaração fixa, não um documento versionado, e nunca exige reaceite.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_locale text;
  requested_market text;
  v_terms   public.legal_documents%rowtype;
  v_privacy public.legal_documents%rowtype;
begin
  if coalesce((new.raw_user_meta_data->>'accept_terms')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'acknowledge_privacy')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'declare_age_18')::boolean, false) is not true then
    raise exception using errcode = '23514', message = 'required_acceptances_missing';
  end if;

  select * into v_terms
    from public.legal_documents
    where document_type = 'terms_acceptance' and is_current;
  select * into v_privacy
    from public.legal_documents
    where document_type = 'privacy_acknowledgement' and is_current;
  if v_terms.version is null or v_privacy.version is null then
    raise exception using errcode = '23514', message = 'legal_documents_not_seeded';
  end if;

  requested_locale := case
    when new.raw_user_meta_data->>'locale' = 'pt-PT' then 'pt-PT'
    else 'pt-BR'
  end;
  requested_market := case
    when new.raw_user_meta_data->>'market' in ('BR', 'PT_EU')
      then new.raw_user_meta_data->>'market'
    else null
  end;

  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data->>'display_name', ''));

  insert into public.user_consents (
    user_id, document_type, document_version, document_fingerprint,
    accepted, origin, locale, market
  )
  values
    (new.id, 'terms_acceptance', v_terms.version, v_terms.document_fingerprint,
      true, 'signup_web', requested_locale, requested_market),
    (new.id, 'privacy_acknowledgement', v_privacy.version, v_privacy.document_fingerprint,
      true, 'signup_web', requested_locale, requested_market),
    (new.id, 'age_18_declaration', '2.1',
      'sha256:1e2ab0c09423300eee6a2f690b8b25f6c8e801e130198f082b96143d00037d7b',
      true, 'signup_web', requested_locale, requested_market);

  return new;
end;
$$;
