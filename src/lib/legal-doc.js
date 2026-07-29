import createDOMPurify from 'dompurify'
import { Marked } from 'marked'

// Documentos legais confiáveis (do repositório). Renderizados a partir do texto
// verbatim em src/pages/legal/*.md — a fonte de verdade e a base do hash de
// consentimento. Não reescrever aqui: alterar o .md, não este renderer.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'strong', 'em', 'del',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a',
]
const SAFE_URL = /^(?:(?:https?|mailto):|[#/])/i
const parser = new Marked({ gfm: true, breaks: true })
parser.use({ renderer: { html() { return '' } } })

export function renderLegal(text, purifier) {
  const domPurify = purifier ?? createDOMPurify(globalThis.window)
  const md = String(text ?? '')
    // Escapa underscores para renderizarem literais: as linhas de preenchimento
    // do Anexo ("____/____/____") não devem virar negrito Markdown. Só afeta a
    // apresentação; o texto exibido é idêntico.
    .replace(/_/g, '\\_')
    // "# " no início da linha vira "### " — hierarquia sob o <h2> da página.
    // Só muda o nível do título; o TEXTO permanece palavra por palavra.
    .replace(/^# /gm, '### ')
  const rendered = parser.parse(md, { async: false })
  return domPurify.sanitize(rendered, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: SAFE_URL,
    RETURN_TRUSTED_TYPE: false,
  })
}
