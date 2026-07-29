import test from 'node:test'
import assert from 'node:assert/strict'
import {
  stopCustomerBilling,
  subscriptionMayMaintainBilling,
} from '../supabase/functions/_shared/deletion-core.js'

function stripeMock(subscriptions = [], options = {}) {
  const canceled = []
  return {
    canceled,
    customers: {
      retrieve: async () => {
        if (options.customerMissing) throw Object.assign(new Error('missing'), { code: 'resource_missing' })
        if (options.customerFailure) throw Object.assign(new Error('timeout'), { code: 'api_connection_error' })
        return { id: 'cus_test' }
      },
    },
    subscriptions: {
      list: async () => ({ data: subscriptions, has_more: false }),
      cancel: async (id) => {
        if (options.cancelFailure) throw Object.assign(new Error('timeout'), { code: 'api_connection_error' })
        canceled.push(id)
        const item = subscriptions.find((subscription) => subscription.id === id)
        if (item) item.status = 'canceled'
        return { id, status: options.unconfirmed ? 'active' : 'canceled' }
      },
    },
  }
}

test('active subscription is canceled', async () => {
  const stripe = stripeMock([{ id: 'sub_active', status: 'active' }])
  const result = await stopCustomerBilling(stripe, 'cus_test', 'req_1')
  assert.equal(result.canceled, 1)
  assert.deepEqual(stripe.canceled, ['sub_active'])
})

test('trial subscription is canceled', async () => {
  const stripe = stripeMock([{ id: 'sub_trial', status: 'trialing' }])
  assert.equal((await stopCustomerBilling(stripe, 'cus_test', 'req_2')).canceled, 1)
})

test('already canceled subscription is a safe no-op', async () => {
  const stripe = stripeMock([{ id: 'sub_old', status: 'canceled' }])
  assert.equal((await stopCustomerBilling(stripe, 'cus_test', 'req_3')).canceled, 0)
})

test('missing customer is predictable', async () => {
  const result = await stopCustomerBilling(stripeMock([], { customerMissing: true }), 'cus_missing', 'req_4')
  assert.deepEqual(result, { code: 'customer_missing', canceled: 0 })
})

test('temporary Stripe failure aborts the operation', async () => {
  await assert.rejects(
    stopCustomerBilling(stripeMock([], { customerFailure: true }), 'cus_test', 'req_5'),
    { code: 'api_connection_error' },
  )
})

test('second call is idempotent after first cancellation', async () => {
  const subscriptions = [{ id: 'sub_once', status: 'active' }]
  const stripe = stripeMock(subscriptions)
  await stopCustomerBilling(stripe, 'cus_test', 'req_6')
  await stopCustomerBilling(stripe, 'cus_test', 'req_7')
  assert.deepEqual(stripe.canceled, ['sub_once'])
})

test('retry after downstream deletion failure does not recancel', async () => {
  const subscriptions = [{ id: 'sub_resume', status: 'past_due' }]
  const stripe = stripeMock(subscriptions)
  await stopCustomerBilling(stripe, 'cus_test', 'req_8')
  // Simula falha no banco depois do cancelamento e nova tentativa completa.
  const result = await stopCustomerBilling(stripe, 'cus_test', 'req_9')
  assert.equal(result.canceled, 0)
})

test('customer without subscription is accepted', async () => {
  assert.equal((await stopCustomerBilling(stripeMock(), 'cus_test', 'req_10')).canceled, 0)
})

test('multiple billable subscriptions are all canceled', async () => {
  const stripe = stripeMock([
    { id: 'sub_active', status: 'active' },
    { id: 'sub_paused', status: 'paused' },
    { id: 'sub_unpaid', status: 'unpaid' },
    { id: 'sub_done', status: 'canceled' },
  ])
  assert.equal((await stopCustomerBilling(stripe, 'cus_test', 'req_11')).canceled, 3)
})

test('all nonterminal Stripe states are treated defensively', () => {
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']) {
    assert.equal(subscriptionMayMaintainBilling(status), true)
  }
  assert.equal(subscriptionMayMaintainBilling('canceled'), false)
  assert.equal(subscriptionMayMaintainBilling('incomplete_expired'), false)
})

