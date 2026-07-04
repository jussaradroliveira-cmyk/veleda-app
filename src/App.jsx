import { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import NewReading from './pages/NewReading'
import History from './pages/History'
import ReadingDetail from './pages/ReadingDetail'
import Journal from './pages/Journal'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <main className="container"><p className="muted">A abrir o véu…</p></main>
  if (!session) return <Navigate to="/auth" replace />
  return children
}

function TopBar() {
  const { session } = useAuth()
  const navigate = useNavigate()
  async function sair() {
    await supabase.auth.signOut()
    navigate('/')
  }
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <NavLink to="/" className="logo"><span className="star">✦</span> VELEDA</NavLink>
        <nav className="mainnav">
          {session ? (
            <>
              <NavLink to="/leitura">Nova leitura</NavLink>
              <NavLink to="/historico">Histórico</NavLink>
              <NavLink to="/diario">Diário</NavLink>
              <button className="btn ghost small" onClick={sair}>Sair</button>
            </>
          ) : (
            <NavLink to="/auth">Entrar</NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      <div className="shell">
        <TopBar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/leitura" element={<Protected><NewReading /></Protected>} />
          <Route path="/historico" element={<Protected><History /></Protected>} />
          <Route path="/historico/:id" element={<Protected><ReadingDetail /></Protected>} />
          <Route path="/diario" element={<Protected><Journal /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="foot">Veleda ✦ as cartas escutam-te — para reflexão e inspiração, não substitui aconselhamento profissional</footer>
      </div>
    </AuthContext.Provider>
  )
}
