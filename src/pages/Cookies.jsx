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

            <p>
              O site também não carrega scripts, fontes ou recursos de outros
              servidores: tudo é servido pela própria Veleda. Por isso,{' '}
              <strong>não há cookies não essenciais para aceitar ou recusar</strong> —
              e não mostramos aviso de consentimento, porque não haveria escolha real a fazer.
            </p>

            <h3>O que guardamos no seu navegador</h3>
            <p>
              Para o app funcionar, guardamos apenas isto no armazenamento local
              do seu navegador (<em>localStorage</em> — não é um cookie). O nome
              que você escolhe para as leituras fica guardado na sua conta, não
              no navegador.
            </p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr><th>Nome</th><th>Fornecedor</th><th>Finalidade</th><th>Categoria</th><th>Duração</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>sb-…-auth-token</code></td>
                    <td>Supabase (Veleda)</td>
                    <td>Manter sua sessão de login segura</td>
                    <td>Essencial</td>
                    <td>Até você sair da conta</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
