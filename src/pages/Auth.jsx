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

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const fn = mode === 'login'
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

  return (
    <main className="art-page auth-art-page">
      <div className="art-frame art-frame--auth">
        <div className="art-canvas art-canvas--auth">
          <img src={`${import.meta.env.BASE_URL}design/login.png`} alt="" />
          <form className="art-overlay auth-art-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="art-control auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <label className="sr-only" htmlFor="auth-password">Senha</label>
            <input id="auth-password" className="art-control auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {error && <p className="art-message" role="alert">{error}</p>}
            <button className="art-button auth-submit" type="submit" disabled={busy}>
              <span className="sr-only">{busy ? 'Aguarde' : mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
              {(busy || mode === 'signup') && <span className="art-button-label">{busy ? 'Aguarde…' : 'Criar conta'}</span>}
            </button>
            <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
              {mode === 'login' ? <span className="sr-only">Cadastre-se</span> : 'Entre aqui'}
            </button>
          </form>
        </div>
      </div>
      <section className="art-mobile art-mobile--auth">
        <div className="art-mobile__panel">
          <p className="internal-kicker">{mode === 'login' ? 'Bem-vinda de volta' : 'Seu primeiro ritual'}</p>
          <h1>{mode === 'login' ? 'Volte às cartas quando precisar' : 'Crie sua conta Veleda'}</h1>
          <form onSubmit={submit}>
            <label htmlFor="mobile-auth-email">Email</label>
            <input id="mobile-auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <label htmlFor="mobile-auth-password">Senha</label>
            <input id="mobile-auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {error && <p className="error-msg">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
            <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
              {mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
