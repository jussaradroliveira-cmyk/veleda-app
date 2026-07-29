import { Link } from 'react-router-dom'

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <p><strong>Veleda Tarô</strong> — as cartas escutam você</p>
        <small>
          Operado por Jussara D R Oliveira, pessoa singular estabelecida em Portugal.
          Ofertas para Portugal/UE e Brasil conforme o mercado selecionado.
          Para reflexão e entretenimento; não substitui orientação profissional nem serviços de emergência.
        </small>
        <nav className="app-footer__links" aria-label="Documentos legais">
          <Link to="/termos">Termos de Uso</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidade">Privacidade</Link>
          <span aria-hidden="true">·</span>
          <Link to="/subprocessadores">Subprocessadores</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cookies">Cookies</Link>
        </nav>
      </div>
    </footer>
  )
}
