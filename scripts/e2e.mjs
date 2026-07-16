// Teste E2E da Veleda — corre com: node e2e_veleda.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('/Users/jussaraoliveira/Desktop/veleda-secrets.env', 'utf8')
    .trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2))
)
const URL = env.VELEDA_SUPABASE_URL
const ANON = env.VELEDA_SUPABASE_ANON_KEY

let pass = 0, fail = 0
function check(name, ok, extra = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (ok) pass++
  else fail++
}

const stamp = Math.floor(Date.now() / 1000)
const email = `teste.veleda.${stamp}@example.com`
const email2 = `teste.veleda.${stamp}b@example.com`
const password = 'veleda-teste-123'

const sb = createClient(URL, ANON)

// 1. signup
const { data: su, error: suErr } = await sb.auth.signUp({ email, password })
check('signup', !suErr && !!su.session, suErr?.message)
const token = su.session.access_token
const userId = su.user.id

// 2. perfil criado pelo trigger
const { data: prof } = await sb.from('profiles').select('*').eq('id', userId).single()
check('perfil auto-criado', !!prof && prof.is_premium === false)

// 3. cartas visíveis
const { data: cards } = await sb.from('cards').select('id, name, arcana').order('id')
check('78 cartas no baralho', cards?.length === 78, `encontradas: ${cards?.length}`)

// 4. leitura via edge function
const chosen = [cards[0], cards[30], cards[77]].map((c, i) => ({ card_id: c.id, reversed: i === 1 }))
async function callReading(tok, body) {
  const r = await fetch(`${URL}/functions/v1/generate-reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

const r1 = await callReading(token, { question: 'Que energia me acompanha neste novo projeto?', cards: chosen })
check('1.ª leitura gerada (200)', r1.status === 200 && r1.body.reading?.reading_text?.length > 300,
  `status ${r1.status}, ${r1.body.reading?.reading_text?.length ?? 0} chars`)
const readingId = r1.body.reading?.id

// 5. quota: 2.ª leitura → 402
const r2 = await callReading(token, { question: 'E o amor?', cards: chosen })
check('2.ª leitura bloqueada pela quota (402)', r2.status === 402 && r2.body.error === 'quota_exceeded',
  `status ${r2.status} ${JSON.stringify(r2.body)}`)

// 6. sem token → 401
const r3 = await callReading('', { question: 'x', cards: chosen })
check('sem sessão → 401', r3.status === 401, `status ${r3.status}`)

// 7. histórico via RLS
const { data: hist } = await sb.from('readings').select('id, question, cards').eq('user_id', userId)
check('leitura guardada no histórico', hist?.length === 1 && hist[0].id === readingId)
check('cartas guardadas com posições', hist?.[0]?.cards?.length === 3 && hist[0].cards[0].position === 'passado')

// 8. diário
const { error: jErr } = await sb.from('journal_entries')
  .insert({ user_id: userId, reading_id: readingId, content: 'Senti que fazia sentido.' })
check('entrada de diário criada', !jErr, jErr?.message)
const { data: jList } = await sb.from('journal_entries').select('content').eq('user_id', userId)
check('diário legível pelo dono', jList?.length === 1)

// 9. RLS: outro utilizador não vê nada
const sb2 = createClient(URL, ANON)
const { data: su2 } = await sb2.auth.signUp({ email: email2, password })
const { data: hist2 } = await sb2.from('readings').select('id')
const { data: j2 } = await sb2.from('journal_entries').select('id')
check('RLS: outro utilizador não vê leituras alheias', hist2?.length === 0)
check('RLS: outro utilizador não vê diário alheio', j2?.length === 0)

// 10. input inválido
const r4 = await callReading(token, { question: 'ok', cards: [chosen[0]] })
check('cartas inválidas → 400', r4.status === 400, `status ${r4.status}`)

// limpeza: apaga os utilizadores de teste (precisa da service role no secrets.env)
if (env.VELEDA_SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(URL, env.VELEDA_SUPABASE_SERVICE_ROLE_KEY)
  for (const uid of [userId, su2?.user?.id].filter(Boolean)) {
    await admin.auth.admin.deleteUser(uid)
  }
  console.log('(utilizadores de teste apagados)')
}

console.log(`\n${pass} passaram, ${fail} falharam`)
if (r1.body.reading) {
  console.log('\n--- excerto da leitura gerada ---')
  console.log(r1.body.reading.reading_text.slice(0, 400) + '…')
}
process.exit(fail ? 1 : 0)
