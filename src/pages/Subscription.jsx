import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { startCheckout, openBillingPortal } from '../lib/billing'

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

  async function subscribe(plan) {
    setBusy(plan)
    setNotice('')
    const r = await startCheckout(plan)
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
                Leituras ilimitadas e acesso contínuo ao seu ritual. Obrigada por caminhar com a Veleda.
              </p>
              <button className="btn btn--wine" onClick={managePortal} disabled={!!busy}>
                {busy === 'portal' ? 'Abrindo…' : 'Gerenciar ou cancelar assinatura'}
              </button>
              <p className="muted subscription-note">
                Você será levada ao portal seguro do Stripe, onde pode trocar o cartão,
                ver faturas ou cancelar quando quiser — sem perder seu histórico nem seu diário.
              </p>
            </>
          )}

          {isPremium === false && (
            <>
              <h2>✦ Veleda Premium</h2>
              <div className="preco">R$ 39,90<span className="preco__periodo">/mês</span></div>
              <p className="paywall__anual">✦ ou plano anual com <strong>20% de desconto</strong> — R$ 383,04/ano (sai a R$ 31,92/mês)</p>
              <ul className="subscription-list">
                <li>Leituras ilimitadas</li>
                <li>Histórico e diário sem limites</li>
                <li>Acesso antecipado a novas tiragens</li>
              </ul>
              <div className="paywall__botoes">
                <button className="btn btn--wine" onClick={() => subscribe('anual')} disabled={!!busy}>
                  {busy === 'anual' ? 'Preparando…' : 'Assinar anual · 20% off'}
                </button>
                <button className="btn ghost" onClick={() => subscribe('mensal')} disabled={!!busy}>
                  {busy === 'mensal' ? 'Preparando…' : 'Assinar mensal · R$ 39,90'}
                </button>
              </div>
            </>
          )}

          {isPremium === false && (
            <div className="account-block avulso-block">
              <h4>Consulta avulsa</h4>
              {credits > 0 && (
                <p className="avulso-saldo">
                  ✦ Você tem <strong>{credits} {credits === 1 ? 'leitura' : 'leituras'}</strong>
                  {creditsExpire && <> · válidas até {new Date(creditsExpire).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</>}
                </p>
              )}
              <p className="muted">
                Prefere sem assinatura? <strong>5 leituras por R$ 49,90</strong>, válidas por 30 dias após a compra.
              </p>
              <button className="btn ghost small" onClick={() => subscribe('avulso')} disabled={!!busy}>
                {busy === 'avulso' ? 'Preparando…' : credits > 0 ? 'Comprar mais 5 leituras' : 'Comprar 5 leituras · R$ 49,90'}
              </button>
            </div>
          )}

          {notice && <p className="muted" role="status" style={{ marginTop: '0.9rem' }}>{notice}</p>}
        </div>
      </div>
    </main>
  )
}
