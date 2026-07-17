import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function History() {
  const { user } = useAuth()
  const [readings, setReadings] = useState(null)

  useEffect(() => {
    supabase
      .from('readings')
      .select('id, question, cards, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReadings(data ?? []))
  }, [user.id])

  return (
    <main className="internal-page history-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: '1.2rem' }}>✦ Seu histórico</h2>
        {readings === null && <p className="muted">Relembrando suas leituras…</p>}
        {readings?.length === 0 && (
          <div className="card-panel" style={{ textAlign: 'center' }}>
            <p className="muted">Você ainda não tem leituras guardadas.</p>
            <Link to="/leitura" className="btn" style={{ marginTop: '1rem' }}>Fazer a primeira leitura</Link>
          </div>
        )}
        {readings?.map((r) => (
          <Link to={`/historico/${r.id}`} className="history-item" key={r.id}>
            <div className="q">“{r.question}”</div>
            <div className="meta">
              {new Date(r.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' ✦ '}
              {r.cards.map((c) => c.name).join(' · ')}
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
