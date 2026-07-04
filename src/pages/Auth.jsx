import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

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
    navigate('/leitura')
  }

  return (
    <main>
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="card-panel">
          <h2 style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            {mode === 'login' ? '✦ Bem-vinda de volta' : '✦ Cria a tua conta'}
          </h2>
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label>Palavra-passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: '0.6rem' }}>
              {busy ? 'Um momento…' : mode === 'login' ? 'Entrar' : 'Registar'}
            </button>
          </form>
          <p className="muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
            {mode === 'login' ? (
              <>Ainda não tens conta?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError('') }}>Regista-te</a></>
            ) : (
              <>Já tens conta?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError('') }}>Entra aqui</a></>
            )}
          </p>
        </div>
      </div>
    </main>
  )
}
