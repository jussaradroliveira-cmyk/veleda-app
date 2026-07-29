export const ENTITLED_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function subscriptionEntitled(status, pauseCollection = null) {
  return ENTITLED_SUBSCRIPTION_STATUSES.has(status) && !pauseCollection
}

export function shouldApplyEvent(localEventCreated, incomingEventCreated) {
  return !localEventCreated || incomingEventCreated >= localEventCreated
}

export function validatePackPurchase(input, catalogItem) {
  if (!catalogItem || catalogItem.plan !== 'avulso') return { ok: false, code: 'unknown_product' }
  if (input.priceId !== catalogItem.priceId) return { ok: false, code: 'price_mismatch' }
  if (input.currency?.toLowerCase() !== catalogItem.currency) return { ok: false, code: 'currency_mismatch' }
  if (input.amount !== catalogItem.unitAmount) return { ok: false, code: 'amount_mismatch' }
  if (input.quantity !== 1) return { ok: false, code: 'invalid_quantity' }
  return { ok: true }
}

export function subscriptionSnapshot(subscription, event) {
  return {
    customer_id: typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id,
    subscription_id: subscription.id,
    status: subscription.status,
    is_premium: subscriptionEntitled(subscription.status, subscription.pause_collection),
    price_id: subscription.items?.data?.[0]?.price?.id ?? null,
    currency: subscription.items?.data?.[0]?.price?.currency ?? null,
    unit_amount: subscription.items?.data?.[0]?.price?.unit_amount ?? null,
    event_created: event.created,
    event_id: event.id,
    current_period_end: subscription.items?.data?.[0]?.current_period_end ?? null,
  }
}
