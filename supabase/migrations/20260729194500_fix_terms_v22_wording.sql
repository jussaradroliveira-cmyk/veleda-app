-- Correção de redação nos Termos §9 (cláusula de dados sensíveis): a referência
-- "nos termos desta Política" (dentro dos Termos) passa a "nos termos destes
-- Termos". Só muda o texto — a versão continua 2.2.
--
-- Feita IN-PLACE (update do fingerprint da 2.2) porque, no momento desta correção,
-- NENHUMA conta tinha aceitado a 2.2 (0 linhas em user_consents @ 2.2 no live).
-- Logo não há hash já consentido a proteger. Se houvesse, publicava-se uma 2.3.
--
-- Novo hash = SHA-256 do texto verbatim em src/pages/legal/termos.md corrigido.
-- Conferido por tests/consents.test.js.
update public.legal_documents
  set document_fingerprint = 'sha256:3ac8169df6413de8c791c986821a1e93daa2927f71fcbfa919bba3d8b05fb44b'
  where document_type = 'terms_acceptance' and version = '2.2';
