import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n-context'

export default function Account() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState('')

  // exclusão em três passos: botão → consequências + senha + checkbox → confirmação
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Exportação server-side falha-fechada: só gera o ficheiro se o servidor
  // devolver o inventário íntegro (nada de download parcial). É o download
  // self-service; a resposta integral de acesso é por pedido (VLT2-014).
  async function exportData() {
    setExporting(true)
    setExportNotice('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      })
      if (!resp.ok) {
        setExportNotice(t('account.exportError'))
        return
      }
      const dump = await resp.json()
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `veleda-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setExportNotice(t('account.exportOk'))
    } catch {
      setExportNotice(t('account.exportError'))
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
        const messages = {
          invalid_password: t('account.errInvalidPassword'),
          billing_cancellation_failed: t('account.errBillingFailed'),
          billing_cancellation_unavailable: t('account.errBillingUnavailable'),
        }
        setDeleteError(messages[body.error] ?? t('account.errDeleteGeneric'))
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
      setDeleteError(t('account.errDeleteGeneric'))
    }
  }

  return (
    <main className="internal-page account-page">
      <div className="container" style={{ maxWidth: 640 }}>
        <header className="account-header">
          <p className="internal-kicker">{t('nav.account')}</p>
          <h2>✦ {user.email}</h2>
        </header>

        <section className="card-panel ornate-panel account-section" aria-labelledby="conta-assinatura">
          <h3 id="conta-assinatura">{t('account.subTitle')}</h3>
          <p className="muted">
            {t('account.subLead')}
          </p>
          <Link to="/assinatura" className="btn small">{t('account.viewSub')}</Link>
        </section>

        <section className="card-panel ornate-panel account-section" aria-labelledby="conta-privacidade">
          <h3 id="conta-privacidade">{t('footer.privacy')}</h3>

          <div className="account-block">
            <h4>{t('account.exportTitle')}</h4>
            <p className="muted">
              {t('account.exportLeadBefore')} <a href="mailto:contact@veledataro.com">contact@veledataro.com</a>.
            </p>
            <button className="btn small" onClick={exportData} disabled={exporting}>
              {exporting ? t('account.exporting') : t('account.exportTitle')}
            </button>
            {exportNotice && <p className="muted" role="status">{exportNotice}</p>}
          </div>

          <div className="account-block account-block--danger">
            <h4>{t('account.deleteTitle')}</h4>
            {!deleteOpen ? (
              <>
                <p className="muted">
                  {t('account.deleteLead')}
                </p>
                <button className="btn small btn--danger" onClick={() => setDeleteOpen(true)}>
                  {t('account.deleteTitle')}
                </button>
              </>
            ) : (
              <form onSubmit={confirmDelete} className="delete-confirm">
                <p><strong>{t('account.deleteConseqTitle')}</strong></p>
                <ul>
                  <li>{t('account.deleteC1')}</li>
                  <li>{t('account.deleteC2')}</li>
                  <li>{t('account.deleteC3')}</li>
                  <li>{t('account.deleteC4')}</li>
                  <li>{t('account.deleteC5')}</li>
                </ul>
                <p className="muted">
                  {t('account.deleteTip')}
                </p>
                <div className="field">
                  <label htmlFor="delete-password">{t('account.confirmPassword')}</label>
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
                  <span>{t('account.deleteUnderstand')}</span>
                </label>
                {deleteError && <p className="error-msg" role="alert">{deleteError}</p>}
                <div className="delete-actions">
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => { setDeleteOpen(false); setPassword(''); setUnderstood(false); setDeleteError('') }}
                    disabled={deleting}
                  >
                    {t('account.back')}
                  </button>
                  <button className="btn small btn--danger" type="submit" disabled={deleting || !understood || !password}>
                    {deleting ? t('account.deleting') : t('account.confirmDelete')}
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
