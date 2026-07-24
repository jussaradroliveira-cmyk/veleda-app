import { useState } from 'react'
import { startCheckout } from '../lib/billing'

// Paywall semanal — o botão abre o checkout Stripe quando as chaves estiverem
// configuradas no servidor; até lá mostra "em breve".
export default function Paywall({ onClose }) {
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  async function subscribe(plan) {
    setBusy(plan)
    setNotice('')
    try {
      const r = await startCheckout(plan)
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
        <div className="preco">R$ 39,90<span className="preco__periodo">/mês</span></div>
        <p className="paywall__anual">✦ ou plano anual com <strong>20% de desconto</strong> — R$ 383,04/ano (sai a R$ 31,92/mês)</p>
        <ul>
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
        <div className="paywall__avulso">
          <p className="paywall__avulso-label">Sem compromisso?</p>
          <p className="paywall__avulso-desc">
            <strong>Consulta avulsa</strong> — 5 leituras por <strong>R$ 49,90</strong>, válidas por 30 dias.
          </p>
          <button className="btn ghost small" onClick={() => subscribe('avulso')} disabled={!!busy}>
            {busy === 'avulso' ? 'Preparando…' : 'Comprar 5 leituras · R$ 49,90'}
          </button>
        </div>
        {notice && <p className="muted" style={{ marginTop: '0.8rem' }}>{notice}</p>}
        <p style={{ marginTop: '1rem' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onClose() }}>voltar</a>
        </p>
      </div>
    </div>
  )
}
