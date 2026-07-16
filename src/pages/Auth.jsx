import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = mode === 'login'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const fn = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setBusy(false)
    if (error) {
      const msgs = {
        'Invalid login credentials': 'Email ou palavra-passe incorretos.',
        'User already registered': 'Este email já tem conta — experimenta entrar.',
      }
      setError(msgs[error.message] || error.message)
      return
    }
    navigate(location.state?.from || '/leitura')
  }

  function switchMode() {
    setMode(isLogin ? 'signup' : 'login')
    setError('')
  }

  return (
    <main className="internal-page auth-page">
      <div className="container auth-grid">
        <section className="auth-intro">
          <p className="internal-kicker">Seu espaço privado</p>
          <h1>{isLogin ? 'Volte às cartas quando precisar.' : 'Comece seu primeiro ritual.'}</h1>
          <p className="auth-intro__lead">
            Seu histórico e diário permanecem guardados em seu espaço pessoal.
          </p>
          <img
            className="auth-deck"
            src={`${import.meta.env.BASE_URL}cards/verso.webp`}
            alt=""
            aria-hidden="true"
          />
        </section>

        <section className="card-panel ornate-panel auth-panel" aria-label={isLogin ? 'Entrar' : 'Criar conta'}>
          <h2 className="auth-panel__title">{isLogin ? 'Que bom ter você de volta' : 'Crie sua conta Veleda'}</h2>
          <div className="ornamental-rule ornamental-rule--center" aria-hidden="true"><span>✦</span></div>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="auth-password">Senha</label>
              <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="error-msg" role="alert">{error}</p>}
            <button className="btn btn--wine auth-submit" type="submit" disabled={busy}>
              {busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
            <p className="auth-switch-row">
              {isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
              <button className="text-button" type="button" onClick={switchMode}>
                {isLogin ? 'Cadastre-se' : 'Entre aqui'}
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}
