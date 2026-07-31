import { useState } from 'react'
import { startCheckout } from '../lib/billing'
import { useI18n } from '../lib/i18n-context'
import BillingOffers from './BillingOffers'

// Paywall semanal — o botão abre o checkout Stripe quando as chaves estiverem
// configuradas no servidor; até lá mostra "em breve".
export default function Paywall({ onClose }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  async function subscribe(plan, market) {
    setBusy(plan)
    setNotice('')
    try {
      const r = await startCheckout(plan, market)
      if (r.ok && r.url) {
        window.location.href = r.url
        return
      }
      setNotice(r.error === 'stripe_not_configured'
        ? t('paywall.comingSoon')
        : t('paywall.error'))
    } catch {
      setNotice(t('paywall.error'))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="card-panel paywall" onClick={(e) => e.stopPropagation()}>
        <h2>{t('paywall.title')}</h2>
        <p className="muted">
          {t('paywall.lead')}
        </p>
        <ul>
          <li>{t('paywall.feat1')}</li>
          <li>{t('paywall.feat2')}</li>
          <li>{t('paywall.feat3')}</li>
        </ul>
        <BillingOffers busy={busy} onCheckout={subscribe} />
        {notice && <p className="muted" style={{ marginTop: '0.8rem' }}>{notice}</p>}
        <p style={{ marginTop: '1rem' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onClose() }}>{t('paywall.back')}</a>
        </p>
      </div>
    </div>
  )
}
