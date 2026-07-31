// VLT2-015 / i18n: segurança da fronteira pergunta↔IA. Módulo único partilhado
// pelo edge (generate-reading) e pelo frontend (NewReading).

// 1) Escape do delimitador — a pergunta não pode fechar a "caixa" e virar instrução.
const CONTROL_TAG = /<\/?\s*(?:PERGUNTA_NAO_CONFIAVEL|CARTAS)\s*>/gi

export function escapeUntrustedText(value) {
  return String(value ?? "").replace(CONTROL_TAG, "[marcador removido]");
}

// 2) Deteção de crise — multilíngue (pt/en/fr). Lista conservadora de sinais de
// risco à vida ou de violência/abuso. Objetivo: ACOLHER e mostrar recursos, nunca
// diagnosticar. Todas as línguas correm juntas (cobertura maior).
const CRISIS_PATTERNS = [
  // português
  /\bme\s+matar\b/, /\bvou\s+me\s+matar\b/, /\bquero\s+morrer\b/, /\bqueria\s+morrer\b/,
  /\bsuic[ií]d/, /\btirar\s+a\s+(minha\s+)?vida\b/, /\bp[ôo]r\s+fim\s+[àa]\s+vida\b/,
  /\bn[ãa]o\s+quero\s+(mais\s+)?viver\b/, /\bn[ãa]o\s+aguento\s+mais\s+viver\b/,
  /\bacabar\s+com\s+tudo\b/, /\bme\s+cortar\b/, /\bme\s+machucar\b/, /\bautomutila/,
  /\bviol[êe]ncia\s+dom[ée]stica\b/, /\bmeu\s+marido\s+me\s+bate\b/, /\bapanho\s+em\s+casa\b/, /\bfui\s+estuprad/, /\bestou\s+sendo\s+abusad/,
  // english
  /\bkill\s+myself\b/, /\bwant\s+to\s+die\b/, /\bend\s+my\s+life\b/, /\bself[-\s]?harm\b/,
  /\bhurt\s+myself\b/, /\bcut\s+myself\b/, /\bdon'?t\s+want\s+to\s+live\b/,
  /\bdomestic\s+(violence|abuse)\b/, /\bbeing\s+abused\b/, /\braped\b/,
  // français
  /\bme\s+tuer\b/, /\bme\s+suicider\b/, /\benvie\s+de\s+mourir\b/, /\bje\s+veux\s+mourir\b/,
  /\bme\s+faire\s+du\s+mal\b/, /\bme\s+scarifier\b/, /\bplus\s+envie\s+de\s+vivre\b/,
  /\bviolences?\s+conjugales?\b/, /\bje\s+subis\s+des\s+violences\b/, /\bje\s+suis\s+(battue?|abus[ée]e?)\b/,
];

export function detectCrisis(value) {
  const t = String(value ?? "").toLowerCase();
  return CRISIS_PATTERNS.some((re) => re.test(t));
}

// 3) Recursos de acolhimento por idioma (país-alvo de cada língua).
export const CRISIS_RESOURCES = {
  pt: {
    headline: "Você não está sozinho, e a sua vida importa.",
    body:
      "A Veleda é um espaço de reflexão simbólica e não substitui ajuda profissional. " +
      "Se há sofrimento intenso ou risco à sua vida ou à de alguém, procure apoio agora:",
    lines: [
      "Brasil — CVV: 188 (24h, gratuito e sigiloso) · cvv.org.br",
      "Portugal — SOS Voz Amiga: 213 544 545 · Emergência: 112",
      "Emergência no Brasil: 192 (SAMU) · 190 (Polícia)",
    ],
  },
  en: {
    headline: "You are not alone, and your life matters.",
    body:
      "Veleda is a space for symbolic reflection and does not replace professional help. " +
      "If there is intense distress or a risk to your life or someone else's, seek support now:",
    lines: [
      "Emergency: 112 (EU) · 911 (US) · 999 (UK)",
      "Samaritans (UK & Ireland): 116 123 · jo@samaritans.org",
      "Find a helpline near you: findahelpline.com",
    ],
  },
  fr: {
    headline: "Vous n'êtes pas seul·e, et votre vie compte.",
    body:
      "Veleda est un espace de réflexion symbolique et ne remplace pas une aide professionnelle. " +
      "En cas de détresse intense ou de risque pour votre vie ou celle d'autrui, cherchez du soutien maintenant :",
    lines: [
      "France — 3114 : numéro national de prévention du suicide (24h/24, gratuit)",
      "Urgences : 112 (UE) · 15 (SAMU)",
      "Belgique : 1813 · Suisse : 143",
    ],
  },
};

export function getCrisisResources(locale) {
  return CRISIS_RESOURCES[locale] ?? CRISIS_RESOURCES.pt;
}

// Idioma-alvo da leitura, por locale (para instruir o modelo).
export const READING_LANGUAGE = {
  pt: "português do Brasil",
  en: "English",
  fr: "français",
};

export function normalizeLocale(locale) {
  return ["pt", "en", "fr"].includes(locale) ? locale : "pt";
}
