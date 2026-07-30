// VLT2-015: segurança da fronteira pergunta↔IA. Módulo único partilhado pelo
// edge (generate-reading) e pelo frontend (NewReading), para não divergirem.

// 1) Escape do delimitador — a pergunta é inserida entre <PERGUNTA_NAO_CONFIAVEL>
// e </PERGUNTA_NAO_CONFIAVEL>. Se a pessoa escrever essa tag (ou a de <CARTAS>),
// conseguiria "fechar a caixa" e passar o resto como instrução. Neutralizamos
// qualquer variação (com/sem barra, com espaços, maiúsc/minúsc) por um marcador
// inócuo, antes de interpolar no prompt.
const CONTROL_TAG = /<\/?\s*(?:PERGUNTA_NAO_CONFIAVEL|CARTAS)\s*>/gi

export function escapeUntrustedText(value) {
  return String(value ?? "").replace(CONTROL_TAG, "[marcador removido]");
}

// 2) Deteção de crise (pt-BR). Lista conservadora de sinais de risco à vida ou
// de violência/abuso. O objetivo é ACOLHER e mostrar recursos — nunca diagnosticar.
// Falsos positivos são aceitáveis (mostrar ajuda não faz mal); falsos negativos
// são o que queremos minimizar dentro do razoável.
const CRISIS_PATTERNS = [
  /\bme\s+matar\b/, /\bvou\s+me\s+matar\b/, /\bquero\s+morrer\b/, /\bqueria\s+morrer\b/,
  /\bsuic[ií]d/, /\btirar\s+a\s+(minha\s+)?vida\b/, /\bp[ôo]r\s+fim\s+[àa]\s+vida\b/,
  /\bn[ãa]o\s+quero\s+(mais\s+)?viver\b/, /\bn[ãa]o\s+aguento\s+mais\s+viver\b/,
  /\bacabar\s+com\s+tudo\b/, /\bdesistir\s+da\s+vida\b/, /\bsumir\s+pra\s+sempre\b/,
  /\bme\s+cortar\b/, /\bme\s+machucar\b/, /\bme\s+ferir\b/, /\bautomutila/,
  /\bviol[êe]ncia\s+dom[ée]stica\b/, /\bmeu\s+marido\s+me\s+bate\b/, /\bapanho\s+em\s+casa\b/,
  /\babuso\s+sexual\b/, /\bfui\s+estuprad/, /\bestou\s+sendo\s+abusad/,
];

export function detectCrisis(value) {
  const t = String(value ?? "").toLowerCase();
  return CRISIS_PATTERNS.some((re) => re.test(t));
}

// 3) Recursos de acolhimento (Brasil — mercado do lançamento).
export const CRISIS_RESOURCES = {
  headline: "Você não está sozinho, e a sua vida importa.",
  body:
    "A Veleda é um espaço de reflexão simbólica e não substitui ajuda profissional. " +
    "Se há sofrimento intenso ou risco à sua vida ou à de alguém, procure apoio agora:",
  lines: [
    "CVV — Centro de Valorização da Vida: ligue 188 (24h, gratuito e sigiloso) ou acesse cvv.org.br",
    "Emergência: 192 (SAMU) · 190 (Polícia) · 193 (Bombeiros)",
    "Violência contra a mulher: 180 · Direitos Humanos: 100",
  ],
};
