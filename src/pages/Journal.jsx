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
    <main className="internal-page journal-page">
      <div className="container">
        <header className="journal-hero">
          <p className="internal-kicker">Seu caderno íntimo</p>
          <h1>Diário de reflexão</h1>
          <p className="muted journal-hero__lead">
            Um lugar privado para reconhecer padrões, guardar sonhos e escutar o que permanece.
          </p>
        </header>
        <section className="card-panel ornate-panel journal-compose">
          <form onSubmit={(event) => { event.preventDefault(); addEntry() }}>
            <label className="journal-compose__label" htmlFor="journal-draft">Um pensamento, um sonho, um sinal</label>
            <textarea id="journal-draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Hoje senti…" />
            <button className="btn btn--wine" type="submit" disabled={busy || !draft.trim()}>
              {busy ? 'Guardando…' : 'Guardar entrada'}
            </button>
          </form>
        </section>
        <div className="journal-entries">
        {entries === null && <p className="muted">Folheando seu diário…</p>}
        {entries?.length === 0 && <p className="muted">Ainda não há entradas no diário.</p>}
        {entries?.map((e) => (
          <div className="history-item" key={e.id}>
            <div className="meta">
              {new Date(e.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
      </div>
    </main>
  )
}
