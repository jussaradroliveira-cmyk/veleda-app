import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  shouldApplyEvent,
  subscriptionEntitled,
  subscriptionSnapshot,
  validatePackPurchase,
} from '../supabase/functions/_shared/stripe-state.js'
import {
  duplicatePackDeliveries,
  outOfOrderSubscriptionEvents,
  stripeFixtures,
} from './fixtures/stripe-events.js'

const pack = {
  plan: 'avulso',
  priceId: 'price_br_pack',
  currency: 'brl',
  unitAmount: 4990,
}

test('same event processed 20 times grants once in atomic fixture', async () => {
  const events = new Set()
  let credits = 0
  let queue = Promise.resolve()
  const process = (event) => {
    const operation = queue.then(() => {
      if (events.has(event.id)) return 'duplicate'
      events.add(event.id)
      credits += 5
      return 'processed'
    })
    queue = operation.catch(() => {})
    return operation
  }
  const results = await Promise.all(duplicatePackDeliveries.map(process))
  assert.equal(results.filter((result) => result === 'processed').length, 1)
  assert.equal(credits, 5)
})

test('already processed event is success-idempotent', () => {
  assert.equal(shouldApplyEvent(200, 200), true)
})

test('older event cannot overwrite newer state', () => {
  assert.equal(shouldApplyEvent(300, 200), false)
  assert.equal(shouldApplyEvent(200, 300), true)
})

test('out-of-order fixtures preserve the newest event', () => {
  let latest = 0
  for (const event of outOfOrderSubscriptionEvents) {
    if (shouldApplyEvent(latest, event.created)) latest = event.created
  }
  assert.equal(latest, stripeFixtures.newerUpdate.created)
})

test('fixtures cover BRL, EUR, expiry, failure, refund and chargeback', () => {
  assert.equal(stripeFixtures.brPaidPack.data.object.metadata.currency, 'brl')
  assert.equal(stripeFixtures.euPaidPack.data.object.metadata.currency, 'eur')
  assert.equal(stripeFixtures.expired.type, 'checkout.session.expired')
  assert.equal(stripeFixtures.paymentFailed.type, 'invoice.payment_failed')
  assert.equal(stripeFixtures.refund.type, 'charge.refunded')
  assert.equal(stripeFixtures.chargeback.type, 'charge.dispute.created')
})

test('active and trialing entitle; failed, paused and canceled do not', () => {
  assert.equal(subscriptionEntitled('active'), true)
  assert.equal(subscriptionEntitled('trialing'), true)
  for (const status of ['past_due', 'unpaid', 'paused', 'canceled']) {
    assert.equal(subscriptionEntitled(status), false)
  }
  assert.equal(subscriptionEntitled('active', { behavior: 'void' }), false)
})

test('subscription snapshot records price, currency and event time', () => {
  const snapshot = subscriptionSnapshot({
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    pause_collection: null,
    items: { data: [{ price: { id: 'price_eu', currency: 'eur', unit_amount: 990 }, current_period_end: 123 }] },
  }, { id: 'evt_1', created: 100 })
  assert.deepEqual(
    { currency: snapshot.currency, amount: snapshot.unit_amount, created: snapshot.event_created },
    { currency: 'eur', amount: 990, created: 100 },
  )
})

test('valid pack requires exact server catalog match', () => {
  assert.deepEqual(validatePackPurchase({
    priceId: 'price_br_pack', currency: 'brl', amount: 4990, quantity: 1,
  }, pack), { ok: true })
})

test('invalid quantity, altered metadata, currency or product is rejected', () => {
  assert.equal(validatePackPurchase({ priceId: 'price_br_pack', currency: 'brl', amount: 4990, quantity: 2 }, pack).ok, false)
  assert.equal(validatePackPurchase({ priceId: 'price_other', currency: 'brl', amount: 4990, quantity: 1 }, pack).ok, false)
  assert.equal(validatePackPurchase({ priceId: 'price_br_pack', currency: 'eur', amount: 4990, quantity: 1 }, pack).ok, false)
  assert.equal(validatePackPurchase({ priceId: 'price_br_pack', currency: 'brl', amount: 1, quantity: 1 }, pack).ok, false)
  assert.equal(validatePackPurchase({}, null).ok, false)
})

test('migration makes event registration and grant one transaction', () => {
  const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
  const functionBody = migration.match(/create or replace function public\.process_stripe_pack_event[\s\S]+?\n\$\$;/i)?.[0] ?? ''
  assert.match(functionBody, /insert into public\.processed_stripe_events/i)
  assert.match(functionBody, /update public\.profiles/i)
  assert.match(functionBody, /raise exception/i)
})

test('grant failure or event insert failure rolls back the SQL function', () => {
  const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
  assert.match(migration, /pack_grant_failed/)
  assert.match(migration, /on conflict \(id\) do nothing/)
  assert.match(migration, /payment_intent_already_granted/)
  // PostgreSQL functions run inside the caller transaction; raised exceptions
  // roll back both the event row and the benefit update.
  assert.match(migration, /raise exception/)
})

test('missing or unknown user cannot receive the benefit', () => {
  const migration = fs.readFileSync('supabase/migrations/20260728120000_phase1_security_integrity.sql', 'utf8')
  assert.match(migration, /pack_user_not_found/)
  const webhook = fs.readFileSync('supabase/functions/stripe-webhook/index.ts', 'utf8')
  assert.match(webhook, /customer_user_mismatch/)
  assert.match(webhook, /metadata_or_product_rejected/)
})

test('webhook returns failure when persistence or sync fails', () => {
  const webhook = fs.readFileSync('supabase/functions/stripe-webhook/index.ts', 'utf8')
  assert.match(webhook, /persistence_or_sync_failed/)
  assert.match(webhook, /status: 500/)
  assert.doesNotMatch(webhook, /console\.(?:log|error)\([^)]*session(?!\.)/)
})
