const BR_CATALOG = Object.freeze({
  mensal: { plan: 'mensal', currency: 'brl', unitAmount: 3990, interval: 'month' },
  anual: { plan: 'anual', currency: 'brl', unitAmount: 38304, interval: 'year' },
  avulso: { plan: 'avulso', currency: 'brl', unitAmount: 4990, quantity: 5, validDays: 30 },
})

const MARKET_DEFINITIONS = Object.freeze({
  BR: { code: 'BR', locale: 'pt-BR', currency: 'brl' },
  PT_EU: { code: 'PT_EU', locale: 'pt-PT', currency: 'eur' },
})

function positiveInteger(value) {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function enabledMarkets(env) {
  return new Set((env.get('BILLING_MARKETS_ENABLED') ?? 'BR')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value in MARKET_DEFINITIONS))
}

function priceIdFor(env, market, plan) {
  if (market === 'BR') {
    if (plan === 'mensal') {
      return env.get('STRIPE_PRICE_ID_BR_MONTHLY') ??
        env.get('STRIPE_PRICE_ID_MONTHLY') ??
        env.get('STRIPE_PRICE_ID')
    }
    if (plan === 'anual') {
      return env.get('STRIPE_PRICE_ID_BR_ANNUAL') ?? env.get('STRIPE_PRICE_ID_ANNUAL')
    }
    return env.get('STRIPE_PRICE_ID_BR_AVULSO') ?? env.get('STRIPE_PRICE_ID_AVULSO')
  }
  const suffix = plan === 'mensal' ? 'MONTHLY' : plan === 'anual' ? 'ANNUAL' : 'AVULSO'
  return env.get(`STRIPE_PRICE_ID_EU_${suffix}`)
}

function euItem(env, plan) {
  const suffix = plan === 'mensal' ? 'MONTHLY' : plan === 'anual' ? 'ANNUAL' : 'AVULSO'
  const unitAmount = positiveInteger(env.get(`STRIPE_EU_${suffix}_UNIT_AMOUNT`))
  if (!unitAmount) return null
  return {
    plan,
    currency: 'eur',
    unitAmount,
    ...(plan === 'mensal' ? { interval: 'month' } : {}),
    ...(plan === 'anual' ? { interval: 'year' } : {}),
    ...(plan === 'avulso' ? { quantity: 5, validDays: 30 } : {}),
  }
}

export function loadBillingCatalog(env = Deno.env) {
  const enabled = enabledMarkets(env)
  const markets = {}
  for (const market of enabled) {
    const definition = MARKET_DEFINITIONS[market]
    const items = {}
    for (const plan of ['mensal', 'anual', 'avulso']) {
      const base = market === 'BR' ? BR_CATALOG[plan] : euItem(env, plan)
      const priceId = priceIdFor(env, market, plan)
      if (base && priceId) items[plan] = { ...base, priceId }
    }
    // Um mercado só está comercialmente ativo com os três produtos completos.
    if (Object.keys(items).length === 3) markets[market] = { ...definition, items }
  }
  return { version: 'regional-fixed-v1', markets }
}

export function publicBillingCatalog(catalog) {
  return {
    version: catalog.version,
    markets: Object.fromEntries(Object.entries(catalog.markets).map(([code, market]) => [
      code,
      {
        code,
        locale: market.locale,
        currency: market.currency,
        items: Object.fromEntries(Object.entries(market.items).map(([plan, item]) => [
          plan,
          {
            plan,
            currency: item.currency,
            unit_amount: item.unitAmount,
            interval: item.interval ?? null,
            quantity: item.quantity ?? null,
            valid_days: item.validDays ?? null,
          },
        ])),
      },
    ])),
  }
}

export function getCatalogItem(catalog, market, plan) {
  if (!['BR', 'PT_EU'].includes(market) || !['mensal', 'anual', 'avulso'].includes(plan)) return null
  return catalog.markets[market]?.items?.[plan] ?? null
}

export function findCatalogItemByPriceId(catalog, priceId) {
  for (const [market, definition] of Object.entries(catalog.markets)) {
    for (const item of Object.values(definition.items)) {
      if (item.priceId === priceId) return { ...item, market }
    }
  }
  return null
}

export async function assertStripePriceMatches(stripe, item) {
  const price = await stripe.prices.retrieve(item.priceId)
  if (!price.active ||
      price.currency !== item.currency ||
      price.unit_amount !== item.unitAmount ||
      (item.interval && price.recurring?.interval !== item.interval) ||
      (!item.interval && price.type !== 'one_time')) {
    const error = new Error('stripe_catalog_mismatch')
    error.code = 'stripe_catalog_mismatch'
    throw error
  }
  return price
}

export function assertStripeMode(secretKey, env = Deno.env) {
  const configured = env.get('STRIPE_MODE')
  if (!configured) return secretKey.startsWith('sk_live_') ? 'live' : 'test'
  if (!['test', 'live'].includes(configured)) throw new Error('invalid_stripe_mode')
  const expectedPrefix = configured === 'live' ? 'sk_live_' : 'sk_test_'
  if (!secretKey.startsWith(expectedPrefix)) throw new Error('stripe_mode_mismatch')
  return configured
}
