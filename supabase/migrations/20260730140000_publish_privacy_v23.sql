-- VLT2-012: publica a Política de Privacidade v2.3 (retenção reformulada por
-- critério/finalidade + descrição real dos backups do Supabase Pro — diário +
-- PITR). Revisão jurídica aprovada. Só a Privacidade muda; os Termos ficam em 2.2.
--
-- Publicar a 2.3 torna-a vigente e, pelo mecanismo de reaceite genérico (VLT2-010),
-- as contas que só aceitaram a Privacidade 2.2 passam a ter reaceite pendente no
-- próximo login (o gate mostra a Política atualizada; os Termos, inalterados, não
-- pedem nada).
--
-- Hash = SHA-256 do texto verbatim em src/pages/legal/privacidade.md (v2.3).
-- Conferido por tests/consents.test.js.

begin;

update public.legal_documents
  set is_current = false
  where document_type = 'privacy_acknowledgement' and is_current;

insert into public.legal_documents (document_type, version, document_fingerprint, effective_at, is_current)
values
  ('privacy_acknowledgement', '2.3',
    'sha256:e6bc65fe74132f5b7a8e69ff85d4cca920c0a1d6d3d18c59b059bba394faeb07',
    '2026-07-30T00:00:00Z', true)
on conflict (document_type, version) do update
  set document_fingerprint = excluded.document_fingerprint,
      effective_at = excluded.effective_at,
      is_current = true;

commit;
