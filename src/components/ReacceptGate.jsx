import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// VLT2-010: ecrã de reaceite. Renderizado a ecrã inteiro (sem navegação) quando
// a versão vigente dos Termos/Privacidade é maior do que a última que a pessoa
// aceitou. O uso da app fica bloqueado até aceitar; só se pode LER os documentos
// (abrem noutro separador). Aceitar grava versão+hash (do servidor) via RPC.

const DOCS = {
  terms_acceptance: { label: 'Termos de Uso', path: '/termos' },
  privacy_acknowledgement: { label: 'Política de Privacidade', path: '/privacidade' },
}

export default function ReacceptGate({ pending, onDone, onSignOut }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // só mostramos documentos conhecidos, na ordem Termos → Privacidade
  const docs = Object.keys(DOCS)
    .filter((type) => pending.some((p) => p.document_type === type))
    .map((type) => ({ type, ...DOCS[type] }))

  const listaNomes = docs.map((d) => d.label).join(' e a ')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      // versão e hash são determinados no servidor (nunca vêm do cliente).
      const { error: rpcError } = await supabase.rpc('accept_current_consents', {
        p_locale: 'pt-BR',
        p_market: 'BR',
      })
      if (rpcError) throw rpcError
      // reconfirma que já não há nada pendente antes de libertar
      const { data: aindaPendente, error: checkError } = await supabase.rpc('pending_consents')
      if (checkError) throw checkError
      if (aindaPendente && aindaPendente.length > 0) {
        setError('Não foi possível concluir. Tente novamente.')
        return
      }
      onDone()
    } catch {
      setError('Não foi possível registar o aceite agora. Verifique a ligação e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="internal-page auth-page">
      <div className="container reaccept-wrap">
        <section className="card-panel ornate-panel auth-panel" aria-label="Atualização dos termos">
          <h2 className="auth-panel__title">Atualizámos os termos</h2>
          <div className="ornamental-rule ornamental-rule--center" aria-hidden="true"><span>✦</span></div>
          <p className="muted">
            Revimos a {listaNomes}. Para continuar a usar a Veleda, leia e aceite a
            versão atualizada. Enquanto não aceitar, o acesso fica em pausa.
          </p>
          <form onSubmit={submit}>
            <fieldset className="consent-fieldset">
              <legend className="sr-only">Reaceite obrigatório</legend>
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  required
                />
                <span>
                  Li e aceito{' '}
                  {docs.map((d, i) => (
                    <span key={d.type}>
                      {i > 0 && (i === docs.length - 1 ? ' e a ' : ', ')}
                      {i === 0 ? 'os ' : ''}
                      <Link to={d.path} target="_blank" rel="noopener noreferrer">{d.label}</Link>
                    </span>
                  ))}
                  {' '}na versão atualizada.
                </span>
              </label>
            </fieldset>
            {error && <p className="error-msg" role="alert">{error}</p>}
            <button
              className="btn btn--wine auth-submit"
              type="submit"
              disabled={busy || !checked}
            >
              {busy ? 'A registar…' : 'Aceitar e continuar'}
            </button>
            <p className="auth-switch-row">
              <button className="text-button" type="button" onClick={onSignOut}>
                Sair
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}
