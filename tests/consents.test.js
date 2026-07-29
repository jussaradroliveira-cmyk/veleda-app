import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
const auth = fs.readFileSync('src/pages/Auth.jsx', 'utf8')

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

test('published document versions match server records', () => {
  assert.match(migration, /terms-2026-07-28/)
  assert.match(migration, /privacy-2026-07-28/)
  assert.match(fs.readFileSync('src/pages/Terms.jsx', 'utf8'), /terms-2026-07-28/)
  assert.match(fs.readFileSync('src/pages/Privacy.jsx', 'utf8'), /privacy-2026-07-28/)
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
  assert.match(auth, /Declaro ter 18 anos ou mais\./)
  assert.doesNotMatch(migration, /cpf|passport|passaporte|birth|nascimento|biometr|fotografia|document_number/i)
})

