import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertStripeMode,
  getCatalogItem,
  loadBillingCatalog,
  publicBillingCatalog,
} from '../supabase/functions/_shared/billing-config.js'

const env = (values) => ({ get: (key) => values[key] })

test('preserves confirmed BR fixed values and server-side Price IDs', () => {
  const catalog = loadBillingCatalog(env({
    BILLING_MARKETS_ENABLED: 'BR',
    STRIPE_PRICE_ID_BR_MONTHLY: 'price_br_month',
    STRIPE_PRICE_ID_BR_ANNUAL: 'price_br_year',
    STRIPE_PRICE_ID_BR_AVULSO: 'price_br_pack',
  }))
  assert.equal(getCatalogItem(catalog, 'BR', 'mensal').unitAmount, 3990)
  assert.equal(getCatalogItem(catalog, 'BR', 'anual').unitAmount, 38304)
  assert.equal(getCatalogItem(catalog, 'BR', 'avulso').unitAmount, 4990)
  assert.equal(getCatalogItem(catalog, 'BR', 'mensal').currency, 'brl')
})

test('does not enable EU without explicit values and all Price IDs', () => {
  const catalog = loadBillingCatalog(env({
    BILLING_MARKETS_ENABLED: 'PT_EU',
    STRIPE_PRICE_ID_EU_MONTHLY: 'price_eu_month',
  }))
  assert.deepEqual(catalog.markets, {})
})

test('EU uses fixed EUR values supplied by server configuration', () => {
  const catalog = loadBillingCatalog(env({
    BILLING_MARKETS_ENABLED: 'PT_EU',
    STRIPE_PRICE_ID_EU_MONTHLY: 'price_eu_month',
    STRIPE_PRICE_ID_EU_ANNUAL: 'price_eu_year',
    STRIPE_PRICE_ID_EU_AVULSO: 'price_eu_pack',
    STRIPE_EU_MONTHLY_UNIT_AMOUNT: '1000',
    STRIPE_EU_ANNUAL_UNIT_AMOUNT: '10000',
    STRIPE_EU_AVULSO_UNIT_AMOUNT: '1500',
  }))
  assert.equal(getCatalogItem(catalog, 'PT_EU', 'mensal').currency, 'eur')
  assert.equal(getCatalogItem(catalog, 'PT_EU', 'mensal').unitAmount, 1000)
})

test('public catalog never exposes Stripe Price IDs', () => {
  const catalog = loadBillingCatalog(env({
    BILLING_MARKETS_ENABLED: 'BR',
    STRIPE_PRICE_ID_BR_MONTHLY: 'price_secret_month',
    STRIPE_PRICE_ID_BR_ANNUAL: 'price_secret_year',
    STRIPE_PRICE_ID_BR_AVULSO: 'price_secret_pack',
  }))
  assert.doesNotMatch(JSON.stringify(publicBillingCatalog(catalog)), /price_secret/)
})

test('VLT2-007: por defeito (sem config) só BR fica ativo', () => {
  const catalog = loadBillingCatalog(env({
    STRIPE_PRICE_ID_MONTHLY: 'price_br_month',
    STRIPE_PRICE_ID_ANNUAL: 'price_br_year',
    STRIPE_PRICE_ID_AVULSO: 'price_br_pack',
  }))
  assert.deepEqual(Object.keys(catalog.markets), ['BR'])
  assert.deepEqual(Object.keys(publicBillingCatalog(catalog).markets), ['BR'])
})

test('VLT2-007: com PT off, forçar mercado PT_EU é rejeitado no servidor', () => {
  // Mesma config de produção (só BR): getCatalogItem para PT_EU devolve null,
  // logo o create-checkout responde market_or_plan_unavailable a {market:"PT_EU"}.
  const catalog = loadBillingCatalog(env({
    BILLING_MARKETS_ENABLED: 'BR',
    STRIPE_PRICE_ID_BR_MONTHLY: 'price_br_month',
    STRIPE_PRICE_ID_BR_ANNUAL: 'price_br_year',
    STRIPE_PRICE_ID_BR_AVULSO: 'price_br_pack',
  }))
  assert.equal(getCatalogItem(catalog, 'PT_EU', 'mensal'), null)
  assert.equal(getCatalogItem(catalog, 'PT_EU', 'anual'), null)
  assert.equal(getCatalogItem(catalog, 'PT_EU', 'avulso'), null)
  // e o único mercado que o create-checkout impõe é BR
  assert.deepEqual(Object.keys(catalog.markets), ['BR'])
})

test('Stripe key must match configured test/live mode', () => {
  assert.equal(assertStripeMode('sk_test_example', env({ STRIPE_MODE: 'test' })), 'test')
  assert.throws(() => assertStripeMode('sk_live_example', env({ STRIPE_MODE: 'test' })), /stripe_mode_mismatch/)
})
