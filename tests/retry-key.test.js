import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldRenewIdempotencyKey } from '../src/lib/reading-retry.js'

// VLT2-005: renovar a idempotency_key só quando a reserva foi liberada.
test('renova a chave quando a reserva foi liberada/expirada/falhou', () => {
  for (const code of ['reading_failed', 'reservation_released', 'reservation_expired']) {
    assert.equal(shouldRenewIdempotencyKey(code), true, code)
  }
})

test('NÃO renova em falha ambígua ou noutros estados (preserva idempotência)', () => {
  for (const code of [undefined, '', 'erro', 'reading_in_progress', 'idempotency_conflict',
    'quota_exceeded', 'premium_daily_reached']) {
    assert.equal(shouldRenewIdempotencyKey(code), false, String(code))
  }
})
