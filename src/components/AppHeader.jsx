import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'
import VeledaLogo from './VeledaLogo'
import LanguageMenu from './LanguageMenu'

export default function AppHeader() {
  const { session } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const toggleRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  async function sair() {
    setOpen(false)
    await supabase.auth.signOut()
    navigate('/')
  }

  function AppLink({ to, children }) {
    if (session) return <NavLink to={to}>{children}</NavLink>
    return <Link to="/auth" state={{ from: to }}>{children}</Link>
  }

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <div className="app-header__brand">
          <VeledaLogo />
          <span className="app-header__tagline">
            {t('brand.tagline')}
          </span>
        </div>
        <button
          ref={toggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="main-navigation"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="main-navigation"
          className={`main-navigation ${open ? 'is-open' : ''}`}
          aria-label={t('nav.main')}
          onClick={(event) => {
            if (event.target.closest('a')) setOpen(false)
          }}
        >
          <AppLink to="/leitura">{t('nav.newReading')}</AppLink>
          <AppLink to="/historico">{t('nav.history')}</AppLink>
          <AppLink to="/diario">{t('nav.journal')}</AppLink>
          {session && <NavLink to="/conta">{t('nav.account')}</NavLink>}
          {session ? (
            <button type="button" onClick={sair}>{t('nav.signOut')}</button>
          ) : (
            <NavLink to="/auth">{t('nav.signIn')}</NavLink>
          )}
          <LanguageMenu />
        </nav>
      </div>
    </header>
  )
}
