import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './lib/i18n-context'
import './fonts.css'
import './styles.css'

// captura o evento de instalação (Android) antes de o React montar, para o
// convite pós-cadastro poder oferecer a instalação a um toque
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__veledaInstall = e
  })
  window.addEventListener('appinstalled', () => {
    window.__veledaInstall = null
    localStorage.removeItem('veleda_install_hint')
  })
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
)
