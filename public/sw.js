// Service worker mínimo da Veleda.
// A sua função aqui é só tornar a app instalável (o Chrome exige um SW com
// handler de fetch para permitir "Adicionar ao ecrã principal"). Não faz cache
// nem intercepta respostas — deixa o browser tratar de tudo normalmente.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
