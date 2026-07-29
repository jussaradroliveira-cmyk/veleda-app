import { renderLegal } from '../lib/legal-doc'

// Renderiza um documento legal verbatim (texto de src/pages/legal/*.md).
export default function LegalDoc({ text }) {
  return <div className="legal-content" dangerouslySetInnerHTML={{ __html: renderLegal(text) }} />
}
