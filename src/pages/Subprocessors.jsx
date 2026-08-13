import LegalDoc from '../components/LegalDoc'
import subprocessadoresText from './legal/subprocessadores.md?raw'

export default function Subprocessors() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Subprocessadores</h2>
          <p className="muted">Versão 2.3 · vigente a partir de 13 de agosto de 2026</p>
          <LegalDoc text={subprocessadoresText} />
        </div>
      </div>
    </main>
  )
}
