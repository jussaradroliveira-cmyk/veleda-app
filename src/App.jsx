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
import Subprocessors from './pages/Subprocessors'
import { Analytics } from '@vercel/analytics/react'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'
import InstallPrompt from './components/InstallPrompt'
import ReacceptGate from './components/ReacceptGate'

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
  // VLT2-010: documentos legais que a pessoa ainda tem de reaceitar. null =
  // ainda não verificámos; [] = em dia; [...] = reaceite pendente.
  const [pendingConsents, setPendingConsents] = useState([])

  useEffect(() => {
    let active = true

    // pergunta ao servidor o que falta reaceitar (fonte de verdade: RPC).
    async function refreshPending() {
      const { data, error } = await supabase.rpc('pending_consents')
      if (!active) return
      // falha-aberta: um erro de rede não deve trancar a pessoa fora; o gate
      // reaparece na próxima verificação/sessão.
      setPendingConsents(error ? [] : (data ?? []))
    }

    async function boot() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      if (data.session) {
        await refreshPending()
      } else {
        // sem sessão o lock não se aplica — a pessoa terá de pedir novo link
        localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false)
        setPendingConsents([])
      }
      if (active) setLoading(false)
    }
    boot()

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') { localStorage.setItem(RECOVERY_FLAG, '1'); setRecoveryPending(true) }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false); setPendingConsents([])
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        refreshPending()
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const recoveryDone = () => { localStorage.removeItem(RECOVERY_FLAG); setRecoveryPending(false) }

  const reacceptPending = !!session && pendingConsents.length > 0

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      <div className="shell app-layout">
        {recoveryPending && session ? (
          // lock de recuperação: um único ecrã, sem header, sem navegação
          <div className="app-content">
            <Auth recoveryLock onRecoveryDone={recoveryDone} />
          </div>
        ) : reacceptPending ? (
          // gate de reaceite: bloqueia o uso, mas deixa LER /termos e /privacidade
          // (os links abrem noutro separador, que cai nestas mesmas rotas).
          <div className="app-content">
            <Routes>
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="*" element={(
                <ReacceptGate
                  pending={pendingConsents}
                  onDone={() => setPendingConsents([])}
                  onSignOut={() => supabase.auth.signOut()}
                />
              )} />
            </Routes>
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
                <Route path="/subprocessadores" element={<Subprocessors />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <AppFooter />
            <InstallPrompt />
          </>
        )}
        {/* Medição de audiência anónima e sem cookies (Vercel Web Analytics). */}
        <Analytics />
      </div>
    </AuthContext.Provider>
  )
}
