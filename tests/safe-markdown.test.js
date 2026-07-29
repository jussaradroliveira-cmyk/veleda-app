import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { sanitizeMarkdown } from '../src/lib/safe-markdown.js'

const window = new JSDOM('').window
const purifier = createDOMPurify(window)
const clean = (value) => sanitizeMarkdown(value, purifier)

test('remove script', () => {
  assert.doesNotMatch(clean('Olá<script>alert(1)</script>'), /script|alert\(1\)/i)
})

test('remove img and onerror', () => {
  assert.doesNotMatch(clean('<img src=x onerror="alert(1)">'), /img|onerror|alert/i)
})

test('remove svg onload', () => {
  assert.doesNotMatch(clean('<svg onload="alert(1)"><circle /></svg>'), /svg|onload|circle|alert/i)
})

test('remove iframe', () => {
  assert.doesNotMatch(clean('<iframe src="https://evil.example"></iframe>'), /iframe|evil/i)
})

test('remove javascript links', () => {
  const output = clean('[clique](javascript:alert(1))')
  assert.doesNotMatch(output, /javascript:|href=/i)
  assert.match(output, /clique/)
})

test('remove event handler from allowed element', () => {
  const output = clean('<p onclick="alert(1)">texto</p>')
  assert.equal(output.trim(), '<p>texto</p>')
})

test('sanitize active HTML mixed with Markdown', () => {
  const output = clean('**seguro** <form><input autofocus onfocus=alert(1)></form>')
  assert.match(output, /<strong>seguro<\/strong>/)
  assert.doesNotMatch(output, /form|input|onfocus|autofocus/i)
})

test('preserve legitimate Markdown', () => {
  const output = clean('### Carta\n\n**Força** e *calma*.\n\n- um\n- dois')
  assert.match(output, /<h3>Carta<\/h3>/)
  assert.match(output, /<strong>Força<\/strong>/)
  assert.match(output, /<em>calma<\/em>/)
  assert.match(output, /<li>um<\/li>/)
})

test('sanitize malicious HTML from an old stored reading', () => {
  const oldReading = '<style>@import "https://evil.example/x.css";</style><object data="x"></object><math href="javascript:x"></math>Texto'
  const output = clean(oldReading)
  assert.match(output, /Texto/)
  assert.doesNotMatch(output, /style|object|math|javascript|evil\.example/i)
})
