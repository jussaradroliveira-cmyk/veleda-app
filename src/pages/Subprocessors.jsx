const SUBPROCESSADORES = [
  {
    nome: 'Supabase',
    finalidade: 'Banco de dados, autenticação (contas e login) e funções de servidor. Guarda seu perfil, leituras, histórico e diário.',
    dados: 'Email, identificador de conta, nome de tratamento, perguntas, leituras, histórico e diário.',
    local: 'União Europeia (região eu-west-1)',
  },
  {
    nome: 'Vercel',
    finalidade: 'Hospedagem do site (frontend) e entrega de conteúdo.',
    dados: 'Dados técnicos de acesso (endereço IP, navegador) inerentes à navegação.',
    local: 'Estados Unidos / rede global',
  },
  {
    nome: 'Anthropic (Claude)',
    finalidade: 'Geração das interpretações de tarô por inteligência artificial.',
    dados: 'A pergunta e as cartas sorteadas, incluindo posição, orientação e palavras-chave. Nome, email, histórico e diário não são enviados.',
    local: 'Processamento internacional; armazenamento da API comercial pode ocorrer nos Estados Unidos conforme a configuração contratada.',
  },
  {
    nome: 'Stripe',
    finalidade: 'Processamento de pagamentos da assinatura e da consulta avulsa.',
    dados: 'Email, identificador de cliente e transação, dados de pagamento. O número completo do cartão é tratado pela Stripe — o Veleda não o armazena.',
    local: 'Estados Unidos / União Europeia',
  },
]

export default function Subprocessors() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Subprocessadores</h2>
          <p className="muted">Última atualização: 28 de julho de 2026</p>

          <div className="legal-content">
            <p>
              O Veleda recorre aos fornecedores abaixo para operar o serviço. Cada um trata dados
              pessoais apenas na medida necessária à finalidade indicada e sob as salvaguardas
              contratuais aplicáveis. Não vendemos dados pessoais nem compartilhamos suas perguntas
              ou seu diário para publicidade.
            </p>

            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Finalidade</th>
                    <th>Dados tratados</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBPROCESSADORES.map((s) => (
                    <tr key={s.nome}>
                      <td><strong>{s.nome}</strong></td>
                      <td>{s.finalidade}</td>
                      <td>{s.dados}</td>
                      <td>{s.local}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              Esta lista pode ser atualizada quando adicionarmos, substituirmos ou removermos um
              fornecedor. Dúvidas sobre o tratamento de dados: <a href="mailto:contact@veledataro.com">contact@veledataro.com</a>.
            </p>
            <p>
              Alguns fornecedores operam globalmente. Transferências para fora do Espaço
              Econômico Europeu ou do Brasil dependem dos mecanismos legais e contratuais
              aplicáveis. O Veleda não utiliza atualmente fornecedores confirmados de
              analytics ou publicidade, nem envia o diário ao provedor de IA.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
