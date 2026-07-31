import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n-context'

export default function AppFooter() {
  const { t } = useI18n()
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <p><strong>Veleda Tarô</strong> — {t('footer.brandTagline')}</p>
        <small>{t('footer.operator')}</small>
        <small className="app-footer__disclaimer">{t('brand.tagline')}</small>
        <nav className="app-footer__links" aria-label={t('footer.legalNav')}>
          <Link to="/termos">{t('footer.terms')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidade">{t('footer.privacy')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/subprocessadores">{t('footer.subprocessors')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cookies">{t('footer.cookies')}</Link>
        </nav>
      </div>
    </footer>
  )
}
