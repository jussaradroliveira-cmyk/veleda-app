-- Revisão jurídica 2026-08 (aprovada pela Jussara em 13/08/2026, com uma
-- alteração: removida a frase da promoção de R$ 29,90, que não existe no
-- catálogo): publica Termos de Uso v2.3 (novo §11 de propriedade intelectual/
-- conteúdo assistido por IA, arrependimento BR com restituição integral e SLA
-- de 7 dias úteis, livre resolução PT/EEE) e Política de Privacidade v2.4
-- (parágrafo Anthropic/IA, minimização, backups condicionais ao plano
-- contratado, DPO não designado com canal contact@).
--
-- Pelo mecanismo de reaceite genérico (VLT2-010), todas as contas existentes
-- passam a ter reaceite pendente no próximo login; o cadastro novo grava já
-- as versões vigentes. A Lista de Subprocessadores v2.3 (inclui Resend) é
-- informativa e não integra legal_documents.
--
-- Hashes = SHA-256 do texto verbatim em src/pages/legal/*.md.
-- Conferido por tests/consents.test.js.

begin;

update public.legal_documents
  set is_current = false
  where document_type = 'terms_acceptance' and is_current;

insert into public.legal_documents (document_type, version, document_fingerprint, effective_at, is_current)
values
  ('terms_acceptance', '2.3',
    'sha256:224c14e32b2d752e4119d744c3895d72ca781ec035af2b88ae012975a0834e9c',
    '2026-08-13T00:00:00Z', true)
on conflict (document_type, version) do update
  set document_fingerprint = excluded.document_fingerprint,
      effective_at = excluded.effective_at,
      is_current = true;

update public.legal_documents
  set is_current = false
  where document_type = 'privacy_acknowledgement' and is_current;

insert into public.legal_documents (document_type, version, document_fingerprint, effective_at, is_current)
values
  ('privacy_acknowledgement', '2.4',
    'sha256:09e13d2f57b033c8626dd0bcfa004226f4a6143df8320a56b9be77a10d92d79d',
    '2026-08-13T00:00:00Z', true)
on conflict (document_type, version) do update
  set document_fingerprint = excluded.document_fingerprint,
      effective_at = excluded.effective_at,
      is_current = true;

commit;
