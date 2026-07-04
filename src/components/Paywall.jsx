import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Paywall semanal — o botão abre o checkout Stripe quando as chaves estiverem
// configuradas no servidor; até lá mostra "em breve".
export default function Paywall({ onClose }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function subscribe() {
    setBusy(true)
    setNotice('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
        }
      )
      const body = await resp.json().catch(() => ({}))
      if (resp.ok && body.url) {
        window.location.href = body.url
        return
      }
      if (body.error === 'stripe_not_configured') {
        setNotice('A subscrição Premium está quase a chegar ✦ volta em breve.')
      } else {
        setNotice('Não consegui abrir o pagamento. Tenta outra vez daqui a pouco.')
      }
    } catch {
      setNotice('Não consegui abrir o pagamento. Tenta outra vez daqui a pouco.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="card-panel paywall" onClick={(e) => e.stopPropagation()}>
        <h2>✦ O véu fecha-se por esta semana</h2>
        <p className="muted">
          Já usaste a tua leitura gratuita desta semana. As cartas voltam a abrir-se na segunda-feira —
          ou torna-te Premium e consulta a Veleda sempre que precisares.
        </p>
        <div className="preco">Veleda Premium</div>
        <ul>
          <li>Leituras ilimitadas</li>
          <li>Histórico e diário sem limites</li>
          <li>Acesso antecipado a novas tiragens</li>
        </ul>
        <button className="btn" onClick={subscribe} disabled={busy}>
          {busy ? 'A preparar…' : 'Quero ser Premium'}
        </button>
        {notice && <p className="muted" style={{ marginTop: '0.8rem' }}>{notice}</p>}
        <p style={{ marginTop: '1rem' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onClose() }}>voltar</a>
        </p>
      </div>
    </div>
  )
}
