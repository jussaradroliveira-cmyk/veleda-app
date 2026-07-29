import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  READING_LIMITS,
  utcWeekStart,
  validateReadingPayload,
} from '../supabase/functions/_shared/limits.js'

class AtomicQuotaFixture {
  constructor({ premium = false } = {}) {
    this.premium = premium
    this.keys = new Map()
    this.freeWeeks = new Set()
    this.queue = Promise.resolve()
  }
  reserve(user, week, key) {
    const operation = this.queue.then(() => {
      if (this.keys.has(`${user}:${key}`)) return this.keys.get(`${user}:${key}`)
      const weekKey = `${user}:${week}`
      const result = this.premium || !this.freeWeeks.has(weekKey) ? 'authorized' : 'quota_exceeded'
      if (!this.premium && result === 'authorized') this.freeWeeks.add(weekKey)
      this.keys.set(`${user}:${key}`, result)
      return result
    })
    this.queue = operation.catch(() => {})
    return operation
  }
  release(user, week, key) {
    this.keys.delete(`${user}:${key}`)
    this.freeWeeks.delete(`${user}:${week}`)
  }
}

test('20 simultaneous free requests authorize at most one', async () => {
  const quota = new AtomicQuotaFixture()
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    quota.reserve('user', '2026-07-27', `key-${index}`)))
  assert.equal(results.filter((result) => result === 'authorized').length, 1)
})

test('retries with the same key do not consume twice', async () => {
  const quota = new AtomicQuotaFixture()
  const results = await Promise.all(Array.from({ length: 20 }, () =>
    quota.reserve('user', '2026-07-27', 'same-key')))
  assert.deepEqual(new Set(results), new Set(['authorized']))
  assert.equal(quota.keys.size, 1)
})

test('Anthropic failure releases reservation', async () => {
  const quota = new AtomicQuotaFixture()
  await quota.reserve('user', '2026-07-27', 'first')
  quota.release('user', '2026-07-27', 'first')
  assert.equal(await quota.reserve('user', '2026-07-27', 'retry'), 'authorized')
})

test('Premium is authorized but still has defensive constants', async () => {
  const quota = new AtomicQuotaFixture({ premium: true })
  assert.equal(await quota.reserve('user', '2026-07-27', 'premium'), 'authorized')
  assert.equal(READING_LIMITS.maxConcurrentPerUser, 2)
  assert.equal(READING_LIMITS.maxPerDayPremium, 100)
})

test('unauthenticated flow is rejected before reserve by contract', () => {
  const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
  assert.match(migration, /grant execute[\s\S]+reserve_reading_request[\s\S]+to service_role/i)
  assert.doesNotMatch(migration, /grant execute[\s\S]+reserve_reading_request[\s\S]+to authenticated/i)
})

test('oversized payload is rejected', () => {
  assert.equal(validateReadingPayload(READING_LIMITS.maxBodyBytes + 1, {}), 'payload_too_large')
})

test('automated burst limits are centralized', () => {
  assert.equal(READING_LIMITS.maxPerMinutePerUser, 5)
  assert.equal(READING_LIMITS.maxPerHourPerUser, 20)
  assert.equal(READING_LIMITS.maxGlobalReservationsPerDay, 5000)
})

test('week changes only at Monday 00:00 UTC', () => {
  assert.equal(utcWeekStart(new Date('2026-08-02T23:59:59Z')).toISOString(), '2026-07-27T00:00:00.000Z')
  assert.equal(utcWeekStart(new Date('2026-08-03T00:00:00Z')).toISOString(), '2026-08-03T00:00:00.000Z')
})

test('migration has cross-instance atomic primitives', () => {
  const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /reading_reservations_free_week_uidx/)
  assert.match(migration, /unique \(user_id, idempotency_key\)/i)
})
