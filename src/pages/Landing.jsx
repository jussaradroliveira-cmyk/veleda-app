import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { useI18n } from '../lib/i18n-context'
import { CardFront } from '../components/TarotCard'

const heroCards = [
  { name: 'A Lua', arcana: 'maior', number: 18, image_path: '/cards/maiores/a-lua.webp' },
  { name: 'O Sol', arcana: 'maior', number: 19, image_path: '/cards/maiores/o-sol.webp' },
  { name: 'O Mundo', arcana: 'maior', number: 21, image_path: '/cards/maiores/o-mundo.webp' },
]

export default function Landing() {
  const { session } = useAuth()
  const { t } = useI18n()
  const readingPath = session ? '/leitura' : '/auth'

  return (
    <main className="landing">
      {!session && (
        <section className="welcome-hero" aria-label={t('landing.welcomeAria')}>
          <div className="welcome-hero__inner">
            <p className="welcome-hero__kicker">{t('landing.heroKicker')}</p>
            <h1>{t('landing.welcomeTitle1')}<br />Tarô Veleda</h1>
            <p className="welcome-hero__lead">{t('landing.welcomeLead')}</p>
            <div className="welcome-hero__actions">
              <Link to="/auth" className="btn btn--wine">{t('landing.login')}</Link>
              <Link to="/auth" state={{ signup: true }} className="btn ghost">{t('landing.signup')}</Link>
            </div>
            <a className="welcome-hero__scroll" href="#ritual-title">{t('landing.scroll')}</a>
          </div>
        </section>
      )}
      <section className="landing-hero">
        <div className="container landing-hero__grid">
          <div className="landing-hero__copy">
            <p className="eyebrow">{t('landing.eyebrow')}</p>
            <h1>{t('landing.heroTitle1')}<br /><em>{t('landing.heroTitle2')}</em></h1>
            <div className="ornamental-rule" aria-hidden="true"><span>✦</span></div>
            <p className="landing-hero__lead">
              {t('landing.heroLead')}
            </p>
            <div className="landing-hero__actions">
              <Link to={readingPath} state={!session ? { from: '/leitura' } : undefined} className="btn btn--wine">
                {t('landing.makeReading')}
              </Link>
              <p><span aria-hidden="true">☾</span><strong> {t('landing.guideStrong')}</strong><small>{t('landing.guideSmall')}</small></p>
            </div>
          </div>

          <div className="landing-hero__visual" aria-label={t('landing.heroCardsLabel')}>
            <div className="hero-cards">
              {heroCards.map((card) => <CardFront key={card.name} card={card} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="ritual-section" aria-labelledby="ritual-title">
        <div className="container">
          <header className="section-heading">
            <p className="eyebrow">{t('landing.ritualEyebrow')}</p>
            <h2 id="ritual-title">{t('landing.ritualTitle')}</h2>
            <p>{t('landing.ritualLead')}</p>
          </header>
          <div className="ritual-grid">
            <article className="ritual-card">
              <span className="ritual-card__number">01</span>
              <span className="ritual-card__symbol" aria-hidden="true">☾</span>
              <h3>{t('landing.step1Title')}</h3>
              <p>{t('landing.step1Text')}</p>
            </article>
            <article className="ritual-card">
              <span className="ritual-card__number">02</span>
              <span className="ritual-card__symbol" aria-hidden="true">✦</span>
              <h3>{t('landing.step2Title')}</h3>
              <p>{t('landing.step2Text')}</p>
            </article>
            <article className="ritual-card">
              <span className="ritual-card__number">03</span>
              <span className="ritual-card__symbol" aria-hidden="true">❀</span>
              <h3>{t('landing.step3Title')}</h3>
              <p>{t('landing.step3Text')}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="benefits-section" aria-labelledby="benefits-title">
        <div className="container benefits-section__grid">
          <div className="benefits-section__statement">
            <p className="eyebrow eyebrow--gold">{t('landing.benefitsEyebrow')}</p>
            <h2 id="benefits-title">{t('landing.benefitsTitle1')}<br />{t('landing.benefitsTitle2')}</h2>
            <div className="benefits-sun" aria-hidden="true">☼</div>
          </div>
          <div className="benefits-list">
            <article>
              <span aria-hidden="true">☼</span>
              <div><h3>{t('landing.benefit1Title')}</h3><p>{t('landing.benefit1Text')}</p></div>
            </article>
            <article>
              <span aria-hidden="true">☾</span>
              <div><h3>{t('landing.benefit2Title')}</h3><p>{t('landing.benefit2Text')}</p></div>
            </article>
            <article>
              <span aria-hidden="true">❀</span>
              <div>
                <h3>{t('landing.benefit3Title')}</h3>
                <p>{t('landing.benefit3Text')}</p>
                <p className="benefits-price">{t('landing.benefit3Price')}</p>
              </div>
            </article>
            <Link to={readingPath} state={!session ? { from: '/leitura' } : undefined} className="btn btn--gold">
              {t('landing.startNow')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
