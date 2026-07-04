import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { CardFront } from '../components/TarotCard'

const heroCards = [
  { name: 'A Estrela', arcana: 'maior', number: 17, image_path: '/cards/a-estrela.jpg' },
  { name: 'O Sol', arcana: 'maior', number: 19, image_path: '/cards/o-sol.jpg' },
  { name: 'A Lua', arcana: 'maior', number: 18, image_path: '/cards/a-lua.jpg' },
]

export default function Landing() {
  const { session } = useAuth()
  return (
    <main>
      <div className="container">
        <section className="hero">
          <h1>VELEDA</h1>
          <p className="sub">as cartas escutam-te</p>
          <div className="hero-cards">
            {heroCards.map((c) => <CardFront key={c.name} card={c} />)}
          </div>
          <Link to={session ? '/leitura' : '/auth'} className="btn">
            Fazer a minha leitura
          </Link>
          <p className="muted" style={{ marginTop: '0.8rem' }}>1 leitura gratuita por semana ✦ sem cartão</p>
        </section>

        <section className="features">
          <div className="feature">
            <h3>✦ Pergunta</h3>
            <p>Traz a questão que te habita — amor, trabalho, um cruzamento de caminhos.</p>
          </div>
          <div className="feature">
            <h3>✦ Tira as cartas</h3>
            <p>Escolhe 3 cartas do leque: passado, presente e futuro.</p>
          </div>
          <div className="feature">
            <h3>✦ Recebe a leitura</h3>
            <p>A Veleda interpreta a tua tiragem com inteligência artificial e alma.</p>
          </div>
          <div className="feature">
            <h3>✦ Guarda e reflete</h3>
            <p>Cada leitura fica no teu histórico, com espaço de diário para as tuas notas.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
