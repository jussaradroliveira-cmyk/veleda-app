import { useEffect, useState } from 'react'

const HINT = 'veleda_install_hint'       // ligado no cadastro
const DISMISSED = 'veleda_install_dismissed'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
}
function isMobile() {
  return isIOS() || /android/i.test(window.navigator.userAgent)
}

// Convite para instalar a Veleda no ecrã do telemóvel. Aparece depois do
// cadastro (flag veleda_install_hint), só em telemóvel, se ainda não estiver
// instalada e não tiver sido dispensada. Android: instala a um toque; iPhone:
// mostra a instrução (a Apple não permite o toque único).
export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone() || !isMobile()) return
    if (localStorage.getItem(DISMISSED) === '1') return
    if (localStorage.getItem(HINT) !== '1') return
    setIos(isIOS())
    // pequeno atraso para não colidir com o carregamento da leitura
    const t = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(t)
  }, [])

  function fechar() {
    localStorage.setItem(DISMISSED, '1')
    localStorage.removeItem(HINT)
    setShow(false)
  }

  async function instalar() {
    const evt = window.__veledaInstall
    if (evt) {
      evt.prompt()
      await evt.userChoice.catch(() => {})
      window.__veledaInstall = null
    }
    fechar()
  }

  if (!show) return null

  return (
    <div className="install-prompt" role="dialog" aria-label="Adicionar a Veleda ao ecrã inicial">
      <button className="install-prompt__close" type="button" onClick={fechar} aria-label="Fechar">×</button>
      <img className="install-prompt__icon" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" aria-hidden="true" />
      <div className="install-prompt__body">
        <p className="install-prompt__title">Tenha a Veleda sempre à mão ✦</p>
        {ios ? (
          <p className="install-prompt__text">
            Toque em <strong>Partilhar</strong> <span aria-hidden="true">⬆️</span> e depois em{' '}
            <strong>“Adicionar ao ecrã principal”</strong>.
          </p>
        ) : window.__veledaInstall ? (
          <>
            <p className="install-prompt__text">Adicione ao seu celular e abra como um app, em tela cheia.</p>
            <button className="btn btn--wine small install-prompt__cta" type="button" onClick={instalar}>
              Instalar
            </button>
          </>
        ) : (
          <p className="install-prompt__text">
            No menu do navegador <span aria-hidden="true">⋮</span>, escolha{' '}
            <strong>“Adicionar ao ecrã principal”</strong>.
          </p>
        )}
      </div>
    </div>
  )
}
