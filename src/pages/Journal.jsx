import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { useI18n } from '../lib/i18n-context'

// Espelha a constraint journal_entries_content_len no banco (VLT-011).
const MAX_JOURNAL_CHARS = 8000

export default function Journal() {
  const { user } = useAuth()
  const { t, dateLocale } = useI18n()
  const [entries, setEntries] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    setError('')
    const { error: insertError } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, content: draft.slice(0, MAX_JOURNAL_CHARS) })
    setBusy(false)
    if (insertError) {
      setError(t('journal.saveError'))
      return
    }
    setDraft('')
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
          <p className="internal-kicker">{t('journal.kicker')}</p>
          <h1>{t('journal.title')}</h1>
          <p className="muted journal-hero__lead">
            {t('journal.lead')}
          </p>
        </header>
        <section className="card-panel ornate-panel journal-compose">
          <form onSubmit={(event) => { event.preventDefault(); addEntry() }}>
            <label className="journal-compose__label" htmlFor="journal-draft">{t('journal.label')}</label>
            <textarea id="journal-draft" value={draft} maxLength={MAX_JOURNAL_CHARS} onChange={(e) => setDraft(e.target.value)} placeholder={t('journal.placeholder')} />
            <button className="btn btn--wine" type="submit" disabled={busy || !draft.trim()}>
              {busy ? t('journal.saving') : t('journal.save')}
            </button>
            {error && <p className="error-msg" role="alert">{error}</p>}
          </form>
        </section>
        <div className="journal-entries">
        {entries === null && <p className="muted">{t('journal.loading')}</p>}
        {entries?.length === 0 && <p className="muted">{t('journal.empty')}</p>}
        {entries?.map((e) => (
          <div className="history-item" key={e.id}>
            <div className="meta">
              {new Date(e.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
              {e.reading_id && e.readings && (
                <> ✦ {t('journal.aboutReading')} <Link to={`/historico/${e.reading_id}`}>“{e.readings.question}”</Link></>
              )}
            </div>
            <p style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>{e.content}</p>
            <p style={{ marginTop: '0.4rem' }}>
              <a href="#" onClick={(ev) => { ev.preventDefault(); removeEntry(e.id) }} style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)' }}>{t('journal.delete')}</a>
            </p>
          </div>
        ))}
        </div>
      </div>
    </main>
  )
}
