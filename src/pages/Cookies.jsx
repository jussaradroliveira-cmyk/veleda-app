export default function Cookies() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Política de Cookies</h2>
          <p className="muted">Última atualização: 17 de julho de 2026</p>

          <div className="legal-content">
            <h3>O essencial, sem rodeios</h3>
            <p>
              A Veleda <strong>não usa cookies de publicidade nem de rastreamento</strong>.
              Não vendemos seus dados, não seguimos você pela internet e não usamos
              ferramentas de análise de terceiros.
            </p>

            <h3>O que guardamos no seu navegador</h3>
            <p>
              Para o app funcionar, guardamos algumas informações essenciais no
              armazenamento local do seu navegador (<em>localStorage</em>):
            </p>
            <ul>
              <li><strong>Sessão de login</strong> — o token que mantém você conectada com segurança (Supabase Auth).</li>
              <li><strong>Seu nome</strong> — o nome que você escolhe para a Veleda usar nas leituras.</li>
            </ul>
            <p>
              Essas informações ficam no seu aparelho, servem apenas para a sua
              experiência no app e desaparecem se você sair da conta ou limpar os
              dados do navegador.
            </p>

            <h3>Pagamentos</h3>
            <p>
              A assinatura Premium é processada pelo <strong>Stripe</strong>, em página
              própria e segura do Stripe, que usa os cookies necessários ao
              processamento do pagamento. Consulte a{' '}
              <a href="https://stripe.com/br/privacy" target="_blank" rel="noreferrer">política de privacidade do Stripe</a>.
            </p>

            <h3>Como controlar</h3>
            <p>
              Você pode limpar o armazenamento local nas configurações do seu navegador
              a qualquer momento — isso encerra sua sessão, mas não apaga seu histórico
              nem seu diário, que ficam guardados com segurança na sua conta.
            </p>

            <h3>Dúvidas</h3>
            <p>
              Escreva para nós: <a href="mailto:jussaradroliveira@gmail.com">jussaradroliveira@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
