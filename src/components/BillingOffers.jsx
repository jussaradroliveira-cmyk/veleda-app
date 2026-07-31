import { useEffect, useMemo, useState } from 'react'
import { getBillingCatalog } from '../lib/billing'
import { useI18n } from '../lib/i18n-context'

function money(item, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: item.currency.toUpperCase(),
  }).format(item.unit_amount / 100)
}

export default function BillingOffers({ busy, onCheckout, includePack = true }) {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState(null)
  const [market, setMarket] = useState('')
  const [error, setError] = useState('')
  const marketLabel = (code) => t(code === 'BR' ? 'billing.marketBR' : 'billing.marketPT')

  useEffect(() => {
    let active = true
    getBillingCatalog().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError('unavailable')
        return
      }
      setCatalog(result)
      const codes = Object.keys(result.markets ?? {})
      setMarket(codes.includes('BR') ? 'BR' : (codes[0] ?? ''))
    }).catch(() => active && setError('unavailable'))
    return () => { active = false }
  }, [])

  const selected = useMemo(() => catalog?.markets?.[market] ?? null, [catalog, market])
  if (error) return <p className="muted" role="status">{t('billing.unavailable')}</p>
  if (!catalog) return <p className="muted">{t('billing.loading')}</p>
  if (!selected) {
    return (
      <p className="muted">
        {t('billing.noMarket')}
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
          <label htmlFor="billing-market">{t('billing.marketLabel')}</label>
          <select id="billing-market" value={market} onChange={(event) => setMarket(event.target.value)}>
            {Object.keys(catalog.markets).map((code) => (
              <option value={code} key={code}>{marketLabel(code)}</option>
            ))}
          </select>
        </div>
      )}
      <p className="muted">{t('billing.offerFor').replace('{market}', marketLabel(market)).replace('{currency}', selected.currency.toUpperCase())}</p>
      <div className="preco">
        {money(monthly, selected.locale)}
        <span className="preco__periodo">{t('billing.perMonth')}</span>
      </div>
      <p className="paywall__anual">
        {t('billing.annualPlan')} <strong>{money(annual, selected.locale)}{t('billing.perYear')}</strong>
      </p>
      <p className="muted billing-personal-note">
        {t('billing.personalNote')}
      </p>
      <div className="paywall__botoes">
        <button className="btn btn--wine" onClick={() => onCheckout('anual', market)} disabled={!!busy}>
          {busy === 'anual' ? t('billing.preparing') : `${t('billing.subscribeAnnual')} · ${money(annual, selected.locale)}`}
        </button>
        <button className="btn ghost" onClick={() => onCheckout('mensal', market)} disabled={!!busy}>
          {busy === 'mensal' ? t('billing.preparing') : `${t('billing.subscribeMonthly')} · ${money(monthly, selected.locale)}`}
        </button>
      </div>
      {includePack && (
        <div className="paywall__avulso">
          <p className="paywall__avulso-label">{t('billing.packLabel')}</p>
          <p className="paywall__avulso-desc">
            <strong>{t('billing.packName')}</strong>{' '}
            {t('billing.packDesc').replace('{qty}', pack.quantity).replace('{price}', money(pack, selected.locale)).replace('{days}', pack.valid_days)}
          </p>
          <button className="btn ghost small" onClick={() => onCheckout('avulso', market)} disabled={!!busy}>
            {busy === 'avulso' ? t('billing.preparing') : `${t('billing.buyPack').replace('{qty}', pack.quantity)} · ${money(pack, selected.locale)}`}
          </button>
        </div>
      )}
      <p className="muted">
        {t('billing.footerText')}{' '}
        <a href="/termos" target="_blank" rel="noreferrer">{t('footer.terms')}</a>.
      </p>
    </>
  )
}
