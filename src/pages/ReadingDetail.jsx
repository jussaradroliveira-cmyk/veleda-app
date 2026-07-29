import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { CardFront } from '../components/TarotCard'
import SafeMarkdown from '../components/SafeMarkdown'

// Espelha a constraint journal_entries_content_len no banco (VLT-011).
const MAX_JOURNAL_CHARS = 8000

export default function ReadingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [reading, setReading] = useState(null)
  const [cardsFull, setCardsFull] = useState([])
  const [note, setNote] = useState('')
  const [noteId, setNoteId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase.from('readings').select('*').eq('id', id).single()
      if (!r) return
      setReading(r)
      const ids = r.cards.map((c) => c.card_id)
      const { data: cards } = await supabase.from('cards').select('*').in('id', ids)
      setCardsFull(cards ?? [])
      const { data: entry } = await supabase
        .from('journal_entries').select('id, content')
        .eq('reading_id', id).maybeSingle()
      if (entry) { setNote(entry.content); setNoteId(entry.id) }
    }
    load()
  }, [id])

  async function saveNote() {
    setBusy(true)
    setSaved(false)
    setError('')
    const content = note.slice(0, MAX_JOURNAL_CHARS)
    let saveError
    if (noteId) {
      const { error: updateError } = await supabase.from('journal_entries')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
      saveError = updateError
    } else {
      const { data, error: insertError } = await supabase.from('journal_entries')
        .insert({ user_id: user.id, reading_id: id, content })
        .select('id').single()
      saveError = insertError
      if (data) setNoteId(data.id)
    }
    setBusy(false)
    if (saveError) {
      setError('Não consegui guardar. Tente encurtar o texto.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!reading) return <main className="internal-page"><div className="container"><p className="muted">Abrindo a leitura…</p></div></main>

  return (
    <main className="internal-page reading-detail-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <p><Link to="/historico">← histórico</Link></p>
        <div className="card-panel ornate-panel" style={{ marginTop: '0.8rem' }}>
          <p className="muted">
            {new Date(reading.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 style={{ margin: '0.3rem 0 1.2rem' }}>“{reading.question}”</h2>
          <div className="spread-slots" style={{ marginBottom: '1.5rem' }}>
            {reading.cards.map((c) => {
              const full = cardsFull.find((k) => k.id === c.card_id) ?? {}
              return (
                <div className="slot" key={c.position}>
                  <div className="slot-label">{c.position}</div>
                  <CardFront card={{ ...full, ...c }} />
                </div>
              )
            })}
          </div>
          <SafeMarkdown>{reading.reading_text}</SafeMarkdown>
        </div>

        <div className="card-panel ornate-panel" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ color: 'var(--dourado)', marginBottom: '0.6rem' }}>✦ Seu diário</h3>
          <p className="muted" style={{ marginBottom: '0.8rem' }}>
            O que você sentiu com esta leitura? O que reconhece na sua vida?
          </p>
          <textarea value={note} maxLength={MAX_JOURNAL_CHARS} onChange={(e) => setNote(e.target.value)} placeholder="Escreva aqui suas reflexões…" />
          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn small" onClick={saveNote} disabled={busy || !note.trim()}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            {saved && <span className="muted">guardado ✦</span>}
          </div>
          {error && <p className="error-msg" role="alert">{error}</p>}
        </div>
      </div>
    </main>
  )
}
