import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { marked } from 'marked'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { CardFront } from '../components/TarotCard'

export default function ReadingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [reading, setReading] = useState(null)
  const [cardsFull, setCardsFull] = useState([])
  const [note, setNote] = useState('')
  const [noteId, setNoteId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

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
    if (noteId) {
      await supabase.from('journal_entries')
        .update({ content: note, updated_at: new Date().toISOString() })
        .eq('id', noteId)
    } else {
      const { data } = await supabase.from('journal_entries')
        .insert({ user_id: user.id, reading_id: id, content: note })
        .select('id').single()
      if (data) setNoteId(data.id)
    }
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!reading) return <main className="internal-page"><div className="container"><p className="muted">A abrir a leitura…</p></div></main>

  return (
    <main className="internal-page reading-detail-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <p><Link to="/historico">← histórico</Link></p>
        <div className="card-panel ornate-panel" style={{ marginTop: '0.8rem' }}>
          <p className="muted">
            {new Date(reading.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
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
          <div className="reading-text" dangerouslySetInnerHTML={{ __html: marked.parse(reading.reading_text) }} />
        </div>

        <div className="card-panel ornate-panel" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ color: 'var(--dourado)', marginBottom: '0.6rem' }}>✦ O teu diário</h3>
          <p className="muted" style={{ marginBottom: '0.8rem' }}>
            O que sentiste com esta leitura? O que reconheces na tua vida?
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escreve aqui as tuas reflexões…" />
          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn small" onClick={saveNote} disabled={busy || !note.trim()}>
              {busy ? 'A guardar…' : 'Guardar'}
            </button>
            {saved && <span className="muted">guardado ✦</span>}
          </div>
        </div>
      </div>
    </main>
  )
}
