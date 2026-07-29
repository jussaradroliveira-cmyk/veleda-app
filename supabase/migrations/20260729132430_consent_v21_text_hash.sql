-- Documentos legais definitivos v2.1 (vigentes 29/07/2026). O consentimento no
-- cadastro passa a guardar a VERSÃO (2.1) e o HASH SHA-256 do texto exato aceite,
-- exigidos pelos Termos ("versão e hash"). Versão/hash/data-hora do servidor/
-- idioma/mercado ficam todos em user_consents (data-hora = recorded_at default;
-- idioma/mercado dos metadados do signup).
--
-- Os hashes são de src/pages/legal/{termos,privacidade}.md — o texto verbatim
-- exibido nas páginas /termos e /privacidade e a fonte de verdade arquivada.
-- age_18 = SHA-256 da frase "Declaro ter 18 anos ou mais." (sem aspas).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_locale text;
  requested_market text;
begin
  if coalesce((new.raw_user_meta_data->>'accept_terms')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'acknowledge_privacy')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'declare_age_18')::boolean, false) is not true then
    raise exception using errcode = '23514', message = 'required_acceptances_missing';
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
    (new.id, 'terms_acceptance', '2.1',
      'sha256:14c2385becd8806c3b4f24c4e3087b2462165febfa3b9873d7efb6252174f6f0',
      true, 'signup_web', requested_locale, requested_market),
    (new.id, 'privacy_acknowledgement', '2.1',
      'sha256:a5167b43f210ae91890911eb1a96ef7da0411dbe01170072ee5ca046b1367f03',
      true, 'signup_web', requested_locale, requested_market),
    (new.id, 'age_18_declaration', '2.1',
      'sha256:1e2ab0c09423300eee6a2f690b8b25f6c8e801e130198f082b96143d00037d7b',
      true, 'signup_web', requested_locale, requested_market);

  return new;
end;
$$;
