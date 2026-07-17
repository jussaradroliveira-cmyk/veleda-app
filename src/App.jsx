import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, useAuth } from './lib/auth-context'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import NewReading from './pages/NewReading'
import History from './pages/History'
import ReadingDetail from './pages/ReadingDetail'
import Journal from './pages/Journal'
import Subscription from './pages/Subscription'
import Cookies from './pages/Cookies'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'

export { useAuth }

function Protected({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="container"><p className="muted">Abrindo o véu…</p></main>
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return children
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
      <div className="shell app-layout">
        <AppHeader />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leitura" element={<Protected><NewReading /></Protected>} />
            <Route path="/historico" element={<Protected><History /></Protected>} />
            <Route path="/historico/:id" element={<Protected><ReadingDetail /></Protected>} />
            <Route path="/diario" element={<Protected><Journal /></Protected>} />
            <Route path="/assinatura" element={<Protected><Subscription /></Protected>} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <AppFooter />
      </div>
    </AuthContext.Provider>
  )
}
