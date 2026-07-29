import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { startCheckout, openBillingPortal } from '../lib/billing'
import BillingOffers from '../components/BillingOffers'

export default function Subscription() {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(null)
  const [credits, setCredits] = useState(0)
  const [creditsExpire, setCreditsExpire] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('is_premium, reading_credits, reading_credits_expire_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsPremium(Boolean(data?.is_premium))
        const valido = data?.reading_credits_expire_at && new Date(data.reading_credits_expire_at) > new Date()
        setCredits(valido ? (data.reading_credits ?? 0) : 0)
        setCreditsExpire(valido ? data.reading_credits_expire_at : null)
      })
  }, [user.id])

  async function subscribe(plan, market) {
    setBusy(plan)
    setNotice('')
    const r = await startCheckout(plan, market)
    setBusy('')
    if (r.ok && r.url) {
      window.location.href = r.url
      return
    }
    setNotice(r.error === 'stripe_not_configured'
      ? 'A assinatura Premium está chegando ✦ volte em breve.'
      : 'Não consegui abrir o pagamento. Tente outra vez daqui a pouco.')
  }

  async function managePortal() {
    setBusy('portal')
    setNotice('')
    const r = await openBillingPortal()
    setBusy('')
    if (r.ok && r.url) {
      window.location.href = r.url
      return
    }
    setNotice(r.error === 'stripe_not_configured' || r.error === 'no_subscription'
      ? 'O portal da assinatura está chegando ✦ por enquanto, fale conosco para qualquer alteração.'
      : 'Não consegui abrir o portal. Tente outra vez daqui a pouco.')
  }

  return (
    <main className="internal-page subscription-page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card-panel ornate-panel subscription-panel">
          <p className="internal-kicker">Sua assinatura</p>
          {isPremium === null && <p className="muted">Consultando sua assinatura…</p>}

          {isPremium === true && (
            <>
              <h2>✦ Você é Premium</h2>
              <p className="muted subscription-lead">
                Leituras sem limite comercial predeterminado, sujeitas a uso razoável e proteção contra abuso.
              </p>
              <button className="btn btn--wine" onClick={managePortal} disabled={!!busy}>
                {busy === 'portal' ? 'Abrindo…' : 'Gerenciar renovação no Stripe'}
              </button>
              <p className="muted subscription-note">
                Você será levada ao portal seguro do Stripe, onde pode trocar o cartão,
                ver faturas ou solicitar o cancelamento da renovação. Isso não exclui sua
                conta, não apaga histórico ou diário e não gera reembolso automático.
              </p>
            </>
          )}

          {isPremium === false && (
            <>
              <h2>✦ Veleda Premium</h2>
              <ul className="subscription-list">
                <li>Leituras sujeitas a uso razoável</li>
                <li>Histórico e diário sem limites</li>
                <li>Acesso antecipado a novas tiragens</li>
              </ul>
              {credits > 0 && (
                <p className="avulso-saldo">
                  ✦ Você tem <strong>{credits} {credits === 1 ? 'leitura avulsa' : 'leituras avulsas'}</strong>
                  {creditsExpire && <> · válidas até {new Date(creditsExpire).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</>}
                </p>
              )}
              <BillingOffers busy={busy} onCheckout={subscribe} />
            </>
          )}

          {notice && <p className="muted" role="status" style={{ marginTop: '0.9rem' }}>{notice}</p>}
        </div>
      </div>
    </main>
  )
}
