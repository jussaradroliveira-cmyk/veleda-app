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

export async function getBillingCatalog() {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, ...data }
}

// O cliente escolhe apenas mercado e plano. Preço, moeda e Price ID são
// resolvidos e validados no servidor a partir do catálogo autorizado.
export function startCheckout(plan, market) {
  return callBilling('create-checkout', { plan, market })
}

// Abre o portal Stripe para gerir ou cancelar a assinatura.
export function openBillingPortal() {
  return callBilling('manage-subscription')
}
