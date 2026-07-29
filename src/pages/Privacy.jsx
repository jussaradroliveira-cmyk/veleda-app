import LegalDoc from '../components/LegalDoc'
import privacyText from './legal/privacidade.md?raw'

export default function Privacy() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Política de Privacidade</h2>
          <p className="muted">Versão 2.1 · vigente a partir de 29 de julho de 2026</p>
          <LegalDoc text={privacyText} />
        </div>
      </div>
    </main>
  )
}
