import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { translations, DEFAULT_LOCALE, LOCALES, LANG_STORAGE_KEY, HTML_LANG, detectLocale } from './i18n'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale)

  // mantém <html lang> em sincronia (SEO + acessibilidade)
  useEffect(() => {
    try { document.documentElement.lang = HTML_LANG[locale] ?? locale } catch { /* ignore */ }
  }, [locale])

  const setLocale = useCallback((next) => {
    if (!LOCALES[next]) return
    setLocaleState(next)
    try { localStorage.setItem(LANG_STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  // t('area.chave'): idioma atual → fallback pt → a própria chave.
  const t = useCallback((key) => {
    const dict = translations[locale] ?? translations[DEFAULT_LOCALE]
    return dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key
  }, [locale])

  // BCP47 para formatação de datas (Intl): pt→pt-BR, en→en, fr→fr.
  const dateLocale = HTML_LANG[locale] ?? locale

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dateLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n deve ser usado dentro de <I18nProvider>')
  return ctx
}
