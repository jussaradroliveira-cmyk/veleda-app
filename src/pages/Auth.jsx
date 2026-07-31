import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n-context'

export default function Auth({ recoveryLock = false, onRecoveryDone }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const TITULOS = {
    login: t('auth.title.login'),
    signup: t('auth.title.signup'),
    forgot: t('auth.title.forgot'),
    reset: t('auth.title.reset'),
  }
  // recoveryLock: renderizada pelo lock de recuperação — só o modo reset existe.
  // chegar com state.signup abre direto no modo de cadastro (botão "Cadastre-se")
  const [mode, setMode] = useState(recoveryLock ? 'reset' : (location.state?.signup ? 'signup' : 'login')) // login | signup | forgot | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [termsOk, setTermsOk] = useState(false)
  const [privacyOk, setPrivacyOk] = useState(false)
  // cooldown do reenvio: o Supabase exige ~60s entre pedidos ao mesmo email
  const [cooldown, setCooldown] = useState(0)
  const isLogin = mode === 'login'

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

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
      if (cooldown > 0) { setBusy(false); return } // clique enquanto cinza não dispara nada
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth`,
      })
      setBusy(false)
      // no 429 (pedido repetido cedo demais) o email já foi enviado antes — mensagem honesta, nunca "erro"
      if (error && error.status !== 429) {
        setError(t('auth.errForgot'))
      } else {
        setNotice('sent')
        setCooldown(60)
      }
      return
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.updateUser({ password })
      setBusy(false)
      if (error) {
        setError(error.message.includes('different from the old')
          ? t('auth.errResetDiff')
          : t('auth.errReset'))
        return
      }
      // só aqui o lock abre: senha confirmada no servidor
      onRecoveryDone?.()
      navigate('/leitura')
      return
    }

    if (mode === 'signup' && (!ageOk || !termsOk || !privacyOk)) {
      setBusy(false)
      setError(t('auth.errConsent'))
      return
    }

    const fn = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              accept_terms: true,
              acknowledge_privacy: true,
              declare_age_18: true,
              // VLT2-007: lançamento só-BR — mercado imposto, sem escolha no front.
              locale: 'pt-BR',
              market: 'BR',
            },
          },
        })
    const { data, error } = await fn
    if (error) {
      setBusy(false)
      const msgs = {
        'Invalid login credentials': t('auth.errInvalid'),
        'User already registered': t('auth.errRegistered'),
      }
      setError(msgs[error.message] || error.message)
      return
    }
    if (mode === 'signup' && data?.user) {
      // Os três registros append-only são criados pelo trigger de Auth com
      // user ID, timestamp, versões e identificadores definidos no servidor.
      // dispara o convite para adicionar ao ecrã inicial (mostrado no telemóvel)
      localStorage.setItem('veleda_install_hint', '1')
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
    setPrivacyOk(false)
    setCooldown(0)
  }

  const emailSent = mode === 'forgot' && notice === 'sent'
  const showEmail = mode !== 'reset'
  const showPassword = mode === 'login' || mode === 'signup' || mode === 'reset'
  const forgotBlocked = mode === 'forgot' && cooldown > 0
  const submitLabel = busy
    ? t('auth.wait')
    : mode === 'login' ? t('auth.submitLogin')
    : mode === 'signup' ? t('auth.submitSignup')
    : mode === 'forgot' ? (cooldown > 0 ? t('auth.submitForgotSent') : t('auth.submitForgotSend'))
    : t('auth.submitReset')

  return (
    <main className="internal-page auth-page">
      <div className="container auth-grid">
        <section className="auth-intro">
          <p className="internal-kicker">{t('auth.kicker')}</p>
          <h1>{isLogin || mode === 'reset' ? t('auth.introReturning') : mode === 'forgot' ? t('auth.introForgot') : t('auth.introSignup')}</h1>
          <p className="auth-intro__lead">
            {t('auth.introLead')}
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
                <label htmlFor="auth-email">{t('auth.email')}</label>
                <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            )}
            {showPassword && (
              <div className="field">
                <label htmlFor="auth-password">{mode === 'reset' ? t('auth.passwordNew') : t('auth.password')}</label>
                <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} />
              </div>
            )}
            {mode === 'signup' && (
              <fieldset className="consent-fieldset">
                <legend className="sr-only">{t('auth.consentLegend')}</legend>
                <label className="consent-check">
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} required />
                  <span>{t('auth.consentAge')}</span>
                </label>
                <label className="consent-check">
                  <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} required />
                  <span>
                    {t('auth.consentTermsBefore')} <Link to="/termos" target="_blank">{t('footer.terms')}</Link>{t('auth.consentTermsAfter')}
                  </span>
                </label>
                <label className="consent-check">
                  <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} required />
                  <span>
                    {t('auth.consentPrivacyBefore')} <Link to="/privacidade" target="_blank">{t('auth.privacyLink')}</Link>{t('auth.consentPrivacyAfter')}
                  </span>
                </label>
              </fieldset>
            )}
            {error && <p className="error-msg" role="alert">{error}</p>}
            {emailSent && (
              <div className="sent-notice" role="status">
                <p className="sent-notice__title">{t('auth.sentTitle')}</p>
                <p>{t('auth.sentBody')}</p>
              </div>
            )}
            <button
              className="btn btn--wine auth-submit"
              type="submit"
              disabled={busy || forgotBlocked || (mode === 'signup' && (!ageOk || !termsOk || !privacyOk))}
            >
              {submitLabel}
            </button>
            {mode === 'login' && (
              <p className="auth-switch-row">
                <button className="text-button" type="button" onClick={() => switchMode('forgot')}>
                  {t('auth.forgotLink')}
                </button>
              </p>
            )}
            {(mode === 'login' || mode === 'signup') && (
              <p className="auth-switch-row">
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                <button className="text-button" type="button" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
                  {isLogin ? t('auth.signupCta') : t('auth.loginCta')}
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p className="auth-switch-row">
                <button className="text-button" type="button" onClick={() => switchMode('login')}>
                  {t('auth.backToLogin')}
                </button>
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
