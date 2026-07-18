import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import VeledaLogo from './VeledaLogo'

export default function AppHeader() {
  const { session } = useAuth()
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
        <VeledaLogo />
        <button
          ref={toggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="main-navigation"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="main-navigation"
          className={`main-navigation ${open ? 'is-open' : ''}`}
          aria-label="Navegação principal"
          onClick={(event) => {
            if (event.target.closest('a')) setOpen(false)
          }}
        >
          <AppLink to="/leitura">Nova leitura</AppLink>
          <AppLink to="/historico">Histórico</AppLink>
          <AppLink to="/diario">Diário</AppLink>
          {session && <NavLink to="/conta">Minha conta</NavLink>}
          {session ? (
            <button type="button" onClick={sair}>Sair</button>
          ) : (
            <NavLink to="/auth">Entrar</NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
