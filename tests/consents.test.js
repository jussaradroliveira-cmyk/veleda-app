import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
const publishV22 = fs.readFileSync('supabase/migrations/20260729190000_publish_legal_v22.sql', 'utf8')
// fingerprint vigente da 2.2 dos Termos (última correção in-place: preço §6)
const fixTermsV22 = fs.readFileSync('supabase/migrations/20260729200000_fix_terms_v22_price.sql', 'utf8')
// Privacidade vigente = 2.3 (retenção/backups — VLT2-012)
const publishPrivacyV23 = fs.readFileSync('supabase/migrations/20260730140000_publish_privacy_v23.sql', 'utf8')
const auth = fs.readFileSync('src/pages/Auth.jsx', 'utf8')
const sha256File = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')

test('authenticated user has no insert, update or delete consent grant', () => {
  assert.match(migration, /revoke all on public\.user_consents from public, anon, authenticated/i)
  assert.match(migration, /grant select on public\.user_consents to authenticated/i)
})

test('user id and timestamp are server-controlled', () => {
  assert.match(migration, /user_id uuid not null references auth\.users/)
  assert.match(migration, /recorded_at timestamptz not null default clock_timestamp\(\)/)
  assert.match(migration, /insert into public\.user_consents[\s\S]+new\.id/)
  assert.doesNotMatch(auth, /terms_accepted_at|new Date\(\)\.toISOString\(\)/)
})

test('published document versions and hashes match server records (v2.2)', () => {
  // a migração de publicação torna a 2.2 vigente em legal_documents
  assert.match(publishV22, /'terms_acceptance', '2\.2'/)
  // o hash vigente é o SHA-256 do texto verbatim efetivamente exibido.
  // Termos: fingerprint corrigido in-place na 2.2 (correção de redação §9 + preço).
  assert.match(fixTermsV22, new RegExp('sha256:' + sha256File('src/pages/legal/termos.md')))
  // Privacidade: vigente 2.3 (VLT2-012), hash do texto atual.
  assert.match(publishPrivacyV23, /'privacy_acknowledgement', '2\.3'/)
  assert.match(publishPrivacyV23, new RegExp('sha256:' + sha256File('src/pages/legal/privacidade.md')))
  // as páginas mostram a versão vigente de cada documento
  assert.match(fs.readFileSync('src/pages/Terms.jsx', 'utf8'), /Versão 2\.2/)
  assert.match(fs.readFileSync('src/pages/Privacy.jsx', 'utf8'), /Versão 2\.3/)
  assert.match(fs.readFileSync('src/pages/Subprocessors.jsx', 'utf8'), /Versão 2\.2/)
})

test('signup trigger creates consent even when email confirmation delays session', () => {
  assert.match(migration, /create or replace function public\.handle_new_user/)
  assert.match(migration, /age_18_declaration/)
  assert.doesNotMatch(auth, /\.from\('profiles'\)\s*\.update\(\{ terms_/)
})

test('UI reports signup failure instead of claiming consent saved', () => {
  assert.match(auth, /if \(error\)/)
  assert.match(auth, /setError/)
})

test('age declaration stores no identity document or birth date', () => {
  // a declaração de idade é uma frase simples de checkbox (não pede documentos);
  // com i18n, o texto vive no dicionário (src/lib/i18n.js), não no Auth.jsx.
  const i18n = fs.readFileSync('src/lib/i18n.js', 'utf8')
  assert.match(i18n, /Declaro ter 18 anos ou mais\./)
  assert.doesNotMatch(migration, /cpf|passport|passaporte|birth|nascimento|biometr|fotografia|document_number/i)
})

