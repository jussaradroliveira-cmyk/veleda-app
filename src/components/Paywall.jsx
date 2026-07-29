import { useState } from 'react'
import { startCheckout } from '../lib/billing'
import BillingOffers from './BillingOffers'

// Paywall semanal — o botão abre o checkout Stripe quando as chaves estiverem
// configuradas no servidor; até lá mostra "em breve".
export default function Paywall({ onClose }) {
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
        ? 'A assinatura Premium está chegando ✦ volte em breve.'
        : 'Não consegui abrir o pagamento. Tente outra vez daqui a pouco.')
    } catch {
      setNotice('Não consegui abrir o pagamento. Tente outra vez daqui a pouco.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="card-panel paywall" onClick={(e) => e.stopPropagation()}>
        <h2>✦ O véu se fecha por esta semana</h2>
        <p className="muted">
          Você já usou sua leitura gratuita desta semana. As cartas se abrem de novo na segunda-feira —
          ou torne-se Premium e consulte a Veleda sempre que precisar.
        </p>
        <ul>
          <li>Leituras sujeitas a uso razoável</li>
          <li>Histórico e diário sem limites</li>
          <li>Acesso antecipado a novas tiragens</li>
        </ul>
        <BillingOffers busy={busy} onCheckout={subscribe} />
        {notice && <p className="muted" style={{ marginTop: '0.8rem' }}>{notice}</p>}
        <p style={{ marginTop: '1rem' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onClose() }}>voltar</a>
        </p>
      </div>
    </div>
  )
}
