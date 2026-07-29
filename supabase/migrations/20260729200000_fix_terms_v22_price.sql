-- VLT2-008: correção do preço anual no texto dos Termos (§6): "R$ 399,00 por
-- ano" → "R$ 383,04 por ano" — passa a bater com o catálogo e o Stripe (live e
-- teste = 38304). Cobrar valor diferente do anunciado seria problema consumerista.
--
-- Só muda o texto; versão continua 2.2. In-place no fingerprint da 2.2 porque
-- ainda havia 0 aceites reais no momento (se houvesse, publicava-se 2.3).
-- Novo hash = SHA-256 de src/pages/legal/termos.md. Conferido por
-- tests/consents.test.js e pelo teste de consistência catálogo↔Termos.
update public.legal_documents
  set document_fingerprint = 'sha256:73f76f76f1454db299dbb864fc9b713bbd9907231c0fe941a2c287c0ec5e9315'
  where document_type = 'terms_acceptance' and version = '2.2';
