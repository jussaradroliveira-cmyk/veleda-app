// Repõe a quota semanal da conta de teste normal, apagando as leituras dela.
// Só para desenvolvimento: usa a service key local e afeta apenas normal@veleda-teste.com.
// Uso: node scripts/dev-reset-quota.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const CONTA = 'normal@veleda-teste.com'

const env = Object.fromEntries(
  readFileSync('/Users/jussaraoliveira/Desktop/veleda-secrets.env', 'utf8')
    .trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2))
)

// Guarda (VLT-016): este script APAGA leituras com a service role, no ÚNICO
// projeto Veleda (que é produção). Exige confirmação explícita e só toca na
// conta de teste abaixo. Sem a flag, recusa — para não correr por acidente.
if (process.env.VELEDA_CONFIRM_RESET !== '1') {
  console.error('Recusado: apagaria leituras no projeto real.')
  console.error(`  Alvo: ${env.VELEDA_SUPABASE_URL} · conta ${CONTA}`)
  console.error('  Para confirmar: VELEDA_CONFIRM_RESET=1 node scripts/dev-reset-quota.mjs')
  process.exit(1)
}

const sb = createClient(env.VELEDA_SUPABASE_URL, env.VELEDA_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY)

const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 })
const user = list.users.find((u) => u.email === CONTA)
if (!user) {
  console.error(`conta ${CONTA} não encontrada`)
  process.exit(1)
}

const { count } = await sb.from('readings').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
await sb.from('readings').delete().eq('user_id', user.id)
console.log(`✦ quota reposta: ${count ?? 0} leitura(s) de ${CONTA} apagadas (diário associado incluído, por cascade)`)
