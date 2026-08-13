import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { useI18n } from '../lib/i18n-context'

export default function History() {
  const { user } = useAuth()
  const { t, dateLocale } = useI18n()
  const [readings, setReadings] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('readings')
      .select('id, question, cards, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReadings(data ?? []))
  }, [user.id])

  async function clearHistory() {
    if (!window.confirm(t('history.clearConfirm'))) return
    setBusy(true)
    setError('')
    const { error: deleteError } = await supabase.from('readings').delete().eq('user_id', user.id)
    setBusy(false)
    if (deleteError) {
      setError(t('history.clearError'))
      return
    }
    setReadings([])
  }

  return (
    <main className="internal-page history-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: '1.2rem' }}>{t('history.title')}</h2>
        {readings === null && <p className="muted">{t('history.loading')}</p>}
        {readings?.length === 0 && (
          <div className="card-panel" style={{ textAlign: 'center' }}>
            <p className="muted">{t('history.empty')}</p>
            <Link to="/leitura" className="btn" style={{ marginTop: '1rem' }}>{t('history.first')}</Link>
          </div>
        )}
        {readings?.map((r) => (
          <Link to={`/historico/${r.id}`} className="history-item" key={r.id}>
            <div className="q">“{r.question}”</div>
            <div className="meta">
              {new Date(r.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
              {' ✦ '}
              {r.cards.map((c) => c.name).join(' · ')}
            </div>
          </Link>
        ))}
        {readings?.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn ghost small" onClick={clearHistory} disabled={busy}>
              {busy ? t('history.clearing') : t('history.clear')}
            </button>
            {error && <p className="error-msg" role="alert">{error}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
