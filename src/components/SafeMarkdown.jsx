import { useMemo } from 'react'
import { sanitizeMarkdown } from '../lib/safe-markdown'

export default function SafeMarkdown({ children, className = 'reading-text' }) {
  const html = useMemo(() => sanitizeMarkdown(children), [children])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

