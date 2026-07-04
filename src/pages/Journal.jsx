import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Journal() {
  const { user } = useAuth()
  const [entries, setEntries] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('id, content, created_at, reading_id, readings(question)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(data ?? [])
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function addEntry() {
    setBusy(true)
    await supabase.from('journal_entries').insert({ user_id: user.id, content: draft })
    setDraft('')
    setBusy(false)
    load()
  }

  async function removeEntry(id) {
    await supabase.from('journal_entries').delete().eq('id', id)
    load()
  }

  return (
    <main>
      <div className="container" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: '1.2rem' }}>✦ O teu diário</h2>

        <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
          <p className="muted" style={{ marginBottom: '0.8rem' }}>Um pensamento solto, um sonho, um sinal — regista aqui.</p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Hoje senti…" />
          <button className="btn small" onClick={addEntry} disabled={busy || !draft.trim()} style={{ marginTop: '0.8rem' }}>
            {busy ? 'A guardar…' : 'Guardar entrada'}
          </button>
        </div>

        {entries === null && <p className="muted">A folhear o teu diário…</p>}
        {entries?.length === 0 && <p className="muted">Ainda não há entradas no diário.</p>}
        {entries?.map((e) => (
          <div className="history-item" key={e.id}>
            <div className="meta">
              {new Date(e.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
              {e.reading_id && e.readings && (
                <> ✦ sobre a leitura <Link to={`/historico/${e.reading_id}`}>“{e.readings.question}”</Link></>
              )}
            </div>
            <p style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>{e.content}</p>
            <p style={{ marginTop: '0.4rem' }}>
              <a href="#" onClick={(ev) => { ev.preventDefault(); removeEntry(e.id) }} style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)' }}>apagar</a>
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
