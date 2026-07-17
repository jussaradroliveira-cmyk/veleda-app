import { Link } from 'react-router-dom'

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <p><strong>Veleda Tarô</strong> — as cartas escutam você</p>
        <small>Para reflexão e inspiração. Não substitui orientação profissional.</small>
        <nav className="app-footer__links" aria-label="Documentos legais">
          <Link to="/cookies">Política de Cookies</Link>
        </nav>
      </div>
    </footer>
  )
}
