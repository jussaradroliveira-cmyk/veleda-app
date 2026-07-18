import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

export default function Account() {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState('')

  // exclusão em três passos: botão → consequências + senha + checkbox → confirmação
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function exportData() {
    setExporting(true)
    setExportNotice('')
    try {
      const [profile, readings, journal] = await Promise.all([
        supabase.from('profiles').select('display_name, is_premium, created_at').eq('id', user.id).maybeSingle(),
        supabase.from('readings').select('question, cards, reading_text, created_at').eq('user_id', user.id).order('created_at'),
        supabase.from('journal_entries').select('content, reading_id, created_at, updated_at').eq('user_id', user.id).order('created_at'),
      ])
      const dump = {
        exportado_em: new Date().toISOString(),
        email: user.email,
        perfil: profile.data ?? null,
        leituras: readings.data ?? [],
        diario: journal.data ?? [],
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `veleda-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setExportNotice('✦ Arquivo gerado — confira sua pasta de downloads.')
    } catch {
      setExportNotice('Não consegui gerar o arquivo. Tente de novo.')
    } finally {
      setExporting(false)
    }
  }

  async function confirmDelete(e) {
    e.preventDefault()
    setDeleting(true)
    setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ password }),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setDeleting(false)
        setDeleteError(body.error === 'invalid_password'
          ? 'Senha incorreta — confirme sua senha atual para excluir a conta.'
          : 'Não consegui concluir a exclusão. Tente de novo em instantes.')
        return
      }
      // a sessão no servidor morreu com a conta; o signOut do supabase-js
      // pode ficar preso no lock de refresh — limpa o token diretamente e
      // recarrega a app do zero
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach((k) => localStorage.removeItem(k))
      window.location.assign(import.meta.env.BASE_URL)
    } catch {
      setDeleting(false)
      setDeleteError('Não consegui concluir a exclusão. Tente de novo em instantes.')
    }
  }

  return (
    <main className="internal-page account-page">
      <div className="container" style={{ maxWidth: 640 }}>
        <header className="account-header">
          <p className="internal-kicker">Minha conta</p>
          <h2>✦ {user.email}</h2>
        </header>

        <section className="card-panel ornate-panel account-section" aria-labelledby="conta-assinatura">
          <h3 id="conta-assinatura">Assinatura</h3>
          <p className="muted">Veja seu plano, assine o Premium ou gerencie a renovação.</p>
          <Link to="/assinatura" className="btn small">Ver minha assinatura</Link>
        </section>

        <section className="card-panel ornate-panel account-section" aria-labelledby="conta-privacidade">
          <h3 id="conta-privacidade">Privacidade</h3>

          <div className="account-block">
            <h4>Exportar meus dados</h4>
            <p className="muted">
              Baixe um arquivo com seu perfil, suas leituras e seu diário — eles são seus.
            </p>
            <button className="btn small" onClick={exportData} disabled={exporting}>
              {exporting ? 'Gerando…' : 'Exportar meus dados'}
            </button>
            {exportNotice && <p className="muted" role="status">{exportNotice}</p>}
          </div>

          <div className="account-block account-block--danger">
            <h4>Excluir minha conta</h4>
            {!deleteOpen ? (
              <>
                <p className="muted">
                  Apaga definitivamente sua conta e todos os seus dados.
                </p>
                <button className="btn small btn--danger" onClick={() => setDeleteOpen(true)}>
                  Excluir minha conta
                </button>
              </>
            ) : (
              <form onSubmit={confirmDelete} className="delete-confirm">
                <p><strong>Antes de confirmar, saiba o que acontece:</strong></p>
                <ul>
                  <li>Suas <strong>leituras</strong>, seu <strong>diário</strong> e seu <strong>perfil</strong> serão apagados definitivamente — não há como recuperar.</li>
                  <li>Seu <strong>login</strong> será removido e você será desconectada.</li>
                  <li>Se tiver assinatura ativa, a <strong>renovação será cancelada</strong> — não haverá nova cobrança.</li>
                  <li>Cópias em backups de segurança expiram automaticamente em até 30 dias.</li>
                </ul>
                <p className="muted">
                  Dica: se quiser guardar suas leituras e seu diário, use <em>Exportar meus dados</em> antes.
                </p>
                <div className="field">
                  <label htmlFor="delete-password">Confirme sua senha</label>
                  <input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <label className="delete-check">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                  />
                  <span>Entendo que a exclusão é definitiva e irreversível.</span>
                </label>
                {deleteError && <p className="error-msg" role="alert">{deleteError}</p>}
                <div className="delete-actions">
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => { setDeleteOpen(false); setPassword(''); setUnderstood(false); setDeleteError('') }}
                    disabled={deleting}
                  >
                    Voltar
                  </button>
                  <button className="btn small btn--danger" type="submit" disabled={deleting || !understood || !password}>
                    {deleting ? 'Excluindo…' : 'Confirmar exclusão definitiva'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
