import { supabase } from './supabase'

async function callBilling(fn, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, ...data }
}

// Abre o checkout Stripe para assinar (plan: 'mensal' | 'anual').
export function startCheckout(plan) {
  return callBilling('create-checkout', { plan })
}

// Abre o portal Stripe para gerir ou cancelar a assinatura.
export function openBillingPortal() {
  return callBilling('manage-subscription')
}
