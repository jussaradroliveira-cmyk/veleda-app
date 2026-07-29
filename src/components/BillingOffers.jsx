import { useEffect, useMemo, useState } from 'react'
import { getBillingCatalog } from '../lib/billing'

const MARKET_LABELS = {
  BR: 'Brasil',
  PT_EU: 'Portugal / União Europeia',
}

function money(item, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: item.currency.toUpperCase(),
  }).format(item.unit_amount / 100)
}

export default function BillingOffers({ busy, onCheckout, includePack = true }) {
  const [catalog, setCatalog] = useState(null)
  const [market, setMarket] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getBillingCatalog().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError('As ofertas não estão disponíveis neste momento.')
        return
      }
      setCatalog(result)
      const codes = Object.keys(result.markets ?? {})
      setMarket(codes.includes('BR') ? 'BR' : (codes[0] ?? ''))
    }).catch(() => active && setError('As ofertas não estão disponíveis neste momento.'))
    return () => { active = false }
  }, [])

  const selected = useMemo(() => catalog?.markets?.[market] ?? null, [catalog, market])
  if (error) return <p className="muted" role="status">{error}</p>
  if (!catalog) return <p className="muted">Consultando as ofertas disponíveis…</p>
  if (!selected) {
    return (
      <p className="muted">
        Nenhum mercado está habilitado para contratação. O uso gratuito continua disponível.
      </p>
    )
  }

  const monthly = selected.items.mensal
  const annual = selected.items.anual
  const pack = selected.items.avulso
  return (
    <>
      {Object.keys(catalog.markets).length > 1 && (
        <div className="field">
          <label htmlFor="billing-market">Mercado da oferta</label>
          <select id="billing-market" value={market} onChange={(event) => setMarket(event.target.value)}>
            {Object.keys(catalog.markets).map((code) => (
              <option value={code} key={code}>{MARKET_LABELS[code]}</option>
            ))}
          </select>
        </div>
      )}
      <p className="muted">Oferta para {MARKET_LABELS[market]}. A cobrança será feita em {selected.currency.toUpperCase()}.</p>
      <div className="preco">
        {money(monthly, selected.locale)}
        <span className="preco__periodo">/mês</span>
      </div>
      <p className="paywall__anual">
        ✦ plano anual: <strong>{money(annual, selected.locale)}/ano</strong>
      </p>
      <p className="muted billing-personal-note">
        Sua assinatura é pessoal e intransferível. As leituras são para seu uso próprio
        e não podem ser partilhadas ou revendidas.
      </p>
      <div className="paywall__botoes">
        <button className="btn btn--wine" onClick={() => onCheckout('anual', market)} disabled={!!busy}>
          {busy === 'anual' ? 'Preparando…' : `Assinar anual · ${money(annual, selected.locale)}`}
        </button>
        <button className="btn ghost" onClick={() => onCheckout('mensal', market)} disabled={!!busy}>
          {busy === 'mensal' ? 'Preparando…' : `Assinar mensal · ${money(monthly, selected.locale)}`}
        </button>
      </div>
      {includePack && (
        <div className="paywall__avulso">
          <p className="paywall__avulso-label">Sem renovação automática?</p>
          <p className="paywall__avulso-desc">
            <strong>Consulta avulsa</strong> — {pack.quantity} leituras por{' '}
            <strong>{money(pack, selected.locale)}</strong>, válidas por {pack.valid_days} dias.
          </p>
          <button className="btn ghost small" onClick={() => onCheckout('avulso', market)} disabled={!!busy}>
            {busy === 'avulso' ? 'Preparando…' : `Comprar ${pack.quantity} leituras · ${money(pack, selected.locale)}`}
          </button>
        </div>
      )}
      <p className="muted">
        Antes de pagar, o Stripe exibirá o valor total e a moeda. Assinaturas
        renovam até o cancelamento da renovação; a compra avulsa não renova.
        Cancelamento e exclusão não geram reembolso automático. Consulte os{' '}
        <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a>.
      </p>
    </>
  )
}
