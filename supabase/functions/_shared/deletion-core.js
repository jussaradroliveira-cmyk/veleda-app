const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired'])

export function subscriptionMayMaintainBilling(status) {
  return !TERMINAL_SUBSCRIPTION_STATUSES.has(status)
}

export async function listAllSubscriptions(stripe, customerId) {
  const subscriptions = []
  let startingAfter
  do {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    subscriptions.push(...page.data)
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined
  } while (startingAfter)
  return subscriptions
}

export async function stopCustomerBilling(stripe, customerId, requestId) {
  if (!customerId) return { code: 'no_customer', canceled: 0 }

  let customer
  try {
    customer = await stripe.customers.retrieve(customerId)
  } catch (error) {
    if (error?.code === 'resource_missing') return { code: 'customer_missing', canceled: 0 }
    throw error
  }
  if (customer?.deleted) return { code: 'customer_missing', canceled: 0 }

  const subscriptions = await listAllSubscriptions(stripe, customerId)
  let canceled = 0
  for (const subscription of subscriptions) {
    if (!subscriptionMayMaintainBilling(subscription.status)) continue
    const result = await stripe.subscriptions.cancel(
      subscription.id,
      {},
      { idempotencyKey: `veleda-delete-${requestId}-${subscription.id}` },
    )
    if (result.status !== 'canceled') {
      const error = new Error('stripe_subscription_not_canceled')
      error.code = 'stripe_subscription_not_canceled'
      throw error
    }
    canceled += 1
  }
  return { code: 'billing_stopped', canceled }
}

