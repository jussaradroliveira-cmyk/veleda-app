const BLOCOS = [
  [
    "h3",
    "1. Identificação e âmbito"
  ],
  [
    "p",
    "O Veleda Tarô Simbólico (“Veleda”, “Aplicativo” ou “Serviço”) é operado por [RAZÃO SOCIAL/NOME EMPRESARIAL], inscrita no [CNPJ/NIF/NIPC] sob o nº [●], com sede em [ENDEREÇO COMPLETO], e contato geral em [E-MAIL DE SUPORTE]."
  ],
  [
    "p",
    "Estes documentos aplicam-se ao site, aplicativo web/PWA, versões móveis, comunicações e funcionalidades relacionadas ao Veleda. Quando o Serviço for oferecido a pessoas no Brasil, aplica-se a legislação brasileira pertinente; quando oferecido a pessoas no Espaço Econômico Europeu, aplicam-se também as normas europeias obrigatórias."
  ],
  [
    "h3",
    "2. Quem é o controlador"
  ],
  [
    "p",
    "O controlador é [RAZÃO SOCIAL], [CNPJ/NIF/NIPC], com endereço em [●]. Contato do encarregado/DPO ou canal de privacidade: [E-MAIL DE PRIVACIDADE]. Se houver representante na União Europeia ou no Brasil, seus dados serão indicados aqui: [REPRESENTANTE, SE APLICÁVEL]."
  ],
  [
    "h3",
    "3. Dados que podemos tratar"
  ],
  [
    "h4",
    "3.1 Dados fornecidos por você"
  ],
  [
    "p",
    "cadastro: nome ou forma de tratamento, e-mail, identificador de conta e senha protegida;"
  ],
  [
    "p",
    "perfil e preferências: idioma, país, moeda, plano e configurações;"
  ],
  [
    "p",
    "conteúdo: perguntas, cartas selecionadas, leituras, entradas do diário, histórico e feedback;"
  ],
  [
    "p",
    "suporte: mensagens, anexos e registros necessários para solucionar solicitações;"
  ],
  [
    "p",
    "compra: plano, valor, moeda, status, identificador da transação e dados fiscais necessários. O número completo do cartão é tratado pelo processador de pagamento."
  ],
  [
    "h4",
    "3.2 Dados coletados automaticamente"
  ],
  [
    "p",
    "endereço IP, data e hora, identificadores técnicos, navegador, sistema operacional e tipo de dispositivo;"
  ],
  [
    "p",
    "eventos de autenticação, páginas e funcionalidades utilizadas, falhas, desempenho e registros de segurança;"
  ],
  [
    "p",
    "cookies e armazenamento local estritamente necessários; analytics e marketing somente conforme consentimento ou outra base válida."
  ],
  [
    "h4",
    "3.3 Dados de terceiros"
  ],
  [
    "p",
    "Podemos receber confirmação de pagamento da Stripe/loja de aplicativos, informações de autenticação de provedores escolhidos pelo usuário e alertas de segurança/antifraude. Não compramos bancos de dados pessoais para criar perfis ocultos."
  ],
  [
    "p",
    "DADOS SENSÍVEIS. Perguntas e diário podem revelar saúde, religião, sexualidade, opiniões ou outros aspectos íntimos. Não solicitamos esses dados e recomendamos que você não os inclua. Se forem voluntariamente fornecidos, limitaremos o tratamento ao fornecimento solicitado, com salvaguardas e base jurídica adequada; poderemos remover ou bloquear conteúdo quando necessário para segurança e conformidade."
  ],
  [
    "h3",
    "4. Finalidades e bases legais"
  ],
  [
    "p",
    "Criar e administrar a conta; autenticar; fornecer leituras, histórico e diário. Base: Execução do contrato e medidas pré-contratuais."
  ],
  [
    "p",
    "Processar assinatura, faturamento, cancelamento, reembolso e prevenção de fraude. Base: Execução do contrato, obrigação legal e legítimo interesse em segurança."
  ],
  [
    "p",
    "Enviar perguntas e contexto ao provedor de IA para gerar a leitura solicitada. Base: Execução do contrato; consentimento explícito quando exigido para dados sensíveis."
  ],
  [
    "p",
    "Responder suporte e exercer direitos. Base: Execução do contrato e obrigação legal."
  ],
  [
    "p",
    "Manter segurança, detectar abuso, investigar incidentes e defender direitos. Base: Legítimo interesse, obrigação legal e exercício regular de direitos."
  ],
  [
    "p",
    "Melhorar estabilidade e experiência por métricas agregadas. Base: Legítimo interesse com minimização; consentimento quando cookies não essenciais forem utilizados."
  ],
  [
    "p",
    "Enviar marketing e novidades. Base: Consentimento ou legítimo interesse permitido, sempre com opção de oposição/descadastramento."
  ],
  [
    "p",
    "Cumprir obrigações fiscais, regulatórias e ordens válidas. Base: Obrigação legal/regulatória."
  ],
  [
    "p",
    "No Brasil, as bases serão interpretadas segundo os arts. 7º e 11 da LGPD; na União Europeia, segundo os arts. 6º e 9º do GDPR. Quando usarmos legítimo interesse, avaliaremos necessidade, proporcionalidade e impacto aos titulares. O consentimento poderá ser retirado sem afetar tratamento anterior lícito."
  ],
  [
    "h3",
    "5. Como funciona o processamento por IA"
  ],
  [
    "p",
    "A pergunta, as cartas, o nome de tratamento e contexto estritamente necessário podem ser enviados ao provedor [ANTHROPIC/CONFIRMAR] para gerar a resposta. Configuraremos o serviço, sempre que disponível e contratualmente aplicável, para impedir treinamento geral com os dados do Veleda e limitar retenção do fornecedor."
  ],
  [
    "p",
    "Não utilizamos a leitura para tomar decisões exclusivamente automatizadas que produzam efeitos jurídicos ou impacto semelhante sobre você. A seleção e interpretação não definem crédito, emprego, seguro, saúde, elegibilidade ou direitos."
  ],
  [
    "h3",
    "6. Compartilhamento e operadores"
  ],
  [
    "p",
    "Compartilhamos somente o necessário com:"
  ],
  [
    "p",
    "Supabase ou equivalente: banco de dados, autenticação e funções de backend;"
  ],
  [
    "p",
    "Anthropic ou provedor equivalente: geração das leituras por IA;"
  ],
  [
    "p",
    "Stripe e/ou lojas de aplicativos: pagamento, assinatura, fraude e cobrança;"
  ],
  [
    "p",
    "hospedagem, CDN, monitoramento, e-mail transacional, atendimento e analytics aprovados;"
  ],
  [
    "p",
    "consultores, auditores e autoridades, quando necessário e permitido;"
  ],
  [
    "p",
    "adquirente ou sucessor em reorganização empresarial, com continuidade das proteções."
  ],
  [
    "p",
    "A lista nominal atualizada de fornecedores e seus países deverá ser publicada em [URL DE SUBOPERADORES]. Não vendemos dados pessoais. Não compartilhamos perguntas ou diário para publicidade comportamental de terceiros."
  ],
  [
    "h3",
    "7. Transferências internacionais"
  ],
  [
    "p",
    "Os fornecedores podem operar no Brasil, Estados Unidos, União Europeia e outros países. Adotaremos mecanismos válidos, como decisões de adequação, cláusulas-padrão contratuais, cláusulas-padrão da ANPD, regras corporativas ou outra hipótese legal, além de avaliação de segurança e minimização."
  ],
  [
    "p",
    "Para transferências sujeitas à LGPD, observaremos a Resolução CD/ANPD nº 19/2024 e normas posteriores. Para o GDPR, utilizaremos os mecanismos dos arts. 44 a 49, quando aplicáveis. Informações sobre a garantia utilizada poderão ser solicitadas ao canal de privacidade."
  ],
  [
    "h3",
    "8. Retenção e exclusão"
  ],
  [
    "p",
    "Guardamos dados somente pelo tempo necessário às finalidades, respeitando obrigações legais e defesa de direitos. A matriz definitiva deverá ser validada tecnicamente e juridicamente antes do lançamento:"
  ],
  [
    "p",
    "conta e perfil: durante a conta e até 30 dias após exclusão operacional, salvo obrigação ou disputa;"
  ],
  [
    "p",
    "perguntas, leituras, histórico e diário: até exclusão pelo usuário ou encerramento da conta, com ciclo técnico de remoção de backups de até 90 dias;"
  ],
  [
    "p",
    "registros de segurança: normalmente 6 a 12 meses, podendo ser ampliados em investigação;"
  ],
  [
    "p",
    "registros de suporte: até 24 meses após encerramento do caso;"
  ],
  [
    "p",
    "dados fiscais e de pagamento: pelo prazo legal aplicável;"
  ],
  [
    "p",
    "consentimentos e solicitações de direitos: pelo prazo necessário à comprovação de conformidade e defesa de direitos."
  ],
  [
    "p",
    "Dados podem ser anonimizados de modo razoavelmente irreversível e utilizados para estatísticas e melhoria. Uma solicitação de exclusão não alcança dados que devam ser mantidos por obrigação legal, prevenção de fraude ou exercício de direitos, mas seu uso ficará restrito."
  ],
  [
    "h3",
    "9. Segurança"
  ],
  [
    "p",
    "Adotamos medidas técnicas e organizacionais proporcionais, incluindo controle de acesso, autenticação, criptografia em trânsito, segregação por usuário, registros de auditoria, atualizações, backups, gestão de fornecedores e resposta a incidentes. Nenhum sistema é absolutamente seguro; use senha exclusiva e proteja seus dispositivos."
  ],
  [
    "h3",
    "10. Incidentes"
  ],
  [
    "p",
    "Em incidente que possa gerar risco ou dano relevante, investigaremos, mitigaremos e comunicaremos titulares e autoridades quando exigido. No Brasil, seguiremos as regras da ANPD; na União Europeia, os arts. 33 e 34 do GDPR, inclusive o prazo de 72 horas à autoridade quando aplicável."
  ],
  [
    "h3",
    "11. Cookies e tecnologias semelhantes"
  ],
  [
    "p",
    "Utilizamos cookies ou armazenamento local estritamente necessários para login, segurança, preferências e funcionamento. Na primeira visita, o Veleda exibirá um painel de cookies com opções igualmente acessíveis para “Aceitar todos”, “Rejeitar não essenciais” e “Configurar”. Cookies de analytics, personalização ou marketing permanecerão bloqueados até uma escolha válida. O usuário poderá rever ou retirar o consentimento a qualquer momento em “Privacidade” → “Preferências de cookies”, sem prejuízo das funções essenciais."
  ],
  [
    "p",
    "A Política de Cookies deverá listar nome, fornecedor, finalidade e duração de cada tecnologia após auditoria do aplicativo. Não devem ser inseridos rastreadores não documentados."
  ],
  [
    "h3",
    "12. Direitos dos titulares"
  ],
  [
    "p",
    "Dependendo da jurisdição, você pode solicitar:"
  ],
  [
    "p",
    "confirmação e acesso;"
  ],
  [
    "p",
    "correção;"
  ],
  [
    "p",
    "anonimização, bloqueio ou eliminação;"
  ],
  [
    "p",
    "portabilidade, quando aplicável;"
  ],
  [
    "p",
    "informação sobre compartilhamentos;"
  ],
  [
    "p",
    "retirada de consentimento;"
  ],
  [
    "p",
    "oposição e restrição do tratamento;"
  ],
  [
    "p",
    "revisão de decisão exclusivamente automatizada;"
  ],
  [
    "p",
    "explicação sobre critérios e consequências relevantes;"
  ],
  [
    "p",
    "reclamação à ANPD, à CNPD portuguesa ou à autoridade competente;"
  ],
  [
    "p",
    "não discriminação pelo exercício de direitos."
  ],
  [
    "p",
    "Solicitações devem ser enviadas a [E-MAIL DE PRIVACIDADE]. Poderemos confirmar identidade de forma proporcional. Responderemos nos prazos legais; pedidos complexos poderão exigir extensão permitida, com justificativa. Se negarmos total ou parcialmente, explicaremos a razão e os meios de recurso."
  ],
  [
    "h3",
    "13. Crianças e adolescentes"
  ],
  [
    "p",
    "O Serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes. Pais ou responsáveis que identifiquem uso por menor devem contatar [E-MAIL DE PRIVACIDADE] para investigação e exclusão."
  ],
  [
    "h3",
    "14. Privacidade por padrão"
  ],
  [
    "p",
    "Diário e histórico serão privados por padrão e não indexados publicamente."
  ],
  [
    "p",
    "A equipe não acessará conteúdo íntimo salvo necessidade autorizada e registrada de suporte, segurança ou obrigação legal."
  ],
  [
    "p",
    "Ambientes de desenvolvimento e demonstração não deverão usar conteúdo real identificável."
  ],
  [
    "p",
    "Novos fornecedores, analytics ou usos de IA exigirão avaliação de privacidade e atualização deste aviso."
  ],
  [
    "h3",
    "15. Alterações desta Política"
  ],
  [
    "p",
    "Atualizações materiais serão comunicadas por meio adequado. Se uma nova finalidade exigir consentimento, ele será solicitado antes do tratamento. Manteremos data e versão e, quando viável, histórico das versões anteriores."
  ],
  [
    "h3",
    "16. Contato e autoridades"
  ],
  [
    "p",
    "Controlador: [RAZÃO SOCIAL] · [CNPJ/NIF/NIPC] · [ENDEREÇO] · Privacidade/DPO: [E-MAIL]. Brasil: Autoridade Nacional de Proteção de Dados — ANPD. Portugal: Comissão Nacional de Proteção de Dados — CNPD. O titular também pode procurar a autoridade do país europeu onde reside, trabalha ou considera ter ocorrido violação."
  ],
  [
    "p",
    "Anexo A — fornecedores a confirmar antes da publicação"
  ],
  [
    "p",
    "Supabase: confirmar região do projeto, suboperadores e retenção de logs."
  ],
  [
    "p",
    "Anthropic: confirmar produto/API, política de retenção e cláusula de não treinamento."
  ],
  [
    "p",
    "Stripe: confirmar entidade contratante, países e dados fiscais processados."
  ],
  [
    "p",
    "Hospedagem/Vercel ou equivalente: confirmar região, logs e CDN."
  ],
  [
    "p",
    "E-mail, analytics, monitoramento de erros e suporte: listar ou remover se não utilizados."
  ],
  [
    "p",
    "Anexo B — referências regulatórias para revisão jurídica"
  ],
  [
    "p",
    "Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD)."
  ],
  [
    "p",
    "Resolução CD/ANPD nº 19/2024 — Transferência Internacional de Dados."
  ],
  [
    "p",
    "Regulamento (UE) 2016/679 — General Data Protection Regulation (GDPR)."
  ],
  [
    "p",
    "Código de Defesa do Consumidor brasileiro e Decreto nº 7.962/2013."
  ],
  [
    "p",
    "Diretiva 2011/83/UE sobre direitos dos consumidores e normas nacionais de transposição."
  ]
]

export default function Privacy() {
  return (
    <main className="internal-page legal-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card-panel ornate-panel legal-panel">
          <p className="internal-kicker">Transparência</p>
          <h2>Política de Privacidade</h2>
          <p className="muted">Como o Veleda coleta, utiliza, compartilha e protege dados pessoais</p>
          <p className="legal-draft-notice" role="note">
            Documento provisório em preparação. Versão preliminar, sujeita a revisão jurídica antes do lançamento comercial.
          </p>
          <div className="legal-content">
            {BLOCOS.map(([tag, texto], i) => {
              if (tag === 'h3') return <h3 key={i}>{texto}</h3>
              if (tag === 'h4') return <h4 key={i}>{texto}</h4>
              return <p key={i}>{texto}</p>
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
