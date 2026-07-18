import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// versão dos documentos aceites no cadastro (atualizar quando os textos mudarem)
const TERMS_VERSION = 'minuta-2-2026-07-18'

const TITULOS = {
  login: 'Que bom ter você de volta',
  signup: 'Crie sua conta Veleda',
  forgot: 'Vamos recuperar seu acesso',
  reset: 'Escolha sua nova senha',
}

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup | forgot | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [termsOk, setTermsOk] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = mode === 'login'

  // quem chega pelo link do email de recuperação entra no modo "nova senha"
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError('')
        setNotice('')
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth`,
      })
      setBusy(false)
      if (error) setError('Não consegui enviar o email. Confira o endereço e tente de novo.')
      else setNotice('✦ Enviamos um link de recuperação para seu email. Abra a mensagem e siga o link.')
      return
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.updateUser({ password })
      setBusy(false)
      if (error) {
        setError(error.message.includes('different from the old')
          ? 'A nova senha precisa ser diferente da anterior.'
          : 'Não consegui salvar a nova senha. Tente de novo.')
        return
      }
      navigate('/leitura')
      return
    }

    if (mode === 'signup' && (!ageOk || !termsOk)) {
      setBusy(false)
      setError('Para criar a conta, confirme que tem 18 anos ou mais e que aceita os Termos e a Política de Privacidade.')
      return
    }

    const fn = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { data, error } = await fn
    if (error) {
      setBusy(false)
      const msgs = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'User already registered': 'Este email já tem conta — tente entrar.',
      }
      setError(msgs[error.message] || error.message)
      return
    }
    if (mode === 'signup' && data?.user) {
      // regista a versão e o momento do aceite no perfil recém-criado
      await supabase
        .from('profiles')
        .update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }
    setBusy(false)
    navigate(location.state?.from || '/leitura')
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
    setAgeOk(false)
    setTermsOk(false)
  }

  const showEmail = mode !== 'reset'
  const showPassword = mode === 'login' || mode === 'signup' || mode === 'reset'
  const submitLabel = busy
    ? 'Aguarde…'
    : mode === 'login' ? 'Entrar'
    : mode === 'signup' ? 'Criar conta'
    : mode === 'forgot' ? 'Enviar link de recuperação'
    : 'Salvar nova senha'

  return (
    <main className="internal-page auth-page">
      <div className="container auth-grid">
        <section className="auth-intro">
          <p className="internal-kicker">Seu espaço privado</p>
          <h1>{isLogin || mode === 'reset' ? 'Volte às cartas quando precisar.' : mode === 'forgot' ? 'As cartas esperam por você.' : 'Comece seu primeiro ritual.'}</h1>
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

        <section className="card-panel ornate-panel auth-panel" aria-label={TITULOS[mode]}>
          <h2 className="auth-panel__title">{TITULOS[mode]}</h2>
          <div className="ornamental-rule ornamental-rule--center" aria-hidden="true"><span>✦</span></div>
          <form onSubmit={submit}>
            {showEmail && (
              <div className="field">
                <label htmlFor="auth-email">Email</label>
                <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            )}
            {showPassword && (
              <div className="field">
                <label htmlFor="auth-password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</label>
                <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} />
              </div>
            )}
            {mode === 'signup' && (
              <fieldset className="consent-fieldset">
                <legend className="sr-only">Declarações obrigatórias</legend>
                <label className="consent-check">
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} required />
                  <span>Declaro ter 18 anos ou mais.</span>
                </label>
                <label className="consent-check">
                  <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} required />
                  <span>
                    Li e aceito os <Link to="/termos" target="_blank">Termos de Uso</Link> e a{' '}
                    <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.
                  </span>
                </label>
              </fieldset>
            )}
            {error && <p className="error-msg" role="alert">{error}</p>}
            {notice && <p className="muted" role="status">{notice}</p>}
            <button
              className="btn btn--wine auth-submit"
              type="submit"
              disabled={busy || (mode === 'signup' && (!ageOk || !termsOk))}
            >
              {submitLabel}
            </button>
            {mode === 'login' && (
              <p className="auth-switch-row">
                <button className="text-button" type="button" onClick={() => switchMode('forgot')}>
                  Esqueceu a senha?
                </button>
              </p>
            )}
            {(mode === 'login' || mode === 'signup') && (
              <p className="auth-switch-row">
                {isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
                <button className="text-button" type="button" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
                  {isLogin ? 'Cadastre-se' : 'Entre aqui'}
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p className="auth-switch-row">
                <button className="text-button" type="button" onClick={() => switchMode('login')}>
                  ← Voltar para entrar
                </button>
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
