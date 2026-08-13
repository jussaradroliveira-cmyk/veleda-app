import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { fetchCards, shuffleDeck, generateReading, readingsThisWeek, shouldRenewIdempotencyKey } from '../lib/api'
import FanSpread from '../components/FanSpread'
import Paywall from '../components/Paywall'
import StepIndicator from '../components/StepIndicator'
import { CardFront } from '../components/TarotCard'
import SafeMarkdown from '../components/SafeMarkdown'
import { useI18n } from '../lib/i18n-context'
import { detectCrisis, getCrisisResources } from '../../supabase/functions/_shared/ai-safety.js'

const FREE_READINGS_PER_WEEK = 1

// espelha a validação da Edge Function: uma leitura, uma pergunta
function isCompoundQuestion(q) {
  const marks = (q.match(/\?/g) ?? []).length
  if (marks > 1) return true
  const interrogativas = /\b(quando|onde|como|por\s*qu[eê]|o\s*que|quem|qual|quais|ser[áa]\s+que|vou|vai|devo|posso|quero\s+saber|me\s+diga|fale\s+sobre)\b/gi
  const clausulas = q.split(/\b(?:e|e\s+tamb[ée]m|al[ée]m\s+disso)\b/i)
  let comInterrogativa = 0
  for (const c of clausulas) {
    if (interrogativas.test(c)) comInterrogativa++
    interrogativas.lastIndex = 0
  }
  return comInterrogativa >= 2
}

export default function NewReading() {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const MSG_COMPOSTA = t('reading.compound')
  const MSG_PREMIUM_DIA = t('reading.premiumDaily')
  const crisisResources = getCrisisResources(locale)
  const [step, setStep] = useState(null) // null (a carregar) | nome | pergunta | tiragem | leitura
  const [displayName, setDisplayName] = useState('')
  const [question, setQuestion] = useState('')
  const [deck, setDeck] = useState([])
  const [picked, setPicked] = useState([])
  const [reading, setReading] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [usedThisWeek, setUsedThisWeek] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [credits, setCredits] = useState(0)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  // VLT2-015: pergunta com sinais de crise → mostrar acolhimento antes da leitura.
  const [crisis, setCrisis] = useState(false)

  useEffect(() => {
    readingsThisWeek(user.id).then(setUsedThisWeek).catch(() => {})
  }, [user.id])

  // o nome vive no perfil (por conta), nunca no aparelho — senão uma pessoa
  // via o nome de outra que tivesse usado o mesmo navegador
  useEffect(() => {
    let ativo = true
    supabase
      .from('profiles')
      .select('display_name, is_premium, reading_credits, reading_credits_expire_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!ativo) return
        setIsPremium(Boolean(data?.is_premium))
        const valido = data?.reading_credits_expire_at && new Date(data.reading_credits_expire_at) > new Date()
        setCredits(valido ? (data.reading_credits ?? 0) : 0)
        // só na primeira resolução — nunca sobrepor o que a pessoa já digitou
        setStep((prev) => {
          if (prev !== null) return prev
          const nome = (data?.display_name ?? '').trim()
          setDisplayName(nome)
          return nome ? 'pergunta' : 'nome'
        })
      })
    return () => { ativo = false }
  }, [user.id])

  async function saveName(e) {
    e.preventDefault()
    const cleanName = displayName.trim().replace(/\s+/g, ' ')
    if (!cleanName) return
    await supabase.from('profiles').update({ display_name: cleanName }).eq('id', user.id)
    setDisplayName(cleanName)
    setStep('pergunta')
  }

  async function startSpread(e) {
    e.preventDefault()
    setError('')
    if (isCompoundQuestion(question)) {
      setError(MSG_COMPOSTA)
      return
    }
    // Plano verificado ANTES da tiragem: sem Premium, sem créditos e com a
    // leitura grátis da semana gasta → paywall já aqui, em vez de deixar a
    // pessoa escolher as cartas para ser barrada no fim. (O servidor continua
    // a ser a autoridade — reserve_reading_request conta por reservas.)
    if (!isPremium && credits === 0 && usedThisWeek !== null && usedThisWeek >= FREE_READINGS_PER_WEEK) {
      setShowPaywall(true)
      return
    }
    // VLT2-015: deteção de crise ANTES de enviar — o acolhimento fica visível
    // enquanto a pessoa escolhe as cartas e antes de revelar a leitura.
    setCrisis(detectCrisis(question))
    try {
      const cards = await fetchCards()
      setDeck(shuffleDeck(cards))
      setPicked([])
      setIdempotencyKey(crypto.randomUUID())
      setStep('tiragem')
    } catch {
      setError(t('reading.shuffleError'))
    }
  }

  async function reveal() {
    setBusy(true)
    setError('')
    try {
      const r = await generateReading(question, picked, idempotencyKey, locale)
      setReading(r)
      setStep('leitura')
    } catch (err) {
      if (err.code === 'quota_exceeded') setShowPaywall(true)
      else if (err.code === 'premium_daily_reached') setError(MSG_PREMIUM_DIA)
      else if (err.code === 'compound_question') setError(MSG_COMPOSTA)
      else {
        // VLT2-005: se a reserva foi liberada no servidor, a chave atual já não
        // serve — renova para que o próximo "Revelar" comece uma reserva nova.
        if (shouldRenewIdempotencyKey(err.code)) setIdempotencyKey(crypto.randomUUID())
        setError(t('reading.veilError'))
      }
    } finally {
      setBusy(false)
    }
  }

  function startNewReading() {
    setQuestion('')
    setPicked([])
    setDeck([])
    setReading(null)
    setError('')
    setCrisis(false)
    // o plano pode ter mudado com a leitura que acabou (crédito consumido,
    // grátis da semana gasta) — refresca antes de deixar perguntar de novo
    readingsThisWeek(user.id).then(setUsedThisWeek).catch(() => {})
    supabase
      .from('profiles')
      .select('is_premium, reading_credits, reading_credits_expire_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsPremium(Boolean(data?.is_premium))
        const valido = data?.reading_credits_expire_at && new Date(data.reading_credits_expire_at) > new Date()
        setCredits(valido ? (data.reading_credits ?? 0) : 0)
      })
    setStep('pergunta')
  }

  const crisisNotice = crisis && (
    <aside className="crisis-notice" role="alert" aria-label={t('reading.crisisAria')}>
      <p className="crisis-notice__headline">{crisisResources.headline}</p>
      <p>{crisisResources.body}</p>
      <ul className="crisis-notice__list">
        {crisisResources.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </aside>
  )

  return (
    <main className={`internal-page reading-page reading-page--${step}`}>
      <div className="container">
        {step === null && <p className="muted" style={{ textAlign: 'center' }}>{t('reading.loading')}</p>}
        {step !== null && <StepIndicator current={step} />}
        {step === 'nome' && (
          <div className="card-panel ornate-panel name-panel">
            <p className="internal-kicker">{t('reading.nameKicker')}</p>
            <h2>{t('reading.nameTitle')}</h2>
            <p className="muted name-panel__lead">{t('reading.nameLead')}</p>
            <form onSubmit={saveName}>
              <label className="sr-only" htmlFor="display-name">{t('reading.nameLabel')}</label>
              <input id="display-name" className="name-input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('reading.nameLabel')} maxLength={60} autoComplete="name" required />
              <button className="btn btn--wine" type="submit" disabled={!displayName.trim()}>{t('reading.continue')}</button>
            </form>
          </div>
        )}
        {step === 'pergunta' && (
          <div className="card-panel ornate-panel" style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2>{t('reading.greeting').replace('{name}', displayName)}</h2>
            <p className="muted" style={{ margin: '0.5rem 0 1.2rem' }}>
              {t('reading.questionLead')}
            </p>
            {/* VLT2-015: aviso ANTES do envio, sempre visível. */}
            <p className="pre-send-note" role="note">
              {t('reading.preSend')}
            </p>
            {crisisNotice}
            <form onSubmit={startSpread}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('reading.questionPlaceholder')}
                maxLength={500}
                required
              />
              {error && <p className="error-msg">{error}</p>}
              <button className="btn" type="submit" disabled={!question.trim()} style={{ marginTop: '1rem' }}>
                {t('reading.shuffle')}
              </button>
              {!isPremium && credits > 0 && (
                <p className="muted" style={{ marginTop: '0.8rem' }}>
                  ✦ {t('reading.creditsBefore')} <strong>{credits} {credits === 1 ? t('reading.creditUnitOne') : t('reading.creditUnitMany')}</strong>
                </p>
              )}
              {!isPremium && credits === 0 && usedThisWeek !== null && usedThisWeek >= FREE_READINGS_PER_WEEK && (
                <p className="muted" style={{ marginTop: '0.8rem' }}>
                  {t('reading.freeUsed')}
                </p>
              )}
            </form>
          </div>
        )}

        {step === 'tiragem' && (
          <div className="reading-stage">
            <p className="internal-kicker">{t('reading.drawKicker')}</p>
            <h2>{t('reading.drawTitle')}</h2>
            <p className="muted">{t('reading.drawLeadBase')} {3 - picked.length > 0 ? t('reading.remaining').replace('{n}', 3 - picked.length) : t('reading.spreadComplete')}</p>
            {crisisNotice}
            <FanSpread deck={deck} picked={picked} onPick={(c) => setPicked((p) => [...p, c])} />
            {busy ? (
              <div className="reading-loading" role="status">
                <div className="celestial-spinner" aria-hidden="true">
                  <span className="ring ring--outer" />
                  <span className="ring ring--inner" />
                  <span className="star">✦</span>
                </div>
                <p>{t('reading.generating')}</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.6rem' }}>
                <button className="btn" onClick={reveal} disabled={picked.length !== 3}>
                  {t('reading.reveal')}
                </button>
              </div>
            )}
            {error && <p className="error-msg" style={{ marginTop: '0.8rem' }}>{error}</p>}
          </div>
        )}

        {step === 'leitura' && reading && (
          <div className="card-panel ornate-panel" style={{ maxWidth: 720, margin: '0 auto' }}>
            <p className="muted">{t('reading.yourQuestion')}</p>
            <h2 style={{ marginBottom: '1rem' }}>“{reading.question}”</h2>
            <div className="spread-slots" style={{ marginBottom: '1.5rem' }}>
              {reading.cards.map((c) => {
                const full = deck.find((d) => d.id === c.card_id) || c
                const posKey = { passado: 'reading.posPast', presente: 'reading.posPresent', futuro: 'reading.posFuture' }[c.position]
                return (
                  <div className="slot" key={c.position}>
                    <div className="slot-label">{posKey ? t(posKey) : c.position}</div>
                    <CardFront card={{ ...full, ...c }} />
                  </div>
                )
              })}
            </div>
            {crisisNotice}
            <SafeMarkdown>{reading.reading_text}</SafeMarkdown>
            <div style={{ marginTop: '1.8rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button className="btn" onClick={startNewReading}>{t('reading.newReading')}</button>
              <Link to="/diario" className="btn ghost">{t('reading.writeJournal')}</Link>
              <Link to="/historico" className="btn ghost">{t('reading.viewHistory')}</Link>
            </div>
            <aside className="reading-disclaimer" role="note" aria-label={t('reading.disclaimerAria')} style={{ marginTop: '1.5rem' }}>
              {t('reading.disclaimer')}
            </aside>
          </div>
        )}

        {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
      </div>
    </main>
  )
}
