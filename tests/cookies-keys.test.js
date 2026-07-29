import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// VLT2-016: a Política de Cookies tem de listar TODAS as chaves de
// armazenamento local usadas pelo app. Este teste falha se alguém introduzir
// uma chave veleda_* no código sem a documentar.

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('Cookies documenta todas as chaves veleda_* usadas no código', () => {
  const files = walk('src')
  const used = new Set()
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(/['"](veleda_[a-z_]+)['"]/g)) used.add(m[1])
  }
  const cookies = fs.readFileSync('src/pages/Cookies.jsx', 'utf8')
  const naoDocumentadas = [...used].filter((k) => !cookies.includes(k))
  assert.deepEqual(naoDocumentadas, [],
    `Chaves usadas mas ausentes de Cookies.jsx: ${naoDocumentadas.join(', ')}`)
  // sanidade: encontrámos de facto chaves
  assert.ok(used.size >= 4, `esperava >=4 chaves veleda_*, achei ${used.size}`)
})
