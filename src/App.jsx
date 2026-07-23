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
import Account from './pages/Account'
import Cookies from './pages/Cookies'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'

export { useAuth }

// O link de recuperação NÃO vale como login: quem chega por ele fica preso no
// ecrã de nova senha (qualquer rota, com reload) até a troca ser confirmada.
const RECOVERY_FLAG = 'veleda_recovery_pending'
const arrivedViaRecoveryLink =
  typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
if (arrivedViaRecoveryLink) localStorage.setItem(RECOVERY_FLAG, '1')

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
  const [recoveryPending, setRecoveryPending] = useState(
    () => arrivedViaRecoveryLink ||
      (typeof window !== 'undefined' && localStorage.getItem(RECOVERY_FLAG) === '1')
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      // sem sessão o lock não se aplica — a pessoa terá de pedir novo link
      if (!data.session) { localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') { localStorage.setItem(RECOVERY_FLAG, '1'); setRecoveryPending(true) }
      if (event === 'SIGNED_OUT') { localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const recoveryDone = () => { localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false) }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      <div className="shell app-layout">
        {recoveryPending && session ? (
          // lock de recuperação: um único ecrã, sem header, sem navegação
          <div className="app-content">
            <Auth recoveryLock onRecoveryDone={recoveryDone} />
          </div>
        ) : (
          <>
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
                <Route path="/conta" element={<Protected><Account /></Protected>} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <AppFooter />
          </>
        )}
      </div>
    </AuthContext.Provider>
  )
}
