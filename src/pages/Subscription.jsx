import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { startCheckout, openBillingPortal } from '../lib/billing'
import BillingOffers from '../components/BillingOffers'
import { useI18n } from '../lib/i18n-context'

export default function Subscription() {
  const { user } = useAuth()
  const { t, dateLocale } = useI18n()
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
      ? t('paywall.comingSoon')
      : t('paywall.error'))
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
      ? t('subscription.portalNotice')
      : t('subscription.portalError'))
  }

  return (
    <main className="internal-page subscription-page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card-panel ornate-panel subscription-panel">
          <p className="internal-kicker">{t('subscription.kicker')}</p>
          {isPremium === null && <p className="muted">{t('subscription.loading')}</p>}

          {isPremium === true && (
            <>
              <h2>{t('subscription.premiumTitle')}</h2>
              <p className="muted subscription-lead">
                {t('subscription.premiumLead')}
              </p>
              <button className="btn btn--wine" onClick={managePortal} disabled={!!busy}>
                {busy === 'portal' ? t('subscription.opening') : t('subscription.managePortal')}
              </button>
              <p className="muted subscription-note">
                {t('subscription.portalNote')}
              </p>
            </>
          )}

          {isPremium === false && (
            <>
              <h2>{t('subscription.offerTitle')}</h2>
              <ul className="subscription-list">
                <li>{t('paywall.feat1')}</li>
                <li>{t('paywall.feat2')}</li>
                <li>{t('paywall.feat3')}</li>
              </ul>
              {credits > 0 && (
                <p className="avulso-saldo">
                  ✦ {t('reading.creditsBefore')} <strong>{credits} {credits === 1 ? t('reading.creditUnitOne') : t('reading.creditUnitMany')}</strong>
                  {creditsExpire && <> · {t('subscription.creditsValidUntil')} {new Date(creditsExpire).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}</>}
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
