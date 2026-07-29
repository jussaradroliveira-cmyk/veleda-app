export const stripeFixtures = {
  brPaidPack: {
    id: 'evt_br_paid',
    created: 100,
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_br',
        mode: 'payment',
        payment_status: 'paid',
        payment_intent: 'pi_br',
        customer: 'cus_br',
        metadata: {
          plan: 'avulso',
          market: 'BR',
          currency: 'brl',
          supabase_user_id: '00000000-0000-0000-0000-000000000001',
        },
      },
    },
  },
  euPaidPack: {
    id: 'evt_eu_paid',
    created: 101,
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_eu',
        mode: 'payment',
        payment_status: 'paid',
        payment_intent: 'pi_eu',
        customer: 'cus_eu',
        metadata: {
          plan: 'avulso',
          market: 'PT_EU',
          currency: 'eur',
          supabase_user_id: '00000000-0000-0000-0000-000000000002',
        },
      },
    },
  },
  canceled: {
    id: 'evt_canceled_new',
    created: 300,
    livemode: false,
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled' } },
  },
  olderUpdate: {
    id: 'evt_update_old',
    created: 200,
    livemode: false,
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active' } },
  },
  newerUpdate: {
    id: 'evt_update_new',
    created: 400,
    livemode: false,
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_1', customer: 'cus_1', status: 'past_due' } },
  },
  expired: {
    id: 'evt_expired',
    created: 500,
    livemode: false,
    type: 'checkout.session.expired',
    data: { object: { id: 'cs_expired' } },
  },
  paymentFailed: {
    id: 'evt_payment_failed',
    created: 600,
    livemode: false,
    type: 'invoice.payment_failed',
    data: { object: { id: 'in_failed', subscription: 'sub_1' } },
  },
  refund: {
    id: 'evt_refund',
    created: 700,
    livemode: false,
    type: 'charge.refunded',
    data: { object: { id: 'ch_refund', payment_intent: 'pi_br', amount: 4990, amount_refunded: 4990 } },
  },
  chargeback: {
    id: 'evt_dispute',
    created: 800,
    livemode: false,
    type: 'charge.dispute.created',
    data: { object: { id: 'dp_1', charge: 'ch_disputed' } },
  },
}

export const duplicatePackDeliveries = Array.from(
  { length: 20 },
  () => structuredClone(stripeFixtures.brPaidPack),
)

export const outOfOrderSubscriptionEvents = [
  stripeFixtures.canceled,
  stripeFixtures.olderUpdate,
  stripeFixtures.newerUpdate,
  stripeFixtures.olderUpdate,
]

