export default function Privacy() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Política de Privacidade</h2>
          <p className="muted">Versão privacy-2026-07-28 · vigente desde 28 de julho de 2026</p>

          <div className="legal-content">
            <h3>Identificação da responsável</h3>
            <p>
              O Veleda Tarô é um serviço operado por <strong>Jussara D R Oliveira</strong>,
              pessoa singular com atividade estabelecida em Portugal, NIF 302020250,
              em Ericeira, Portugal. O contato geral e de privacidade é{' '}
              <a href="mailto:contact@veledataro.com">contact@veledataro.com</a>.
            </p>

            <h3>Regras gerais</h3>
            <h4>Âmbito e dados tratados</h4>
            <p>
              Esta Política vale para o mesmo aplicativo e domínio quando a oferta é
              dirigida a Portugal/União Europeia ou ao Brasil. A seção territorial
              aplicável considera o mercado selecionado e a oferta apresentada; o
              simples acesso a partir de outro país não altera automaticamente o contrato.
            </p>
            <p>
              Tratamos e-mail, credenciais por meio do Supabase Auth, nome de tratamento
              opcional, identificadores técnicos, mercado selecionado, aceites contratuais,
              plano e estado de pagamento. Também armazenamos as perguntas, cartas,
              interpretações, histórico e entradas que você decide escrever no diário.
              Fornecedores de infraestrutura podem tratar IP, navegador, data, hora e
              registros técnicos necessários à segurança e operação.
            </p>
            <p>
              Perguntas e diário podem conter informações íntimas, inclusive dados de
              saúde, religião, sexualidade ou vida pessoal. Não precisamos desses detalhes:
              evite incluir dados sensíveis ou dados de terceiros que não sejam necessários.
            </p>

            <h4>Inteligência artificial</h4>
            <p>
              Para gerar uma leitura, enviamos à <strong>Anthropic (Claude)</strong> a
              pergunta e as três cartas, incluindo posição, orientação e palavras-chave.
              Não enviamos à IA seu e-mail, nome de tratamento, UUID, histórico ou diário.
              O diário permanece no Supabase e não integra a solicitação à Anthropic.
            </p>
            <p>
              A resposta é probabilística e pode conter erros. Ela serve para reflexão e
              entretenimento e não é usada pelo Veleda para decisões automatizadas que
              produzam efeitos jurídicos sobre você.
            </p>

            <h4>Finalidades e bases</h4>
            <p>
              Usamos os dados para criar e proteger a conta, prestar leituras, manter
              histórico e diário, processar pagamentos, aplicar limites de uso, responder
              solicitações, prevenir abuso, cumprir obrigações legais e defender direitos.
              As bases aplicáveis incluem execução do contrato, medidas pré-contratuais,
              obrigação legal e interesse legítimo em segurança. Se uma finalidade ou
              categoria exigir consentimento específico, ele será solicitado separadamente.
            </p>
            <p>
              No cadastro registramos, no servidor e de forma versionada, o aceite dos
              Termos, a ciência desta Política e a declaração “Declaro ter 18 anos ou mais.”.
              Essa declaração não verifica identidade ou idade e não envolve documento,
              data de nascimento, fotografia ou biometria.
            </p>

            <h4>Fornecedores confirmados</h4>
            <p>
              Usamos Supabase para banco, autenticação e funções de servidor; Vercel para
              hospedar e entregar o frontend; Anthropic para gerar as interpretações; e
              Stripe para checkout, assinatura, prevenção de fraude e pagamentos. O Veleda
              não armazena o número completo do cartão. A lista detalhada está na página de{' '}
              <a href="/subprocessadores">Subprocessadores</a>.
            </p>

            <h4>Transferências internacionais</h4>
            <p>
              O banco principal do projeto Supabase está na União Europeia, mas Vercel,
              Anthropic e Stripe podem processar dados internacionalmente, inclusive fora
              do Espaço Econômico Europeu e do Brasil. Aplicamos minimização e adotamos os
              mecanismos contratuais e legais exigidos para a transferência aplicável.
              Informações sobre as garantias podem ser solicitadas no canal de privacidade.
            </p>

            <h4>Retenção, segurança e eliminação</h4>
            <p>
              Mantemos dados enquanto a conta estiver ativa e pelo tempo necessário para
              prestar o serviço, cumprir obrigações legais, prevenir fraude e exercer
              direitos. Ao excluir a conta, os dados ativos do aplicativo são removidos
              depois que a Stripe confirma o encerramento de assinaturas capazes de gerar
              cobrança. Registros legalmente exigidos e cópias de segurança seguem os
              ciclos do fornecedor e ficam com uso restrito; a eliminação não é instantânea
              em todos os sistemas.
            </p>
            <p>
              Usamos conexão cifrada, autenticação, isolamento por usuário, permissões de
              banco, sanitização de conteúdo e controles de abuso. Nenhum sistema é
              absolutamente seguro. Use senha exclusiva e proteja o dispositivo.
            </p>

            <h4>Armazenamento local e cookies</h4>
            <p>
              O navegador usa armazenamento local essencial para sessão, recuperação de
              senha e preferências de instalação. Não há scripts de analytics, publicidade
              ou cookies de marketing no aplicativo atual. Cookies necessários do Stripe
              podem ser usados na página de pagamento hospedada por ele. A adoção futura de
              tecnologia não essencial exigirá atualização das políticas e, quando
              aplicável, consentimento prévio.
            </p>

            <h4>Seus controles e direitos</h4>
            <p>
              Na conta você pode exportar os principais dados e solicitar exclusão. Para
              acesso, correção, exportação, oposição, restrição, retirada de consentimento
              ou eliminação, escreva para{' '}
              <a href="mailto:contact@veledataro.com">contact@veledataro.com</a>. Podemos
              confirmar a identidade de forma proporcional e responderemos nos prazos legais.
            </p>

            <h3>Portugal e União Europeia</h3>
            <p>
              Quando a oferta Portugal/UE for selecionada, aplicam-se o RGPD/GDPR e as
              normas obrigatórias de consumo pertinentes. Você pode pedir acesso,
              retificação, apagamento, portabilidade, limitação e oposição, e apresentar
              reclamação à Comissão Nacional de Proteção de Dados ou à autoridade de
              controle competente do seu local de residência, trabalho ou alegada infração.
            </p>

            <h3>Brasil</h3>
            <p>
              Quando a oferta brasileira for selecionada, aplicam-se a LGPD e as normas
              brasileiras obrigatórias de defesa do consumidor e comércio eletrônico.
              Você pode pedir confirmação, acesso, correção, informação sobre
              compartilhamento, portabilidade quando regulamentada, anonimização,
              bloqueio ou eliminação nos casos legais e reclamar à ANPD ou aos órgãos de
              defesa do consumidor competentes.
            </p>

            <h3>Alterações e contato</h3>
            <p>
              Mudanças materiais serão comunicadas por meio adequado. Se uma nova finalidade
              exigir consentimento, ela não será iniciada antes da escolha. Contato:
              Jussara D R Oliveira · Ericeira, Portugal ·{' '}
              <a href="mailto:contact@veledataro.com">contact@veledataro.com</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
