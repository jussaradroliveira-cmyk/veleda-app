import createDOMPurify from 'dompurify'
import { Marked } from 'marked'

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'strong', 'em', 'del',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a',
]

const FORBIDDEN_TAGS = [
  'script', 'iframe', 'object', 'embed', 'svg', 'math',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'style', 'link', 'meta', 'base', 'video', 'audio', 'source',
  'picture', 'img',
]

const SAFE_URL = /^(?:(?:https?|mailto):|[#/])/i
const markdownParser = new Marked({
  gfm: true,
  breaks: false,
})

// Respostas novas não precisam de HTML bruto. O renderer o descarta antes
// mesmo da sanitização; DOMPurify permanece como defesa em profundidade e
// protege também conteúdo legado misturado com Markdown.
markdownParser.use({
  renderer: {
    html() {
      return ''
    },
  },
})

export function sanitizeMarkdown(markdown, purifier) {
  const domPurify = purifier ?? createDOMPurify(globalThis.window)
  const markdownWithoutRawHtml = domPurify.sanitize(String(markdown ?? ''), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  })
  const rendered = markdownParser.parse(markdownWithoutRawHtml, { async: false })

  return domPurify.sanitize(rendered, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
    FORBID_TAGS: FORBIDDEN_TAGS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: SAFE_URL,
    RETURN_TRUSTED_TYPE: false,
  })
}
