import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { CardFront } from '../components/TarotCard'

const heroCards = [
  { name: 'A Lua', arcana: 'maior', number: 18, image_path: '/cards/maiores/a-lua.webp' },
  { name: 'O Sol', arcana: 'maior', number: 19, image_path: '/cards/maiores/o-sol.webp' },
  { name: 'O Mundo', arcana: 'maior', number: 21, image_path: '/cards/maiores/o-mundo.webp' },
]

export default function Landing() {
  const { session } = useAuth()
  const readingPath = session ? '/leitura' : '/auth'

  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="container landing-hero__grid">
          <div className="landing-hero__copy">
            <p className="eyebrow">Tarô simbólico</p>
            <h1>Um instante<br />de clareza,<br /><em>inteiramente seu.</em></h1>
            <div className="ornamental-rule" aria-hidden="true"><span>✦</span></div>
            <p className="landing-hero__lead">
              Tarô simbólico com inteligência artificial para iluminar escolhas e revelar caminhos.
            </p>
            <div className="landing-hero__actions">
              <Link to={readingPath} state={!session ? { from: '/leitura' } : undefined} className="btn btn--wine">
                Fazer uma leitura
              </Link>
              <p><span aria-hidden="true">☾</span><strong> Seu guia pessoal</strong><small>Sempre que você precisar</small></p>
            </div>
          </div>

          <div className="landing-hero__visual" aria-label="As cartas A Lua, O Sol e O Mundo">
            <div className="hero-cards">
              {heroCards.map((card) => <CardFront key={card.name} card={card} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="ritual-section" aria-labelledby="ritual-title">
        <div className="container">
          <header className="section-heading">
            <p className="eyebrow">Seu ritual</p>
            <h2 id="ritual-title">Escute o que já vive dentro de você</h2>
            <p>Três gestos simples. Um espaço seguro para olhar com mais delicadeza para o seu momento.</p>
          </header>
          <div className="ritual-grid">
            <article className="ritual-card">
              <span className="ritual-card__number">01</span>
              <span className="ritual-card__symbol" aria-hidden="true">☾</span>
              <h3>Faça sua pergunta</h3>
              <p>Traga o tema que pede presença e formule-o com calma.</p>
            </article>
            <article className="ritual-card">
              <span className="ritual-card__number">02</span>
              <span className="ritual-card__symbol" aria-hidden="true">✦</span>
              <h3>Escolha as cartas</h3>
              <p>Deixe a intuição conduzir sua tiragem de passado, presente e futuro.</p>
            </article>
            <article className="ritual-card">
              <span className="ritual-card__number">03</span>
              <span className="ritual-card__symbol" aria-hidden="true">❀</span>
              <h3>Receba e guarde</h3>
              <p>Leia a interpretação, volte ao histórico e escreva em seu diário privado.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="benefits-section" aria-labelledby="benefits-title">
        <div className="container benefits-section__grid">
          <div className="benefits-section__statement">
            <p className="eyebrow eyebrow--gold">Um espaço que cresce com você</p>
            <h2 id="benefits-title">As cartas abrem uma conversa.<br />O diário guarda o caminho.</h2>
            <div className="benefits-sun" aria-hidden="true">☼</div>
          </div>
          <div className="benefits-list">
            <article>
              <span aria-hidden="true">☼</span>
              <div><h3>Leitura com IA</h3><p>Simbólica, acolhedora e não fatalista.</p></div>
            </article>
            <article>
              <span aria-hidden="true">☾</span>
              <div><h3>Memória pessoal</h3><p>Histórico e reflexões reunidos em um só lugar.</p></div>
            </article>
            <article>
              <span aria-hidden="true">❀</span>
              <div>
                <h3>Veleda Premium</h3>
                <p>Leituras ilimitadas e acesso contínuo ao seu ritual.</p>
                <p className="benefits-price">R$ 39,90/mês · plano anual com 20% de desconto</p>
              </div>
            </article>
            <Link to={readingPath} state={!session ? { from: '/leitura' } : undefined} className="btn btn--gold">
              Começar agora
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
