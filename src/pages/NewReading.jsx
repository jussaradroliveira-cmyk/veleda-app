import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { fetchCards, shuffleDeck, generateReading, readingsThisWeek } from '../lib/api'
import FanSpread from '../components/FanSpread'
import Paywall from '../components/Paywall'
import StepIndicator from '../components/StepIndicator'
import { CardFront } from '../components/TarotCard'

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

const MSG_COMPOSTA = 'Sinto aqui mais de uma pergunta. As cartas pedem um único foco por leitura — escolha a que mais importa agora e guarde a outra para a próxima.'

export default function NewReading() {
  const { user } = useAuth()
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

  useEffect(() => {
    readingsThisWeek(user.id).then(setUsedThisWeek).catch(() => {})
  }, [user.id])

  // o nome vive no perfil (por conta), nunca no aparelho — senão uma pessoa
  // via o nome de outra que tivesse usado o mesmo navegador
  useEffect(() => {
    let ativo = true
    supabase
      .from('profiles')
      .select('display_name, is_premium')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!ativo) return
        setIsPremium(Boolean(data?.is_premium))
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
    try {
      const cards = await fetchCards()
      setDeck(shuffleDeck(cards))
      setPicked([])
      setStep('tiragem')
    } catch {
      setError('Não consegui embaralhar as cartas. Tente de novo.')
    }
  }

  async function reveal() {
    setBusy(true)
    setError('')
    try {
      const r = await generateReading(question, picked)
      setReading(r)
      setStep('leitura')
    } catch (err) {
      if (err.code === 'quota_exceeded') setShowPaywall(true)
      else if (err.code === 'compound_question') setError(MSG_COMPOSTA)
      else setError('O véu tremeu por um instante e a leitura não chegou. Suas cartas continuam escolhidas — toque em "Revelar a leitura" para tentar de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={`internal-page reading-page reading-page--${step}`}>
      <div className="container">
        {step === null && <p className="muted" style={{ textAlign: 'center' }}>Abrindo o véu…</p>}
        {step !== null && <StepIndicator current={step} />}
        {step === 'nome' && (
          <div className="card-panel ornate-panel name-panel">
            <p className="internal-kicker">Antes de abrir as cartas</p>
            <h2>Como você gostaria de ser chamada ou chamado?</h2>
            <p className="muted name-panel__lead">A Veleda usará seu nome com delicadeza durante a leitura.</p>
            <form onSubmit={saveName}>
              <label className="sr-only" htmlFor="display-name">Seu nome</label>
              <input id="display-name" className="name-input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" maxLength={60} autoComplete="name" required />
              <button className="btn btn--wine" type="submit" disabled={!displayName.trim()}>Continuar</button>
            </form>
          </div>
        )}
        {step === 'pergunta' && (
          <div className="card-panel ornate-panel" style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2>✦ {displayName}, o que traz você até as cartas?</h2>
            <p className="muted" style={{ margin: '0.5rem 0 1.2rem' }}>
              Escreva sua pergunta com calma — uma só por leitura. Quanto mais concreta, mais clara será a resposta.
            </p>
            <form onSubmit={startSpread}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex.: Que energia me acompanha nesta mudança de trabalho?"
                maxLength={500}
                required
              />
              {error && <p className="error-msg">{error}</p>}
              <button className="btn" type="submit" disabled={!question.trim()} style={{ marginTop: '1rem' }}>
                Embaralhar as cartas
              </button>
              {!isPremium && usedThisWeek !== null && usedThisWeek >= FREE_READINGS_PER_WEEK && (
                <p className="muted" style={{ marginTop: '0.8rem' }}>
                  ✦ Você já usou sua leitura gratuita desta semana — pode tirar as cartas, mas a leitura pedirá Premium.
                </p>
              )}
            </form>
          </div>
        )}

        {step === 'tiragem' && (
          <div className="reading-stage">
            <p className="internal-kicker">O chamado das cartas</p>
            <h2>✦ Escolha 3 cartas</h2>
            <p className="muted">Deixe a intuição guiar sua mão. {3 - picked.length > 0 ? `Faltam ${3 - picked.length}.` : 'Tiragem completa.'}</p>
            <FanSpread deck={deck} picked={picked} onPick={(c) => setPicked((p) => [...p, c])} />
            {busy ? (
              <div className="reading-loading" role="status">
                <div className="celestial-spinner" aria-hidden="true">
                  <span className="ring ring--outer" />
                  <span className="ring ring--inner" />
                  <span className="star">✦</span>
                </div>
                <p>A Veleda está fazendo sua leitura…</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.6rem' }}>
                <button className="btn" onClick={reveal} disabled={picked.length !== 3}>
                  Revelar a leitura
                </button>
              </div>
            )}
            {error && <p className="error-msg" style={{ marginTop: '0.8rem' }}>{error}</p>}
          </div>
        )}

        {step === 'leitura' && reading && (
          <div className="card-panel ornate-panel" style={{ maxWidth: 720, margin: '0 auto' }}>
            <p className="muted">Sua pergunta</p>
            <h2 style={{ marginBottom: '1rem' }}>“{reading.question}”</h2>
            <div className="spread-slots" style={{ marginBottom: '1.5rem' }}>
              {reading.cards.map((c) => {
                const full = deck.find((d) => d.id === c.card_id) || c
                return (
                  <div className="slot" key={c.position}>
                    <div className="slot-label">{c.position}</div>
                    <CardFront card={{ ...full, ...c }} />
                  </div>
                )
              })}
            </div>
            <div className="reading-text" dangerouslySetInnerHTML={{ __html: marked.parse(reading.reading_text) }} />
            <div style={{ marginTop: '1.8rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <Link to="/diario" className="btn">Escrever no diário</Link>
              <Link to="/historico" className="btn ghost">Ver histórico</Link>
            </div>
          </div>
        )}

        {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
      </div>
    </main>
  )
}
