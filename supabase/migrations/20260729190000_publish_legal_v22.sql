-- Publica a versão 2.2 dos Termos e da Política de Privacidade (revisão jurídica
-- da cláusula de dados sensíveis — VLT2-009: passa de "consentimento específico
-- com mecanismo próprio" para "coberto pelo consentimento prestado no cadastro").
--
-- É ISTO que ativa o reaceite genérico (VLT2-010): ao tornar a 2.2 vigente, todas
-- as contas que só aceitaram a 2.1 passam a ter reaceite pendente no próximo login.
--
-- Fluxo canónico de publicação (o mesmo para qualquer versão futura), atómico:
--   1) a versão anterior deixa de ser vigente;
--   2) insere-se a nova versão como vigente.
-- O índice único parcial legal_documents_one_current garante uma só vigente/tipo.
--
-- Hashes = SHA-256 do texto verbatim em src/pages/legal/{termos,privacidade}.md
-- (com a cláusula ajustada e o rodapé "versão 2.2"). Conferidos por tests/consents.test.js.

begin;

update public.legal_documents
  set is_current = false
  where document_type in ('terms_acceptance', 'privacy_acknowledgement')
    and is_current;

insert into public.legal_documents (document_type, version, document_fingerprint, effective_at, is_current)
values
  ('terms_acceptance', '2.2',
    'sha256:3bd35c734c9f75f3e7545107709b3299166cae6f73fe3c3d293565ecf7ce978a',
    '2026-07-29T00:00:00Z', true),
  ('privacy_acknowledgement', '2.2',
    'sha256:ea73a83a39e3d6d5fc9b2e63f8e3a0c054f019dae2f07b289953cffa88b7d3bf',
    '2026-07-29T00:00:00Z', true)
on conflict (document_type, version) do update
  set document_fingerprint = excluded.document_fingerprint,
      effective_at = excluded.effective_at,
      is_current = true;

commit;
