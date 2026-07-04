import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { useAuth } from '../App'
import { fetchCards, shuffleDeck, generateReading, readingsThisWeek } from '../lib/api'
import FanSpread from '../components/FanSpread'
import Paywall from '../components/Paywall'
import { CardFront } from '../components/TarotCard'

export default function NewReading() {
  const { user } = useAuth()
  const [step, setStep] = useState('pergunta') // pergunta | tiragem | leitura
  const [question, setQuestion] = useState('')
  const [deck, setDeck] = useState([])
  const [picked, setPicked] = useState([])
  const [reading, setReading] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [usedThisWeek, setUsedThisWeek] = useState(null)

  useEffect(() => {
    readingsThisWeek(user.id).then(setUsedThisWeek).catch(() => {})
  }, [user.id])

  async function startSpread(e) {
    e.preventDefault()
    setError('')
    try {
      const cards = await fetchCards()
      setDeck(shuffleDeck(cards))
      setPicked([])
      setStep('tiragem')
    } catch {
      setError('Não consegui baralhar as cartas. Tenta de novo.')
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
      else setError('A leitura falhou. Respira fundo e tenta outra vez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <div className="container">
        {step === 'pergunta' && (
          <div className="card-panel" style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2>✦ O que te traz até às cartas?</h2>
            <p className="muted" style={{ margin: '0.5rem 0 1.2rem' }}>
              Escreve a tua pergunta com calma. Quanto mais concreta, mais clara será a leitura.
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
                Baralhar as cartas
              </button>
              {usedThisWeek !== null && usedThisWeek >= 1 && (
                <p className="muted" style={{ marginTop: '0.8rem' }}>
                  ✦ Já usaste a tua leitura gratuita desta semana — podes tirar as cartas, mas a leitura pedirá Premium.
                </p>
              )}
            </form>
          </div>
        )}

        {step === 'tiragem' && (
          <div style={{ textAlign: 'center' }}>
            <h2>✦ Escolhe 3 cartas</h2>
            <p className="muted">Deixa a intuição guiar a mão. {3 - picked.length > 0 ? `Faltam ${3 - picked.length}.` : 'Tiragem completa.'}</p>
            <FanSpread deck={deck} picked={picked} onPick={(c) => setPicked((p) => [...p, c])} />
            <div style={{ marginTop: '1.6rem' }}>
              <button className="btn" onClick={reveal} disabled={picked.length !== 3 || busy}>
                {busy ? 'A Veleda está a ler…' : 'Revelar a leitura'}
              </button>
            </div>
            {error && <p className="error-msg" style={{ marginTop: '0.8rem' }}>{error}</p>}
          </div>
        )}

        {step === 'leitura' && reading && (
          <div className="card-panel" style={{ maxWidth: 720, margin: '0 auto' }}>
            <p className="muted">A tua pergunta</p>
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
              <Link to={`/historico/${reading.id}`} className="btn">Escrever no diário</Link>
              <Link to="/historico" className="btn ghost">Ver histórico</Link>
            </div>
          </div>
        )}

        {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
      </div>
    </main>
  )
}
