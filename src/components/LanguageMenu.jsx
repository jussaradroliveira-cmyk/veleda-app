import { useI18n } from '../lib/i18n-context'
import { LOCALES } from '../lib/i18n'

// Menu de idiomas (PT/EN/FR). <select> acessível e leve; a escolha persiste.
export default function LanguageMenu() {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className="lang-menu">
      <span className="sr-only">{t('lang.label')}</span>
      <span className="lang-menu__globe" aria-hidden="true">🌐</span>
      <select
        className="lang-menu__select"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label={t('lang.label')}
      >
        {Object.entries(LOCALES).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </label>
  )
}
