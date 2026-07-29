import test from 'node:test'
import assert from 'node:assert/strict'
import { loadBillingCatalog } from '../supabase/functions/_shared/billing-config.js'
import { customerEntitlement, catalogMatchForSubscription } from '../supabase/functions/_shared/entitlement.js'

const env = { get: (k) => ({
  BILLING_MARKETS_ENABLED: 'BR',
  STRIPE_PRICE_ID_BR_MONTHLY: 'price_m',
  STRIPE_PRICE_ID_BR_ANNUAL: 'price_a',
  STRIPE_PRICE_ID_BR_AVULSO: 'price_av',
}[k]) }
const catalog = loadBillingCatalog(env)

function sub({ id = 'sub_1', status = 'active', pause = null, created = 100, cpe = 200, price }) {
  return { id, customer: 'cus_1', status, pause_collection: pause, created,
    items: { data: [{ current_period_end: cpe, price }] } }
}
const priceMensal = { id: 'price_m', currency: 'brl', unit_amount: 3990, recurring: { interval: 'month' } }
const priceAnual = { id: 'price_a', currency: 'brl', unit_amount: 38304, recurring: { interval: 'year' } }

test('VLT2-001: assinatura de outro produto não concede Premium', () => {
  const outra = sub({ price: { id: 'price_outro', currency: 'brl', unit_amount: 2990, recurring: { interval: 'month' } } })
  const e = customerEntitlement([outra], catalog)
  assert.equal(e.is_premium, false)
  assert.equal(e.subscription_id, null)
})

test('VLT2-001: Price ID do catálogo mas valor adulterado não corresponde', () => {
  const adulterada = sub({ price: { ...priceMensal, unit_amount: 100 } })
  assert.equal(catalogMatchForSubscription(adulterada, catalog), null)
  assert.equal(customerEntitlement([adulterada], catalog).is_premium, false)
})

test('VLT2-001: moeda errada não corresponde', () => {
  assert.equal(catalogMatchForSubscription(sub({ price: { ...priceMensal, currency: 'eur' } }), catalog), null)
})

test('assinatura de catálogo ativa concede Premium (market BR)', () => {
  const e = customerEntitlement([sub({ price: priceMensal })], catalog)
  assert.equal(e.is_premium, true)
  assert.equal(e.market, 'BR')
  assert.equal(e.price_id, 'price_m')
})

test('VLT2-002: 2 assinaturas -> vigente = a de maior current_period_end', () => {
  const mensal = sub({ id: 'sub_m', cpe: 1000, price: priceMensal })
  const anual = sub({ id: 'sub_a', cpe: 9000, price: priceAnual })
  const e = customerEntitlement([mensal, anual], catalog)
  assert.equal(e.is_premium, true)
  assert.equal(e.subscription_id, 'sub_a')
  assert.equal(e.price_id, 'price_a')
})

test('VLT2-002: única assinatura cancelada remove Premium', () => {
  const e = customerEntitlement([sub({ status: 'canceled', price: priceMensal })], catalog)
  assert.equal(e.is_premium, false)
})

test('VLT2-002: paused não concede Premium', () => {
  const e = customerEntitlement([sub({ status: 'active', pause: { behavior: 'void' }, price: priceMensal })], catalog)
  assert.equal(e.is_premium, false)
})

test('sem assinaturas -> sem Premium, campos nulos', () => {
  const e = customerEntitlement([], catalog)
  assert.equal(e.is_premium, false)
  assert.equal(e.subscription_id, null)
  assert.equal(e.market, null)
})
